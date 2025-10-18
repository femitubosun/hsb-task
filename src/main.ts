import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { setupApiDocumentation } from './documentation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Server');
  const configService = app.get(ConfigService);

  const appName = configService.env('APP_NAME');
  const port = configService.env('PORT');

  app.setGlobalPrefix('api/v1', {
    exclude: ['/api/docs/json', '/api/docs/ref'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  setupApiDocumentation({
    appName,
    app,
    version: '1.0',
  });

  logger.log(`Running on PORT ${port}`);

  await app.listen(port, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
