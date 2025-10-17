import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ClientModule } from './client/client.module';
import { BusinessModule } from './business/business.module';

@Module({
  imports: [CommonModule, ClientModule, BusinessModule]
})
export class BookingModule {}
