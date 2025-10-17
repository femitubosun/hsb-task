import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { CoreModule } from '@core/core.module';
import { InfraModule } from '@infra/infra.module';
import { LibModule } from '@/lib/lib.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { ProfileModule } from '@modules/profile/profile.module';

@Module({
  imports: [CoreModule, InfraModule, LibModule, IdentityModule, ProfileModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
