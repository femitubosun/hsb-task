import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { InfraModule } from '@/infra/infra.module';

@Module({
  imports: [InfraModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
