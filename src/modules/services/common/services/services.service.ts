import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateServiceRequestDto } from '../../business/dtos/request';
import { CreateServiceInput } from '../dtos/create-service';
import type { IServiceRepository } from '../interfaces/service-repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('IServicesRepository')
    private readonly servicesRepository: IServiceRepository,
  ) {}

  async create(input: CreateServiceInput) {
    return this.servicesRepository.create({
      ...input,
      businessId: new Types.ObjectId(input.businessId),
    });
  }

  async listByBusinessId(businessId: string) {
    return this.servicesRepository.findMany({
      businessId: new Types.ObjectId(businessId),
    });
  }

  async getBusinessServicebyId(businessId: string, serviceId: string) {
    const service = await this.servicesRepository.findOneById(serviceId);

    if (!service || service.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    return service;
  }

  async updateBusinessService(
    businessId: string,
    serviceId: string,
    updateDto: UpdateServiceRequestDto,
  ) {
    const found = await this.servicesRepository.findOneById(
      serviceId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    return await this.servicesRepository.update(serviceId, updateDto);
  }

  async deleteBusinessService(businessId: string, serviceId: string) {
    const found = await this.servicesRepository.findOneById(
      serviceId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    await this.servicesRepository.softDelete(found._id.toString());
  }
}
