import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IServiceRepository } from '../interfaces/service-repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('IServicesRepository')
    private readonly servicesRepository: IServiceRepository,
  ) {}

  async findOneById(serviceId: string) {
    const service = await this.servicesRepository.findOneById(serviceId);

    if (!service) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));
    }

    return service;
  }
}
