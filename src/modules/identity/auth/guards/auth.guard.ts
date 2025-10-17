import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '@/common/decorators';
import { AuthedRequest } from '@/common/types/authed-request.type';
import { JwtPayloadType } from '@/common/types/jwt-payload.type';
import { ConfigService } from '@/core/config/config.service';
import { SessionService } from '@/modules/identity/auth/services';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.#extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadType>(token, {
        secret: this.configService.env('JWT_SECRET_KEY'),
      });

      const session = await this.sessionService.get(payload.sub);

      if (!session) {
        throw new UnauthorizedException();
      }

      if (session.version !== payload.version) {
        throw new UnauthorizedException();
      }

      (request as AuthedRequest).user = session.user;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  #extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
