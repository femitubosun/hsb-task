import { ConfigService } from '@/core/config/config.service';
import { toKebabCase } from '@/core/utils/string.utils';
import { RedisService } from '@/infra/redis/redis.service';
import { RedisClientType } from '@nestjs-labs/nestjs-redis';
import { Injectable, Logger } from '@nestjs/common';
import type { FetchInput } from './dto';

@Injectable()
export class CacheService {
  #client: RedisClientType;
  #logger = new Logger(CacheService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.#client = this.redisService.instance;
  }

  /**
   * @description Fetches data from cache if available, otherwise resolves it and caches the result.
   * Implements cache-first retrieval.
   * @param input Input object containing the cache key, resolver, time to live, and optional tags.
   * @returns The resolved data.
   */
  async fetch<TResult>(input: FetchInput<TResult>) {
    const { key, resolver, tags, ttlSeconds } = input;
    const ck = this.#makeKey(key);

    const cVal = await this.#client.get(ck);
    if (cVal) {
      this.#logCache(ck, true);
      return JSON.parse(cVal) as TResult;
    }

    this.#logCache(ck);

    const result = await resolver();

    if (ttlSeconds) {
      await this.#client.setEx(ck, ttlSeconds, JSON.stringify(result));
    } else {
      await this.#client.set(ck, JSON.stringify(result));
    }

    if (tags?.length) {
      await this.#addCkToTags(ck, tags);
    }

    return result;
  }

  /**
   * @description
   * Invalidates one or more cache keys.
   * @param keys A single key or an array of keys to invalidate.
   */
  async invalidate(keys: string | string[]): Promise<void> {
    const keysToDelete = Array.isArray(keys)
      ? keys.map((ck) => this.#makeKey(ck))
      : [this.#makeKey(keys)];

    if (!keysToDelete.length) {
      return;
    }

    await this.#client.del(keysToDelete);
    this.#logger.log(`Invalidated key(s): ${keysToDelete.join(', ')}`);
  }

  /**
   * Invalidates all cache keys matching a given prefix.
   * WARNING: Uses SCAN, which can be slow on large Redis datasets.
   * @param prefix The prefix to match (e.g., "transactions:user:").
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    this.#logger.log(`Attempting to invalidate keys with prefix: ${prefix}`);
    const keysToDelete: string[] = [];

    const scanPattern = this.#makeKey(
      prefix.endsWith('*') ? prefix : `${prefix}*`,
    );

    let cursor = '0';
    do {
      const result = await this.#client.scan(cursor, {
        MATCH: scanPattern,
      });

      cursor = String(result.cursor);
      const keys = result.keys;
      for (const key of keys) {
        if (!key.startsWith(this.#tagSetPrefix)) {
          keysToDelete.push(key);
        }
      }
    } while (cursor !== '0');

    if (keysToDelete.length) {
      await this.#client.del(keysToDelete);
      this.#logger.log(
        `Invalidated ${keysToDelete.length} keys with prefix ${prefix}:`,
        keysToDelete,
      );
    } else {
      this.#logger.log(`No keys found with prefix: ${prefix}`);
    }
  }

  /**
   * @description
   * Invalidates all cache keys associated with given tag(s).
   * @param tags A single tag or array of tags to invalidate.
   */
  async invalidateByTag(tags: string | string[]): Promise<void> {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const allKeysToInvalidate = new Set<string>();
    const tagSetKeys: string[] = [];

    for (const tag of tagArray) {
      const tagSetKey = this.#makeTagsetKey(tag);
      tagSetKeys.push(tagSetKey);
      this.#logger.log(
        `Attempting to invalidate keys for tag: ${tag} (set key: ${tagSetKey})`,
      );

      const keysForTag = await this.#client.SMEMBERS(tagSetKey);
      keysForTag.forEach((key: string) => {
        allKeysToInvalidate.add(key);
      });

      if (keysForTag.length > 0) {
        this.#logger.log(
          `Found ${keysForTag.length} keys for tag ${tag}:`,
          keysForTag,
        );
      } else {
        this.#logger.log(`No keys found for tag: ${tag}`);
      }
    }
    if (allKeysToInvalidate.size) {
      const allKeysToDelete = [...allKeysToInvalidate, ...tagSetKeys];
      await this.#client.del(allKeysToDelete);

      this.#logger.log(
        `Invalidated ${allKeysToInvalidate.size} keys and removed ${tagSetKeys.length} tag sets.`,
      );
    } else {
      this.#logger.log(`No keys found for any of the provided tags.`);
    }
  }

  /**
   * @description
   * Sets a value in Redis.
   * @param key
   * @param value
   * @param ttlSeconds
   */
  async set(key: string, value: unknown, ttlSeconds?: number) {
    const ck = this.#makeKey(key);

    if (ttlSeconds) {
      return this.#client.setEx(ck, ttlSeconds, JSON.stringify(value));
    } else {
      return this.#client.set(ck, JSON.stringify(value));
    }
  }

  /**
   * @description
   * Retrieves a value from cache by key.
   * @param key The key to retrieve.
   * @returns The value if found, otherwise null.
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.#client.get(this.#makeKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  /**
   * @description
   * Deletes one or more keys from cache.
   * @param key
   */
  async delete(key: string | string[]) {
    const keysToDel = Array.isArray(key)
      ? key.map((k) => this.#makeKey(k))
      : [this.#makeKey(key)];

    return this.#client.del(keysToDel);
  }

  /**
   * @description
   * Normalizes cache keys
   * @param key Cache key to be normalized
   * @returns Normalized keys
   */
  #makeKey(key: string) {
    const appKey = toKebabCase(this.configService.env('APP_NAME'));
    return `${appKey}:${key.toLowerCase()}`;
  }

  /**
   * @description
   * Logging helper for cache.fetch operations
   * @param key Cache Key to fetch
   * @param hit Was the Cach hit or not?
   */
  #logCache(key: string, hit?: boolean) {
    this.#logger.log(`Cache ${hit ? 'HIT' : 'MISS'} for KEY: ${key}`);
  }

  /**
   * @description
   * Helper for making tag set key
   * @returns app tag set prefix
   */
  #makeTagsetKey(tag: string) {
    return `${this.#tagSetPrefix}:${tag}`;
  }

  get #tagSetPrefix() {
    return `${toKebabCase(this.configService.env('APP_NAME'))}:tagset`;
  }

  /**
   * @description
   * Helper for adding a cache key to tag sets
   * @param ck Cache Key
   * @param tags Cache Tags
   */
  async #addCkToTags(ck: string, tags: string[]) {
    for (const tag of tags) {
      await this.#client.SADD(this.#makeTagsetKey(tag), ck);
    }
  }
}
