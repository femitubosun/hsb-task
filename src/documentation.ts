import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApiDocumentation(input: {
  appName: string;
  version: string;
  app: INestApplication;
}) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle(input.appName)
    .setDescription(`${input.appName} API Description`)
    .setVersion(input.version)
    .build();

  const document = SwaggerModule.createDocument(input.app, swaggerConfig);

  SwaggerModule.setup('api/docs', input.app, document, {
    jsonDocumentUrl: 'api/docs/json',
  });
}
