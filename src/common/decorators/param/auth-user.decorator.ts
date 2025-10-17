// import { SessionUser } from '@core/types/auth-session.type';
// import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { AuthedRequest } from '@core/types/authed-request.type';

// export const AuthUser = createParamDecorator(
//   (_: unknown, ctx: ExecutionContext): SessionUser => {
//     const request: AuthedRequest = ctx.switchToHttp().getRequest();
//     return request.user;
//   },
// );
