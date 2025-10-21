import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { CommonModule } from './common/common.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [CommonModule, BusinessModule, AdminModule],
  exports: [],
})
export class ServicesModule {}
