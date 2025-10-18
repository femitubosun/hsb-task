import { CommonModule } from '@/modules/booking/common/common.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [CommonModule],
})
export class BusinessModule {}
