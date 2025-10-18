import { CacheModule } from '@/lib/cache/cache.module';
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { BookingController } from './controllers/booking.controller';

@Module({
  imports: [CommonModule, CacheModule],
  controllers: [BookingController],
})
export class ClientModule {}
