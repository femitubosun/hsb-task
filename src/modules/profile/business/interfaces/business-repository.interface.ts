import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { BusinessDocument } from '@/modules/profile/business/entities/business.entity';

export type IBusinessRepository = BaseRepositoryInterface<BusinessDocument>;
