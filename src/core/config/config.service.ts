import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { EnvSchema } from './env/env.schema';

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService<EnvSchema, true>) {}

  env<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
    return this.config.get(key, { infer: true });
  }
}
