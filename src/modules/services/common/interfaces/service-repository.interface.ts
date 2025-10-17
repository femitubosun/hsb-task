import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { ServiceDocument } from '../entities/service.entity';

export type IServiceRepository = BaseRepositoryInterface<ServiceDocument>;
