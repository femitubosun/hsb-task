import * as stringUtils from '@/common/utils/string.utils';
import { ConfigService } from '@/core/config/config.service';
import { RedisService } from '@/infra/redis/redis.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import type { FetchInput } from './dto';

jest.mock('@/common/utils/string.utils');

interface MockRedisClient {
  get: jest.MockedFunction<(key: string) => Promise<string | null>>;
  set: jest.MockedFunction<(key: string, value: string) => Promise<string>>;
  setEx: jest.MockedFunction<
    (key: string, seconds: number, value: string) => Promise<string>
  >;
  del: jest.MockedFunction<(keys: string[]) => Promise<number>>;
  scan: jest.MockedFunction<
    (
      cursor: string,
      options?: { MATCH?: string },
    ) => Promise<{ cursor: number; keys: string[] }>
  >;
  SMEMBERS: jest.MockedFunction<(key: string) => Promise<string[]>>;
  SADD: jest.MockedFunction<(key: string, member: string) => Promise<number>>;
}

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;
  let redisService: RedisService;
  let mockRedisClient: MockRedisClient;

  const mockStringUtils = stringUtils as jest.Mocked<typeof stringUtils>;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      SMEMBERS: jest.fn(),
      SADD: jest.fn(),
    } as MockRedisClient;

    const mockConfigService = {
      env: jest.fn(),
    };

    const mockRedisService = {
      instance: mockRedisClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
    mockStringUtils.toKebabCase.mockReturnValue('test-app');
    mockConfigService.env.mockReturnValue('test-app');

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(configService).toBeDefined();
    expect(redisService).toBeDefined();
  });

  describe('fetch', () => {
    const mockFetchInput: FetchInput<string> = {
      key: 'test-key',
      resolver: jest.fn().mockResolvedValue('resolved-value'),
      ttlSeconds: 300,
      tags: ['tag1', 'tag2'],
    };

    it('should return cached value when cache hit occurs', async () => {
      const cachedValue = 'cached-value';
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await service.fetch(mockFetchInput);

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-app:test-key');
      expect(mockFetchInput.resolver).not.toHaveBeenCalled();
      expect(result).toBe(cachedValue);
    });

    it('should resolve and cache value when cache miss occurs', async () => {
      const resolvedValue = 'resolved-value';
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.SADD.mockResolvedValue(1);

      const result = await service.fetch(mockFetchInput);

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-app:test-key');
      expect(mockFetchInput.resolver).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-app:test-key',
        300,
        JSON.stringify(resolvedValue),
      );
      expect(result).toBe(resolvedValue);
    });

    it('should cache without TTL when ttlSeconds is not provided', async () => {
      const inputWithoutTtl: FetchInput<string> = {
        key: 'test-key',
        resolver: jest.fn().mockResolvedValue('resolved-value'),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      await service.fetch(inputWithoutTtl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-app:test-key',
        JSON.stringify('resolved-value'),
      );
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should add cache key to tag sets when tags are provided', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.SADD.mockResolvedValue(1);

      await service.fetch(mockFetchInput);

      expect(mockRedisClient.SADD).toHaveBeenCalledWith(
        'test-app:tagset:tag1',
        'test-app:test-key',
      );
      expect(mockRedisClient.SADD).toHaveBeenCalledWith(
        'test-app:tagset:tag2',
        'test-app:test-key',
      );
    });

    it('should not add to tag sets when no tags provided', async () => {
      const inputWithoutTags: FetchInput<string> = {
        key: 'test-key',
        resolver: jest.fn().mockResolvedValue('resolved-value'),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      await service.fetch(inputWithoutTags);

      expect(mockRedisClient.SADD).not.toHaveBeenCalled();
    });

    it('should handle complex object caching', async () => {
      const complexObject = {
        id: 1,
        name: 'test',
        nested: { value: 'nested-value' },
        array: [1, 2, 3],
      };

      const inputWithObject: FetchInput<typeof complexObject> = {
        key: 'object-key',
        resolver: jest.fn().mockResolvedValue(complexObject),
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.fetch(inputWithObject);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-app:object-key',
        JSON.stringify(complexObject),
      );
      expect(result).toEqual(complexObject);
    });

    it('should handle resolver errors gracefully', async () => {
      const resolverError = new Error('Resolver failed');
      const inputWithFailingResolver: FetchInput<string> = {
        key: 'failing-key',
        resolver: jest.fn().mockRejectedValue(resolverError),
      };

      mockRedisClient.get.mockResolvedValue(null);

      await expect(service.fetch(inputWithFailingResolver)).rejects.toThrow(
        'Resolver failed',
      );

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-app:failing-key');
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should handle Redis get errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis get error'));

      await expect(service.fetch(mockFetchInput)).rejects.toThrow(
        'Redis get error',
      );

      expect(mockFetchInput.resolver).not.toHaveBeenCalled();
    });

    it('should handle Redis set errors', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis set error'));

      await expect(service.fetch(mockFetchInput)).rejects.toThrow(
        'Redis set error',
      );

      expect(mockFetchInput.resolver).toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should invalidate single cache key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.invalidate('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith(['test-app:test-key']);
    });

    it('should invalidate multiple cache keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);

      await service.invalidate(keys);

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:key1',
        'test-app:key2',
        'test-app:key3',
      ]);
    });

    it('should handle empty key array', async () => {
      await service.invalidate([]);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis del errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis del error'));

      await expect(service.invalidate('test-key')).rejects.toThrow(
        'Redis del error',
      );
    });
  });

  describe('invalidateByPrefix', () => {
    it('should invalidate keys matching prefix', async () => {
      const mockScanResults = [
        {
          cursor: 10,
          keys: ['test-app:prefix:key1', 'test-app:prefix:key2'],
        },
        {
          cursor: 0,
          keys: ['test-app:prefix:key3'],
        },
      ];

      mockRedisClient.scan
        .mockResolvedValueOnce(mockScanResults[0])
        .mockResolvedValueOnce(mockScanResults[1]);
      mockRedisClient.del.mockResolvedValue(3);

      await service.invalidateByPrefix('prefix:');

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test-app:prefix:*',
      });
      expect(mockRedisClient.scan).toHaveBeenCalledWith('10', {
        MATCH: 'test-app:prefix:*',
      });
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:prefix:key1',
        'test-app:prefix:key2',
        'test-app:prefix:key3',
      ]);
    });

    it('should handle prefix with existing asterisk', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: [],
      });

      await service.invalidateByPrefix('prefix:*');

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', {
        MATCH: 'test-app:prefix:*',
      });
    });

    it('should exclude tag set keys from deletion', async () => {
      const mockScanResult = {
        cursor: 0,
        keys: [
          'test-app:data:key1',
          'test-app:tagset:tag1',
          'test-app:data:key2',
        ],
      };

      mockRedisClient.scan.mockResolvedValue(mockScanResult);
      mockRedisClient.del.mockResolvedValue(2);

      await service.invalidateByPrefix('data:');

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:data:key1',
        'test-app:data:key2',
      ]);
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.scan.mockResolvedValue({
        cursor: 0,
        keys: [],
      });

      await service.invalidateByPrefix('nonexistent:');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis scan errors', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis scan error'));

      await expect(service.invalidateByPrefix('prefix:')).rejects.toThrow(
        'Redis scan error',
      );
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate keys for single tag', async () => {
      const tagKeys = ['test-app:key1', 'test-app:key2'];
      mockRedisClient.SMEMBERS.mockResolvedValue(tagKeys);
      mockRedisClient.del.mockResolvedValue(3);

      await service.invalidateByTag('tag1');

      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:tag1',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:key1',
        'test-app:key2',
        'test-app:tagset:tag1',
      ]);
    });

    it('should invalidate keys for multiple tags', async () => {
      const tag1Keys = ['test-app:key1', 'test-app:key2'];
      const tag2Keys = ['test-app:key2', 'test-app:key3'];

      mockRedisClient.SMEMBERS.mockResolvedValueOnce(
        tag1Keys,
      ).mockResolvedValueOnce(tag2Keys);
      mockRedisClient.del.mockResolvedValue(5);

      await service.invalidateByTag(['tag1', 'tag2']);

      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:tag1',
      );
      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:tag2',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:key1',
        'test-app:key2',
        'test-app:key3',
        'test-app:tagset:tag1',
        'test-app:tagset:tag2',
      ]);
    });

    it('should handle tags with no associated keys', async () => {
      mockRedisClient.SMEMBERS.mockResolvedValue([]);

      await service.invalidateByTag('empty-tag');

      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:empty-tag',
      );
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should deduplicate keys across multiple tags', async () => {
      const tag1Keys = ['test-app:key1', 'test-app:shared-key'];
      const tag2Keys = ['test-app:shared-key', 'test-app:key2'];

      mockRedisClient.SMEMBERS.mockResolvedValueOnce(
        tag1Keys,
      ).mockResolvedValueOnce(tag2Keys);
      mockRedisClient.del.mockResolvedValue(5);

      await service.invalidateByTag(['tag1', 'tag2']);

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:key1',
        'test-app:shared-key',
        'test-app:key2',
        'test-app:tagset:tag1',
        'test-app:tagset:tag2',
      ]);
    });

    it('should handle Redis SMEMBERS errors', async () => {
      mockRedisClient.SMEMBERS.mockRejectedValue(
        new Error('Redis SMEMBERS error'),
      );

      await expect(service.invalidateByTag('tag1')).rejects.toThrow(
        'Redis SMEMBERS error',
      );
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const value = { data: 'test' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await service.set('test-key', value, 300);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-app:test-key',
        300,
        JSON.stringify(value),
      );
    });

    it('should set value without TTL', async () => {
      const value = 'simple-value';
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('test-key', value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test-app:test-key',
        JSON.stringify(value),
      );
    });

    it('should handle complex objects', async () => {
      const complexValue = {
        id: 1,
        nested: { array: [1, 2, 3] },
        boolean: true,
        null_value: null,
      };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await service.set('complex-key', complexValue, 600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-app:complex-key',
        600,
        JSON.stringify(complexValue),
      );
    });

    it('should handle Redis setEx errors', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis setEx error'));

      await expect(service.set('test-key', 'value', 300)).rejects.toThrow(
        'Redis setEx error',
      );
    });

    it('should handle Redis set errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis set error'));

      await expect(service.set('test-key', 'value')).rejects.toThrow(
        'Redis set error',
      );
    });
  });

  describe('get', () => {
    it('should retrieve and parse cached value', async () => {
      const cachedValue = { data: 'test', number: 42 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await service.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-app:test-key');
      expect(result).toEqual(cachedValue);
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('nonexistent-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'test-app:nonexistent-key',
      );
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { input: 'string-value', expected: 'string-value' },
        { input: 42, expected: 42 },
        { input: true, expected: true },
        { input: { object: 'value' }, expected: { object: 'value' } },
        { input: [1, 2, 3], expected: [1, 2, 3] },
        { input: null, expected: null },
      ];

      for (const testCase of testCases) {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(testCase.input));

        const result = await service.get(`key-${typeof testCase.input}`);

        expect(result).toEqual(testCase.expected);
      }
    });

    it('should handle Redis get errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis get error'));

      await expect(service.get('test-key')).rejects.toThrow('Redis get error');
    });

    it('should handle JSON parse errors', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json{');

      await expect(service.get('test-key')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete single key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith(['test-app:test-key']);
      expect(result).toBe(1);
    });

    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);

      const result = await service.delete(keys);

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:key1',
        'test-app:key2',
        'test-app:key3',
      ]);
      expect(result).toBe(3);
    });

    it('should handle Redis del errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis del error'));

      await expect(service.delete('test-key')).rejects.toThrow(
        'Redis del error',
      );
    });
  });

  describe('Key generation', () => {
    it('should generate consistent cache keys', () => {
      const testKeys = ['user:123', 'product:456', 'session:abc'];

      testKeys.forEach((key) => {
        mockRedisClient.get.mockResolvedValue(null);
        service.get(key);
        expect(mockRedisClient.get).toHaveBeenCalledWith(
          `test-app:${key.toLowerCase()}`,
        );
      });
    });

    it('should handle different app names', async () => {
      mockStringUtils.toKebabCase.mockReturnValueOnce('my-awesome-app');
      (configService.env as jest.Mock).mockReturnValueOnce('MyAwesomeApp');

      const newModule = await Test.createTestingModule({
        providers: [
          CacheService,
          { provide: ConfigService, useValue: configService },
          { provide: RedisService, useValue: redisService },
        ],
      }).compile();

      const newService = newModule.get<CacheService>(CacheService);
      mockRedisClient.get.mockResolvedValue(null);

      await newService.get('test-key');

      expect(mockStringUtils.toKebabCase).toHaveBeenCalledWith('MyAwesomeApp');
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'my-awesome-app:test-key',
      );
    });

    it('should normalize keys to lowercase', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.get('UPPERCASE-KEY');

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'test-app:uppercase-key',
      );
    });
  });

  describe('Tag management', () => {
    it('should generate correct tag set keys', async () => {
      mockRedisClient.SMEMBERS.mockResolvedValue([]);

      await service.invalidateByTag('user-data');

      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:user-data',
      );
    });

    it('should handle multiple tag operations', async () => {
      const mockFetchInput: FetchInput<string> = {
        key: 'test-key',
        resolver: jest.fn().mockResolvedValue('value'),
        tags: ['tag1', 'tag2', 'tag3'],
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.SADD.mockResolvedValue(1);

      await service.fetch(mockFetchInput);

      expect(mockRedisClient.SADD).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.SADD).toHaveBeenCalledWith(
        'test-app:tagset:tag1',
        'test-app:test-key',
      );
      expect(mockRedisClient.SADD).toHaveBeenCalledWith(
        'test-app:tagset:tag2',
        'test-app:test-key',
      );
      expect(mockRedisClient.SADD).toHaveBeenCalledWith(
        'test-app:tagset:tag3',
        'test-app:test-key',
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete cache lifecycle', async () => {
      const key = 'lifecycle-key';
      const value = { data: 'test-value' };
      const resolver = jest.fn().mockResolvedValue(value);

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      const fetchInput: FetchInput<typeof value> = {
        key,
        resolver,
        ttlSeconds: 300,
      };

      const fetchedValue = await service.fetch(fetchInput);
      expect(fetchedValue).toEqual(value);

      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));
      const cachedValue = await service.get(key);
      expect(cachedValue).toEqual(value);

      await service.delete(key);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:lifecycle-key',
      ]);
    });

    it('should handle tag-based cache invalidation workflow', async () => {
      const resolver = jest.fn().mockResolvedValue('cached-data');
      const fetchInput: FetchInput<string> = {
        key: 'tagged-key',
        resolver,
        tags: ['user:123', 'product:456'],
        ttlSeconds: 600,
      };

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.SADD.mockResolvedValue(1);
      mockRedisClient.SMEMBERS.mockResolvedValue(['test-app:tagged-key']);
      mockRedisClient.del.mockResolvedValue(3);

      await service.fetch(fetchInput);

      await service.invalidateByTag('user:123');

      expect(mockRedisClient.SMEMBERS).toHaveBeenCalledWith(
        'test-app:tagset:user:123',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'test-app:tagged-key',
        'test-app:tagset:user:123',
      ]);
    });

    it('should maintain performance under concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        key: `concurrent-key-${i}`,
        value: `value-${i}`,
      }));

      const setPromises = operations.map((op) => {
        mockRedisClient.setEx.mockResolvedValue('OK');
        return service.set(op.key, op.value, 300);
      });

      const getPromises = operations.map((op) => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(op.value));
        return service.get(op.key);
      });

      await Promise.all([...setPromises, ...getPromises]);

      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(10);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(10);
    });
  });
});
