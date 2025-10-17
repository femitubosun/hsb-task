import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '@/common/types/auth-session.type';
import { AuthedRequest } from '@/common/types/authed-request.type';

export const AuthUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser => {
    const request: AuthedRequest = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
