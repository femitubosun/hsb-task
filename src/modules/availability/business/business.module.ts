import { CacheModule } from '@/lib/cache/cache.module';
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AvailabilityOverrideController } from './controllers/availability-override.controller';
import { AvailabilityScheduleController } from './controllers/availability-schedule.controller';
import { AvailabilityOverrideService } from './services/availability-override.service';
import { AvailabilityScheduleService } from './services/availability-schedule.service';

@Module({
  imports: [CommonModule, CacheModule],
  controllers: [AvailabilityOverrideController, AvailabilityScheduleController],
  providers: [AvailabilityOverrideService, AvailabilityScheduleService],
})
export class BusinessModule {}
