import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { AvailabilityOverrideDocument } from '../entities';

export type IAvailabilityOverrideRepository =
  BaseRepositoryInterface<AvailabilityOverrideDocument>;
