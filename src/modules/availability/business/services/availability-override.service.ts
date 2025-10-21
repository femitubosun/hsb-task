import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateAvailabilityOverrideInput } from '../../common/dtos/create-availability-override';
import type { IAvailabilityOverrideRepository } from '../../common/interfaces';
import { UpdateAvailabilityOverrideRequestDto } from '../dtos/request';

/**
 * Service for managing availability overrides.
 * Handles special cases like business closures or modified hours for specific dates.
 * Provides CRUD operations with caching and business ownership validation.
 */
@Injectable()
export class AvailabilityOverrideService {
  constructor(
    @Inject('IAvailabilityOverrideRepository')
    private readonly availabilityOverrideRepository: IAvailabilityOverrideRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Creates a new availability override for a business.
   * Use this to mark specific dates as closed or with modified hours.
   * Validates that no other override exists for the same date.
   * Invalidates the business owner cache tag after creation.
   *
   * @param input - Override data including businessId, date, type (closed/modified_hours), optional time ranges and price modifiers
   * @returns The newly created availability override document
   * @throws BadRequestException if an override already exists for this date
   */
  async create(input: CreateAvailabilityOverrideInput) {
    const ck = this.#getMethodCk('create');
    ck.owner(input.businessId);

    const { date, ...rest } = input;
    const overrideDate = new Date(date);

    await this.#validateNoExistingOverride(input.businessId, overrideDate);

    const [availabilityOverride] = await Promise.all([
      this.availabilityOverrideRepository.create({
        ...rest,
        date: overrideDate,
        businessId: new Types.ObjectId(input.businessId),
      }),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return availabilityOverride;
  }

  /**
   * Retrieves all availability overrides for a business.
   * Results are cached with business owner and module tags.
   *
   * @param businessId - The ID of the business
   * @returns Array of availability override documents belonging to the business
   */
  async list(businessId: string) {
    const ck = this.#getMethodCk('list');
    ck.owner(businessId);

    const resolver = async () =>
      this.availabilityOverrideRepository.findMany({
        businessId: new Types.ObjectId(businessId),
      });

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.ownerTag, ck.moduleTag],
    });
  }

  /**
   * Retrieves a specific availability override by ID.
   * Validates that the override belongs to the specified business.
   * Results are cached.
   *
   * @param businessId - The ID of the business
   * @param overrideId - The ID of the availability override to retrieve
   * @returns The availability override document
   * @throws NotFoundException if override not found or doesn't belong to the business
   */
  async getById(businessId: string, overrideId: string) {
    const ck = this.#getMethodCk('getById');
    ck.owner(businessId).single(overrideId);

    const resolver = async () => {
      const availabilityOverride =
        await this.availabilityOverrideRepository.findOneById(overrideId);

      if (
        !availabilityOverride ||
        availabilityOverride.businessId.toString() !== businessId
      )
        throw new NotFoundException(
          RESOURCE_NOT_FOUND('Availability Override'),
        );

      return availabilityOverride;
    };

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.moduleTag, ck.ownerTag],
    });
  }

  /**
   * Updates an existing availability override.
   * Validates business ownership before updating.
   * Validates that changing the date won't conflict with another override.
   * Transforms date string to Date object if provided.
   * Invalidates cache after successful update.
   *
   * @param businessId - The ID of the business
   * @param overrideId - The ID of the availability override to update
   * @param updateDto - Partial override data to update
   * @returns The updated availability override document
   * @throws NotFoundException if override not found or doesn't belong to the business
   * @throws BadRequestException if new date conflicts with existing override
   */
  async update(
    businessId: string,
    overrideId: string,
    updateDto: UpdateAvailabilityOverrideRequestDto,
  ) {
    const ck = this.#getMethodCk('update').owner(businessId).single(overrideId);

    const found =
      await this.availabilityOverrideRepository.findOneById(overrideId);

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Availability Override'));

    const { date, ...rest } = updateDto;

    if (date) {
      const newDate = new Date(date);
      await this.#validateNoExistingOverride(businessId, newDate, overrideId);
    }

    const updateData = {
      ...rest,
      ...(date && { date: new Date(date) }),
    };

    const [data] = await Promise.all([
      this.availabilityOverrideRepository.update(overrideId, updateData),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return data;
  }

  /**
   * Soft deletes an availability override.
   * Validates business ownership before deletion.
   * Invalidates cache after successful deletion.
   *
   * @param businessId - The ID of the business
   * @param overrideId - The ID of the availability override to delete
   * @throws NotFoundException if override not found or doesn't belong to the business
   */
  async delete(businessId: string, overrideId: string) {
    const ck = this.#getMethodCk('delete').owner(businessId).single(overrideId);

    const found =
      await this.availabilityOverrideRepository.findOneById(overrideId);

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Availability Override'));

    await Promise.all([
      this.availabilityOverrideRepository.softDelete(found._id.toString()),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);
  }

  #getMethodCk(method: string) {
    return ckMaker(
      AppModules.AVAILABILITY,
      `${AvailabilityOverrideService.name}:${method}`,
    );
  }

  async #validateNoExistingOverride(
    businessId: string,
    date: Date,
    excludeOverrideId?: string,
  ) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingOverrides =
      await this.availabilityOverrideRepository.findMany({
        businessId: new Types.ObjectId(businessId),
        ...(excludeOverrideId && {
          _id: { $ne: new Types.ObjectId(excludeOverrideId) },
        }),
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

    if (existingOverrides.count > 0) {
      const dateStr = DateBuilder.toISODateString(date);
      throw new ConflictException(`An override already exists for ${dateStr}`);
    }
  }
}
