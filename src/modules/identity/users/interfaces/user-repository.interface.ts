import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { User } from '../entities/user.entity';

export type IUserRepository = BaseRepositoryInterface<User>;
