import { BusinessModule as ProfileBusinessModule } from '@/modules/profile/business/business.module';
import { Module } from '@nestjs/common';
import { BusinessController } from './controllers/business.controller';

@Module({
  imports: [ProfileBusinessModule],
  controllers: [BusinessController],
})
export class ClientModule {}
