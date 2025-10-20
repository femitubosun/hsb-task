import { Global, Module } from '@nestjs/common';
import { BullMqModule } from './bullmq/bullmq.module';
import { CronModule } from './cron/cron.module';
import { DbModule } from './db/db.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerModule } from './throttler/throttler.module';

@Global()
@Module({
  imports: [DbModule, RedisModule, BullMqModule, CronModule, ThrottlerModule],
  exports: [RedisModule],
})
export class InfraModule {}
