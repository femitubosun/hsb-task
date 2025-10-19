import { CacheModule } from '@/lib/cache/cache.module';
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
    CacheModule,
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
