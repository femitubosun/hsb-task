import { Roles } from '@/common/types/roles.type';

export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  role: Roles;
};
