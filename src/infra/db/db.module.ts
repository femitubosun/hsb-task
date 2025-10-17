import { ConfigService } from '@/core/config/config.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory(configService: ConfigService) {
        return {
          uri: configService.env('DATABASE_URL'),
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DbModule {}
