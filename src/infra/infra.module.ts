import { Global, Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { CronModule } from './cron/cron.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [DbModule, RedisModule, QueueModule, CronModule],
  exports: [RedisModule],
})
export class InfraModule {}
