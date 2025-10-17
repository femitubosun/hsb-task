import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { InfraModule } from './infra/infra.module';
import { LibModule } from './lib/lib.module';

@Module({
  imports: [CoreModule, InfraModule, LibModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
