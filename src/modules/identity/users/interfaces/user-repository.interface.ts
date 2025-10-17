import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { UserDocument } from '../entities/user.entity';

export type IUserRepository = BaseRepositoryInterface<UserDocument>;
