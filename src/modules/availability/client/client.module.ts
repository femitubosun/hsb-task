import { CacheModule } from '@/lib/cache/cache.module';
import { CommonModule as BookingCommonModule } from '@/modules/booking/common/common.module';
import { CommonModule as ServicesCommonModule } from '@/modules/services/common/common.module';
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AvailabilityController } from './controllers/availability.controller';
import { AvailabilitySearchService } from './services/availability-search.service';

@Module({
  imports: [
    BookingCommonModule,
    CommonModule,
    ServicesCommonModule,
    CacheModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilitySearchService],
  exports: [AvailabilitySearchService],
})
export class ClientModule {}
