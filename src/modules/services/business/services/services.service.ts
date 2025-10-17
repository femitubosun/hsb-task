import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateServiceInput } from '../../common/dtos/create-service';
import type { IServiceRepository } from '../../common/interfaces/service-repository.interface';
import { UpdateServiceRequestDto } from '../dtos/request';

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

  async list(businessId: string) {
    return this.servicesRepository.findMany({
      businessId: new Types.ObjectId(businessId),
    });
  }

  async getServicebyId(businessId: string, serviceId: string) {
    const service = await this.servicesRepository.findOneById(serviceId);

    if (!service || service.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    return service;
  }

  async updateService(
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

  async deleteService(businessId: string, serviceId: string) {
    const found = await this.servicesRepository.findOneById(
      serviceId,
      'id businessId',
    );

    if (!found || found.businessId.toString() !== businessId)
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));

    await this.servicesRepository.softDelete(found._id.toString());
  }
}
