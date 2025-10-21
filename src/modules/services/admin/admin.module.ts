import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { AdminServiceController } from './controllers/admin-service.controller';

@Module({
  imports: [BusinessModule],
  controllers: [AdminServiceController],
})
export class AdminModule {}
