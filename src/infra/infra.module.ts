import { Global, Module } from '@nestjs/common';
import { BullMqModule } from './bullmq/bullmq.module';
import { CronModule } from './cron/cron.module';
import { DbModule } from './db/db.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [
    DbModule,
    RedisModule,
    BullMqModule,
    CronModule,
    RateLimitingModule,
  ],
  exports: [RedisModule],
})
export class InfraModule {}
