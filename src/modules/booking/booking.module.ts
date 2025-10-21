import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { ClientModule } from './client/client.module';
import { BusinessModule } from './business/business.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [CommonModule, ClientModule, BusinessModule, AdminModule],
})
export class BookingModule {}
