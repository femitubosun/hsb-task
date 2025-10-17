import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ServiceController } from './controllers/service.controller';
import { ServicesService } from './services/services.service';

@Module({
  imports: [CommonModule],
  controllers: [ServiceController],
  providers: [ServicesService],
})
export class BusinessModule {}
