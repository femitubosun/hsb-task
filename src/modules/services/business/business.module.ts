import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ServiceController } from './controllers/service.controller';

@Module({
  imports: [CommonModule],
  controllers: [ServiceController],
})
export class BusinessModule {}
