import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../entities/service.entity';
import { IServiceRepository } from '../interfaces/service-repository.interface';

@Injectable()
export class ServiceRepository
  extends BaseRepositoryAbstract<ServiceDocument>
  implements IServiceRepository
{
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
  ) {
    super(serviceModel);
  }
}
