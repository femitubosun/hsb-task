import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { NodeEnvironment } from './core/config/env/env.schema';
import { setupApiDocumentation } from './documentation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Server');
  const configService = app.get(ConfigService);

  const appName = configService.env('APP_NAME');
  const port = configService.env('PORT');
  const nodeEnv = configService.env('NODE_ENV');

  const isDevelopment = nodeEnv !== NodeEnvironment.Production;

  app.setGlobalPrefix('api/v1', {
    exclude: isDevelopment ? ['/api/docs', '/api/docs/json'] : [],
  });

  if (isDevelopment) {
    setupApiDocumentation({
      appName,
      app,
      version: '1.0',
    });
  }

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  logger.log(`Running on PORT ${port}`);

  await app.listen(port, '0.0.0.0');
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
