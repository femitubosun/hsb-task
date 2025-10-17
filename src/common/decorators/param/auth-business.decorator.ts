// import { SessionUser } from '@core/types/auth-session.type';
// import { AuthedRequest } from '@core/types/authed-request.type';
// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const AuthedBusiness = createParamDecorator(
//   (_: unknown, ctx: ExecutionContext): SessionUser['provider'] => {
//     const request: AuthedRequest = ctx.switchToHttp().getRequest();

//     return request.user.provider;
//   },
// );
