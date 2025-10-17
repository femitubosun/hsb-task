import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateServiceInput } from '../../common/dtos/create-service';
import { Service } from '../../common/entities/service.entity';
import type { IServiceRepository } from '../../common/interfaces/service-repository.interface';
import { UpdateServiceRequestDto } from '../dtos/request';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('IServicesRepository')
    private readonly servicesRepository: IServiceRepository,
    private readonly cacheService: CacheService,
  ) {}

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
    return ckMaker(AppModules.SERVICES, `${Service.name}:${method}`);
  }
}
