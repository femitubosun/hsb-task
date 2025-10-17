import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AvailabilityOverride,
  AvailabilityOverrideDocument,
} from '../entities';
import { IAvailabilityOverrideRepository } from '../interfaces/availability-override.interface';

@Injectable()
export class AvailabilityOverrideRepository
  extends BaseRepositoryAbstract<AvailabilityOverrideDocument>
  implements IAvailabilityOverrideRepository
{
  constructor(
    @InjectModel(AvailabilityOverride.name)
    private readonly overrideModel: Model<AvailabilityOverrideDocument>,
  ) {
    super(overrideModel);
  }
}
