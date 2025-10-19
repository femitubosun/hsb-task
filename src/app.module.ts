import { LibModule } from '@/lib/lib.module';
import { CoreModule } from '@core/core.module';
import { InfraModule } from '@infra/infra.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { ProfileModule } from '@modules/profile/profile.module';
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { ServicesModule } from './modules/services/services.module';
import { OutboxModule } from './modules/outbox/outbox.module';

@Module({
  imports: [
    AvailabilityModule,
    CoreModule,
    InfraModule,
    LibModule,
    IdentityModule,
    ProfileModule,
    ServicesModule,
    AvailabilityModule,
    BookingModule,
    OutboxModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
