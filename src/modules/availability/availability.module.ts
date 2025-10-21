import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { ClientModule } from './client/client.module';
import { CommonModule } from './common/common.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [BusinessModule, ClientModule, CommonModule, AdminModule],
})
export class AvailabilityModule {}
