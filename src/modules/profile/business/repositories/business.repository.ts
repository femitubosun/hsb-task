import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import {
  Business,
  BusinessDocument,
} from '@/modules/profile/business/entities/business.entity';
import { IBusinessRepository } from '@/modules/profile/business/interfaces/business-repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

@Injectable()
export class BusinessRepository
  extends BaseRepositoryAbstract<BusinessDocument>
  implements IBusinessRepository
{
  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {
    super(businessModel);
  }
}
