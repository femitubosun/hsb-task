import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import {
  AvailabilityOverrideController,
  AvailabilityScheduleController,
} from './controllers';

@Module({
  imports: [BusinessModule],
  controllers: [AvailabilityScheduleController, AvailabilityOverrideController],
})
export class AdminModule {}
