import {
  RedisService as NestRedisService,
  type RedisClientType,
} from '@nestjs-labs/nestjs-redis';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisService {
  #instance: RedisClientType | null;

  constructor(private readonly nestRedisService: NestRedisService) {
    this.#instance =
      this.nestRedisService.getClient() as unknown as RedisClientType;

    if (!this.#instance) {
      throw Error('Redis Instance undefined');
    }
  }

  get instance(): RedisClientType {
    return this.#instance as RedisClientType;
  }
}
