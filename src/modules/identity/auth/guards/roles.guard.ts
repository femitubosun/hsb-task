import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '@/common/types/roles.type';
import { ROLES_KEY } from '@/common/decorators';
import { AuthedRequest } from '@/common/types/authed-request.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request: AuthedRequest = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
