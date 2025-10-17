import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Request, Response } from 'express';

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

  input.app.use(
    '/api/docs/ref',
    apiReference({
      content: document,
    }),
  );

  input.app.use('/api/docs/json', (_: Request, res: Response) => {
    res.json(document);
  });

  // SwaggerModule.setup('api/docs', input.app, documentFactory, {
  //   jsonDocumentUrl: 'api/docs/json',
  // });
}
