import { CacheModule } from '@/lib/cache/cache.module';
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ServiceController } from './controllers/service.controller';
import { ServicesService } from './services/services.service';

@Module({
  imports: [CommonModule, CacheModule],
  controllers: [ServiceController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class BusinessModule {}
