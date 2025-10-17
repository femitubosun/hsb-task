import { ConfigService } from '@/core/config/config.service';
import { RedisModule as NestRedisModule } from '@nestjs-labs/nestjs-redis';
import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      useFactory(configService: ConfigService) {
        return {
          url: configService.env('REDIS_URL'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
