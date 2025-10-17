import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '@/common/types/auth-session.type';
import { AuthedRequest } from '@/common/types/authed-request.type';

export const AuthBusiness = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser['business'] => {
    const request: AuthedRequest = ctx.switchToHttp().getRequest();

    return request.user.business;
  },
);
