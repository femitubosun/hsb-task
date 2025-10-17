import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule, HealthModule],
  exports: [ConfigModule],
})
export class CoreModule {}
