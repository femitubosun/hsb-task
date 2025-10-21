import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateServiceInput } from '../../common/dtos/create-service';
import type { IServiceRepository } from '../../common/interfaces/service-repository.interface';
import { UpdateServiceRequestDto } from '../dtos/request';

/**
 * Service for managing business services (offerings).
 * Handles CRUD operations with caching and business ownership validation.
 */
@Injectable()
export class ServicesService {
  constructor(
    @Inject('IServicesRepository')
    private readonly servicesRepository: IServiceRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Creates a new service for a business.
   * Invalidates the business owner cache tag after creation.
   *
   * @param input - Service creation data including businessId, name, duration, buffers, and price
   * @returns The newly created service document
   */
  async create(input: CreateServiceInput) {
    const ck = this.#getMethodCk('create');
    ck.owner(input.businessId);

    const [service] = await Promise.all([
      this.servicesRepository.create({
        ...input,
        businessId: new Types.ObjectId(input.businessId),
      }),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return service;
  }

  /**
   * Retrieves all services for a business.
   * Results are cached with business owner and module tags.
   *
   * @param businessId - The ID of the business
   * @returns Array of service documents belonging to the business
   */
  async list(businessId: string) {
    const ck = this.#getMethodCk('list');
    ck.owner(businessId);

    const resolver = async () =>
      this.servicesRepository.findMany({
        businessId: new Types.ObjectId(businessId),
      });

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.ownerTag, ck.moduleTag],
    });
  }

  /**
   * Retrieves a specific service by ID.
   * Validates that the service belongs to the specified business.
   * Results are cached.
   *
   * @param businessId - The ID of the business
   * @param serviceId - The ID of the service to retrieve
   * @returns The service document
   * @throws NotFoundException if service not found or doesn't belong to the business
   */
  async getById(businessId: string, serviceId: string) {
    const ck = this.#getMethodCk('getById');
    ck.owner(businessId).single(serviceId);

    const resolver = async () => {
      const service = await this.servicesRepository.findOneById(serviceId);

      if (!service || service.businessId.toString() !== businessId)
        throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

      return service;
    };

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.moduleTag, ck.ownerTag],
    });
  }

  /**
   * Updates an existing service.
   * Validates business ownership before updating.
   * Invalidates cache after successful update.
   *
   * @param businessId - The ID of the business
   * @param serviceId - The ID of the service to update
   * @param updateDto - Partial service data to update
   * @returns The updated service document
   * @throws NotFoundException if service not found or doesn't belong to the business
   */
  async update(
    businessId: string,
    serviceId: string,
    updateDto: UpdateServiceRequestDto,
  ) {
    const ck = this.#getMethodCk('update').owner(businessId).single(serviceId);

    const found = await this.servicesRepository.findOneById(
      serviceId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    const [data] = await Promise.all([
      this.servicesRepository.update(serviceId, updateDto),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return data;
  }

  /**
   * Soft deletes a service.
   * Validates business ownership before deletion.
   * Invalidates cache after successful deletion.
   *
   * @param businessId - The ID of the business
   * @param serviceId - The ID of the service to delete
   * @throws NotFoundException if service not found or doesn't belong to the business
   */
  async delete(businessId: string, serviceId: string) {
    const ck = this.#getMethodCk('delete').owner(businessId).single(serviceId);

    const found = await this.servicesRepository.findOneById(
      serviceId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    await Promise.all([
      this.servicesRepository.softDelete(found._id.toString()),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);
  }

  #getMethodCk(method: string) {
    return ckMaker(AppModules.SERVICES, `${ServicesService.name}:${method}`);
  }
}
