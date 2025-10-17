import { LibModule } from '@/lib/lib.module';
import { CoreModule } from '@core/core.module';
import { InfraModule } from '@infra/infra.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [
    CoreModule,
    InfraModule,
    LibModule,
    IdentityModule,
    ProfileModule,
    ServicesModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
