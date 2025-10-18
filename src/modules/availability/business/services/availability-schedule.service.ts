import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateAvailabilityScheduleInput } from '../../common/dtos/create-availability-schedule';
import { AvailabilitySchedule } from '../../common/entities';
import type { IAvailabilityScheduleRepository } from '../../common/interfaces';
import { UpdateAvailabilityScheduleRequestDto } from '../dtos/request';

/**
 * Service for managing recurring availability schedules.
 * Handles regular business hours across specific days of the week.
 * Provides CRUD operations with caching and business ownership validation.
 */
@Injectable()
export class AvailabilityScheduleService {
  constructor(
    @Inject('IAvailabilityScheduleRepository')
    private readonly availabilityScheduleRepository: IAvailabilityScheduleRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Creates a new availability schedule for a business.
   * Use this to define regular operating hours for specific days of the week.
   * Invalidates the business owner cache tag after creation.
   *
   * @param input - Schedule data including businessId, daysOfWeek, time ranges, and effective dates
   * @returns The newly created availability schedule document
   */
  async create(input: CreateAvailabilityScheduleInput) {
    const ck = this.#getMethodCk('create');
    ck.owner(input.businessId);

    const { effectiveFrom, effectiveUntil, ...rest } = input;

    const [availabilitySchedule] = await Promise.all([
      this.availabilityScheduleRepository.create({
        ...rest,
        effectiveFrom: new Date(effectiveFrom),
        ...(effectiveUntil && { effectiveUntil: new Date(effectiveUntil) }),
        businessId: new Types.ObjectId(input.businessId),
      }),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return availabilitySchedule;
  }

  /**
   * Retrieves all availability schedules for a business.
   * Results are cached with business owner and module tags.
   *
   * @param businessId - The ID of the business
   * @returns Array of availability schedule documents belonging to the business
   */
  async list(businessId: string) {
    const ck = this.#getMethodCk('list');
    ck.owner(businessId);

    const resolver = async () =>
      this.availabilityScheduleRepository.findMany({
        businessId: new Types.ObjectId(businessId),
      });

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.ownerTag, ck.moduleTag],
    });
  }

  /**
   * Retrieves a specific availability schedule by ID.
   * Validates that the schedule belongs to the specified business.
   * Results are cached.
   *
   * @param businessId - The ID of the business
   * @param scheduleId - The ID of the availability schedule to retrieve
   * @returns The availability schedule document
   * @throws NotFoundException if schedule not found or doesn't belong to the business
   */
  async getById(businessId: string, scheduleId: string) {
    const ck = this.#getMethodCk('getById');
    ck.owner(businessId).single(scheduleId);

    const resolver = async () => {
      const availabilitySchedule =
        await this.availabilityScheduleRepository.findOneById(scheduleId);

      if (
        !availabilitySchedule ||
        availabilitySchedule.businessId.toString() !== businessId
      )
        throw new NotFoundException(
          RESOURCE_NOT_FOUND('Availability Schedule'),
        );

      return availabilitySchedule;
    };

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.moduleTag, ck.ownerTag],
    });
  }

  /**
   * Updates an existing availability schedule.
   * Validates business ownership before updating.
   * Transforms effectiveFrom and effectiveUntil date strings to Date objects if provided.
   * Invalidates cache after successful update.
   *
   * @param businessId - The ID of the business
   * @param scheduleId - The ID of the availability schedule to update
   * @param updateDto - Partial schedule data to update
   * @returns The updated availability schedule document
   * @throws NotFoundException if schedule not found or doesn't belong to the business
   */
  async update(
    businessId: string,
    scheduleId: string,
    updateDto: UpdateAvailabilityScheduleRequestDto,
  ) {
    const ck = this.#getMethodCk('update').owner(businessId).single(scheduleId);

    const found = await this.availabilityScheduleRepository.findOneById(
      scheduleId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Availability Schedule'));

    const { effectiveFrom, effectiveUntil, ...rest } = updateDto;

    const updateData = {
      ...rest,
      ...(effectiveFrom && {
        effectiveFrom: new Date(effectiveFrom),
      }),
      ...(effectiveUntil && {
        effectiveUntil: new Date(effectiveUntil),
      }),
    };

    const [data] = await Promise.all([
      this.availabilityScheduleRepository.update(scheduleId, updateData),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return data;
  }

  /**
   * Soft deletes an availability schedule.
   * Validates business ownership before deletion.
   * Invalidates cache after successful deletion.
   *
   * @param businessId - The ID of the business
   * @param scheduleId - The ID of the availability schedule to delete
   * @throws NotFoundException if schedule not found or doesn't belong to the business
   */
  async delete(businessId: string, scheduleId: string) {
    const ck = this.#getMethodCk('delete').owner(businessId).single(scheduleId);

    const found = await this.availabilityScheduleRepository.findOneById(
      scheduleId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Availability Schedule'));

    await Promise.all([
      this.availabilityScheduleRepository.softDelete(found._id.toString()),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);
  }

  #getMethodCk(method: string) {
    return ckMaker(
      AppModules.AVAILABILITY,
      `${AvailabilitySchedule.name}:${method}`,
    );
  }
}
