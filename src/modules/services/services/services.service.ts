import { Inject, Injectable } from '@nestjs/common';
import type { IServiceRepository } from '../interfaces/service-repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    @Inject('IServicesRepository')
    private readonly servicesRepository: IServiceRepository,
  ) {}
}
