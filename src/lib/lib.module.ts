import { Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { HttpModule } from './http/http.module';

@Module({
  imports: [CacheModule, QueueModule, HttpModule],
})
export class LibModule {}
