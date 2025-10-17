import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { AvailabilityScheduleDocument } from '../entities';

export type IAvailabilityScheduleRepository =
  BaseRepositoryInterface<AvailabilityScheduleDocument>;
