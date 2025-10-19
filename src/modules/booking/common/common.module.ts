import { CacheModule } from '@/lib/cache/cache.module';
import { QueueModule } from '@/lib/queue/queue.module';
import { CommonModule as AvailabilityCommonModule } from '@/modules/availability/common/common.module';
import { CommonModule as OutboxCommonModule } from '@/modules/outbox/common/common.module';
import { CommonModule as ServicesCommonModule } from '@/modules/services/common/common.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './entities/booking.entity';
import { BookingRepository } from './repositories/booking.repository';
import { BookingLockService } from './services/booking-lock.service';
import { BookingService } from './services/booking.service';

const ENTITIES = [
  {
    name: Booking.name,
    schema: BookingSchema,
  },
];

@Module({
  imports: [
    MongooseModule.forFeature(ENTITIES),
    ServicesCommonModule,
    AvailabilityCommonModule,
    OutboxCommonModule,
    CacheModule,
    QueueModule,
  ],
  providers: [
    BookingService,
    BookingLockService,
    {
      provide: 'IBookingRepository',
      useClass: BookingRepository,
    },
  ],
  exports: [BookingService, 'IBookingRepository', BookingLockService],
})
export class CommonModule {}
