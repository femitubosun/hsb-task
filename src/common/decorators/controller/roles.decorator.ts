import { SetMetadata } from '@nestjs/common';
import { Roles as TRoles } from '@/common/types/roles.type';

export const ROLES_KEY = 'roles';
export const AllowedRoles = (roles: TRoles[]) => SetMetadata(ROLES_KEY, roles);
