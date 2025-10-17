import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Server');
  const configService = app.get(ConfigService);

  const appName = configService.env('APP_NAME');
  const port = configService.env('PORT');

  app.setGlobalPrefix('api/v1', {
    exclude: ['/api/docs', '/api/docs/json'],
  });
  app.useGlobalPipes(new ValidationPipe());
  setupSwagger({
    appName,
    app,
    version: '1.0',
  });

  logger.log(`Running on PORT ${port}`);

  await app.listen(port, '0.0.0.0');
}
bootstrap();
