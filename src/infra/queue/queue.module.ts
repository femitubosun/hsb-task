import { ConfigService } from '@/core/config/config.service';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory(configService: ConfigService) {
        return {
          connection: { url: configService.env('BULL_MQ_REDIS_URL') },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class QueueModule {}
