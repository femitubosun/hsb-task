import { CacheModule } from '@/lib/cache/cache.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from '@/modules/identity/auth/auth.controller';
import { AuthService, SessionService } from '@/modules/identity/auth/services';
import { UsersModule } from '@/modules/identity/users/users.module';
import { BusinessModule } from '@/modules/profile/business/business.module';
import { RolesGuard, AuthGuard } from '@/modules/identity/auth/guards';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    CacheModule,
    UsersModule,
    BusinessModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtService,
    SessionService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
