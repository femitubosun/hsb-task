import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AdminBookingController } from './controllers/booking.controller';

@Module({
  imports: [CommonModule],
  controllers: [AdminBookingController],
})
export class AdminModule {}
