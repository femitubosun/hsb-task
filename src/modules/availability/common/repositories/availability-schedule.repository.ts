import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AvailabilitySchedule,
  AvailabilityScheduleDocument,
} from '../entities';
import { IAvailabilityScheduleRepository } from '../interfaces/availability-schedule.interface';

@Injectable()
export class AvailabilityScheduleRepository
  extends BaseRepositoryAbstract<AvailabilityScheduleDocument>
  implements IAvailabilityScheduleRepository
{
  constructor(
    @InjectModel(AvailabilitySchedule.name)
    private readonly scheduleModel: Model<AvailabilityScheduleDocument>,
  ) {
    super(scheduleModel);
  }
}
