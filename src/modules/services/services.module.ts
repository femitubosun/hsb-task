import { Module } from '@nestjs/common';
import { BusinessModule } from './business/business.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [CommonModule, BusinessModule],
  exports: [],
})
export class ServicesModule {}
