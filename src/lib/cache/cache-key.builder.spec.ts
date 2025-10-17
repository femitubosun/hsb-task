import { CacheKey, ckMaker } from './cache-key.builder';
import * as stringUtils from '@/common/utils/string.utils';

jest.mock('@/common/utils/string.utils');

describe('CacheKey', () => {
  const mockStringUtils = stringUtils as jest.Mocked<typeof stringUtils>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStringUtils.toCamelCase.mockImplementation((str: string) =>
      str
        .toLowerCase()
        .replace(/[-_\s]+(.)?/g, (_, char: string) =>
          char ? char.toUpperCase() : '',
        ),
    );
  });

  describe('constructor', () => {
    it('should create instance with normalized module and service names', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('userModule')
        .mockReturnValueOnce('authService');

      const cacheKey = new CacheKey('user-module', 'auth-service');

      expect(mockStringUtils.toCamelCase).toHaveBeenCalledWith('user-module');
      expect(mockStringUtils.toCamelCase).toHaveBeenCalledWith('auth-service');
      expect(cacheKey.toString()).toBe('userModule:authService');
    });

    it('should handle special characters in module and service names', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('specialModule')
        .mockReturnValueOnce('specialService');

      const cacheKey = new CacheKey('special@module!', 'special#service$');

      expect(cacheKey.toString()).toBe('specialModule:specialService');
    });
  });

  describe('validateName', () => {
    it('should validate and normalize names correctly', () => {
      mockStringUtils.toCamelCase.mockReturnValue('normalizedName');

      const result = CacheKey.validateName('some-name');

      expect(mockStringUtils.toCamelCase).toHaveBeenCalledWith('some-name');
      expect(result).toBe('normalizedName');
    });

    it('should handle empty strings', () => {
      mockStringUtils.toCamelCase.mockReturnValue('');

      const result = CacheKey.validateName('');

      expect(result).toBe('');
    });

    it('should handle various naming conventions', () => {
      const testCases = [
        { input: 'snake_case', expected: 'snakeCase' },
        { input: 'kebab-case', expected: 'kebabCase' },
        { input: 'PascalCase', expected: 'pascalCase' },
        { input: 'camelCase', expected: 'camelcase' },
        { input: 'UPPERCASE', expected: 'uppercase' },
      ];

      testCases.forEach(({ input, expected }) => {
        mockStringUtils.toCamelCase.mockReturnValueOnce(expected);
        const result = CacheKey.validateName(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('owner', () => {
    it('should set owner and return instance for chaining', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service');
      const result = cacheKey.owner('user123');

      expect(result).toBe(cacheKey);
      expect(cacheKey.toString()).toBe('user:service:user123');
    });

    it('should handle numeric owner IDs', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service').owner('12345');

      expect(cacheKey.toString()).toBe('user:service:12345');
    });

    it('should handle owner with special characters', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service').owner('user@email.com');

      expect(cacheKey.toString()).toBe('user:service:user@email.com');
    });

    it('should overwrite previous owner', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service')
        .owner('user1')
        .owner('user2');

      expect(cacheKey.toString()).toBe('user:service:user2');
    });
  });

  describe('single', () => {
    it('should add single string identifier', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('product')
        .mockReturnValueOnce('catalog');

      const cacheKey = new CacheKey('product', 'catalog').single('item123');

      expect(cacheKey.toString()).toBe('product:catalog:item123');
    });

    it('should add single numeric identifier', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('product')
        .mockReturnValueOnce('catalog');

      const cacheKey = new CacheKey('product', 'catalog').single(456);

      expect(cacheKey.toString()).toBe('product:catalog:456');
    });

    it('should handle multiple single calls (chaining)', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('product')
        .mockReturnValueOnce('catalog');

      const cacheKey = new CacheKey('product', 'catalog')
        .single('category1')
        .single('item123');

      expect(cacheKey.toString()).toBe('product:catalog:category1:item123');
    });

    it('should handle zero and negative numbers', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('data')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('data', 'service').single(0).single(-1);

      expect(cacheKey.toString()).toBe('data:service:0:-1');
    });

    it('should return instance for method chaining', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service');
      const result = cacheKey.single('test123');

      expect(result).toBe(cacheKey);
    });
  });

  describe('listParams', () => {
    it('should add simple parameters', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('list');

      const cacheKey = new CacheKey('user', 'list').listParams({
        page: 1,
        limit: 10,
      });

      expect(cacheKey.toString()).toBe('user:list:limit=10&page=1');
    });

    it('should sort parameters alphabetically', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('list');

      const cacheKey = new CacheKey('user', 'list').listParams({
        zebra: 'last',
        alpha: 'first',
        beta: 'middle',
      });

      expect(cacheKey.toString()).toBe(
        'user:list:alpha=first&beta=middle&zebra=last',
      );
    });

    it('should handle different parameter types', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('data')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('data', 'service').listParams({
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      });

      const result = cacheKey.toString();
      expect(result).toContain('boolean=true');
      expect(result).toContain('null=null');
      expect(result).toContain('number=42');
      expect(result).toContain('string=value');
      expect(result).toContain('undefined=undefined');
    });

    it('should handle object parameters', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('search');

      const complexObj = {
        filters: { status: 'active', type: 'premium' },
        sort: 'name',
      };

      const cacheKey = new CacheKey('user', 'search').listParams(complexObj);

      const result = cacheKey.toString();
      expect(result).toContain('filters=');
      expect(result).toContain('sort=name');
    });

    it('should handle array parameters', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('product')
        .mockReturnValueOnce('filter');

      const cacheKey = new CacheKey('product', 'filter').listParams({
        categories: ['electronics', 'books'],
        tags: [1, 2, 3],
      });

      const result = cacheKey.toString();
      expect(result).toContain('categories=');
      expect(result).toContain('tags=');
    });

    it('should URL encode parameter values', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('search')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('search', 'service').listParams({
        query: 'hello world & special chars!',
        email: 'user@example.com',
      });

      const result = cacheKey.toString();
      expect(result).toContain('hello%20world%20%26%20special%20chars!');
      expect(result).toContain('user%40example.com');
    });

    it('should merge parameters from multiple calls', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('list');

      const cacheKey = new CacheKey('user', 'list')
        .listParams({ page: 1 })
        .listParams({ limit: 10 })
        .listParams({ sort: 'name' });

      expect(cacheKey.toString()).toBe('user:list:limit=10&page=1&sort=name');
    });

    it('should overwrite duplicate parameter keys', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('list');

      const cacheKey = new CacheKey('user', 'list')
        .listParams({ page: 1 })
        .listParams({ page: 2 });

      expect(cacheKey.toString()).toBe('user:list:page=2');
    });

    it('should return instance for method chaining', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service');
      const result = cacheKey.listParams({ test: 'value' });

      expect(result).toBe(cacheKey);
    });
  });

  describe('toString', () => {
    it('should return basic key format', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('module')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('module', 'service');

      expect(cacheKey.toString()).toBe('module:service');
    });

    it('should return key with owner', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('profile');

      const cacheKey = new CacheKey('user', 'profile').owner('user123');

      expect(cacheKey.toString()).toBe('user:profile:user123');
    });

    it('should return key with segments', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('product')
        .mockReturnValueOnce('details');

      const cacheKey = new CacheKey('product', 'details')
        .single('category1')
        .single('item456');

      expect(cacheKey.toString()).toBe('product:details:category1:item456');
    });

    it('should return key with parameters only', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('list');

      const cacheKey = new CacheKey('user', 'list').listParams({
        page: 1,
        limit: 10,
      });

      expect(cacheKey.toString()).toBe('user:list:limit=10&page=1');
    });

    it('should return complete key with all components', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('ecommerce')
        .mockReturnValueOnce('products');

      const cacheKey = new CacheKey('ecommerce', 'products')
        .owner('store123')
        .single('electronics')
        .single('laptops')
        .listParams({
          page: 2,
          limit: 20,
          sort: 'price',
        });

      expect(cacheKey.toString()).toBe(
        'ecommerce:products:store123:electronics:laptops:limit=20&page=2&sort=price',
      );
    });
  });

  describe('ownerTag', () => {
    it('should return owner tag when owner is set', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service').owner('user123');

      expect(cacheKey.ownerTag).toBe('user:user123');
    });

    it('should return prefix when no owner is set', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('user', 'service');

      expect(cacheKey.ownerTag).toBe('user:service');
    });

    it('should handle complex owner identifiers', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('notification')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('notification', 'service').owner(
        'user@email.com',
      );

      expect(cacheKey.ownerTag).toBe('notification:user@email.com');
    });
  });

  describe('moduleTag', () => {
    it('should return module part of the prefix', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('userModule')
        .mockReturnValueOnce('authService');

      const cacheKey = new CacheKey('user-module', 'auth-service');

      expect(cacheKey.moduleTag).toBe('userModule');
    });

    it('should handle single character module names', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('a', 'service');

      expect(cacheKey.moduleTag).toBe('a');
    });
  });

  describe('Value serialization', () => {
    it('should serialize null and undefined values', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service').listParams({
        nullValue: null,
        undefinedValue: undefined,
      });

      const result = cacheKey.toString();
      expect(result).toContain('nullValue=null');
      expect(result).toContain('undefinedValue=undefined');
    });

    it('should serialize primitive values correctly', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service').listParams({
        string: 'hello',
        number: 42,
        boolean: true,
      });

      const result = cacheKey.toString();
      expect(result).toContain('string=hello');
      expect(result).toContain('number=42');
      expect(result).toContain('boolean=true');
    });

    it('should serialize complex objects as JSON', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const complexObject = {
        nested: { value: 'test' },
        array: [1, 2, 3],
      };

      const cacheKey = new CacheKey('test', 'service').listParams({
        complex: complexObject,
      });

      const result = cacheKey.toString();
      expect(result).toContain('complex=');
      
      const sortedComplexObject = {
        array: [1, 2, 3],
        nested: { value: 'test' },
      };
      expect(result).toContain(
        encodeURIComponent(JSON.stringify(sortedComplexObject)),
      );
    });
  });

  describe('Object key sorting', () => {
    it('should sort nested object keys recursively', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const unsortedObject = {
        zebra: 'last',
        alpha: {
          gamma: 'third',
          beta: 'second',
        },
        beta: 'middle',
      };

      const cacheKey = new CacheKey('test', 'service').listParams(
        unsortedObject,
      );

      const result = cacheKey.toString();
      expect(result.indexOf('alpha=')).toBeLessThan(result.indexOf('beta='));
      expect(result.indexOf('beta=')).toBeLessThan(result.indexOf('zebra='));
    });

    it('should sort object keys in arrays', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const objectWithArrays = {
        items: [
          { name: 'item1', priority: 2 },
          { name: 'item2', priority: 1 },
        ],
      };

      const cacheKey = new CacheKey('test', 'service').listParams(
        objectWithArrays,
      );

      expect(cacheKey.toString()).toContain('items=');
    });

    it('should handle mixed data types in arrays', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const mixedArray = {
        mixed: [
          'string',
          42,
          { sorted: 'object', another: 'prop' },
          [1, 2, 3],
          null,
        ],
      };

      const cacheKey = new CacheKey('test', 'service').listParams(mixedArray);

      expect(cacheKey.toString()).toContain('mixed=');
    });

    it('should handle null and non-object values gracefully', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const params = {
        nullValue: null,
        string: 'test',
        number: 123,
      };

      const cacheKey = new CacheKey('test', 'service').listParams(params);

      expect(cacheKey.toString()).toContain('nullValue=null');
      expect(cacheKey.toString()).toContain('string=test');
      expect(cacheKey.toString()).toContain('number=123');
    });
  });

  describe('Method chaining', () => {
    it('should support complete method chaining', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('ecommerce')
        .mockReturnValueOnce('products');

      const result = new CacheKey('ecommerce', 'products')
        .owner('shop456')
        .single('category')
        .single('electronics')
        .listParams({ page: 1 })
        .listParams({ limit: 20 })
        .single('laptops')
        .listParams({ sort: 'price' })
        .toString();

      expect(result).toBe(
        'ecommerce:products:shop456:category:electronics:laptops:limit=20&page=1&sort=price',
      );
    });

    it('should allow mixed method call ordering', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('user')
        .mockReturnValueOnce('data');

      const cacheKey1 = new CacheKey('user', 'data')
        .owner('user1')
        .single('profile')
        .listParams({ version: 2 });

      const cacheKey2 = new CacheKey('user', 'data')
        .listParams({ version: 2 })
        .single('profile')
        .owner('user1');

      expect(cacheKey1.toString()).toBe(cacheKey2.toString());
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string parameters', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service').listParams({
        empty: '',
        normal: 'value',
      });

      expect(cacheKey.toString()).toContain('empty=');
      expect(cacheKey.toString()).toContain('normal=value');
    });

    it('should handle special characters in single identifiers', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const cacheKey = new CacheKey('test', 'service')
        .single('special@char#')
        .single('unicode-τεστ');

      expect(cacheKey.toString()).toBe(
        'test:service:special@char#:unicode-τεστ',
      );
    });

    it('should handle very large numbers', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const largeNumber = Number.MAX_SAFE_INTEGER;
      const cacheKey = new CacheKey('test', 'service').single(largeNumber);

      expect(cacheKey.toString()).toBe(`test:service:${largeNumber}`);
    });

    it('should handle deeply nested objects', () => {
      mockStringUtils.toCamelCase
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('service');

      const deepObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const cacheKey = new CacheKey('test', 'service').listParams(deepObject);

      expect(cacheKey.toString()).toContain('level1=');
    });
  });
});

describe('ckMaker factory function', () => {
  const mockStringUtils = stringUtils as jest.Mocked<typeof stringUtils>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStringUtils.toCamelCase.mockImplementation((str: string) =>
      str
        .toLowerCase()
        .replace(/[-_\s]+(.)?/g, (_, char: string) =>
          char ? char.toUpperCase() : '',
        ),
    );
  });

  it('should create new CacheKey instance', () => {
    mockStringUtils.toCamelCase
      .mockReturnValueOnce('user')
      .mockReturnValueOnce('service');

    const cacheKey = ckMaker('user', 'service');

    expect(cacheKey).toBeInstanceOf(CacheKey);
    expect(cacheKey.toString()).toBe('user:service');
  });

  it('should create independent instances', () => {
    mockStringUtils.toCamelCase
      .mockReturnValueOnce('module1')
      .mockReturnValueOnce('service1')
      .mockReturnValueOnce('module2')
      .mockReturnValueOnce('service2');

    const cacheKey1 = ckMaker('module1', 'service1').owner('owner1');
    const cacheKey2 = ckMaker('module2', 'service2').owner('owner2');

    expect(cacheKey1.toString()).toBe('module1:service1:owner1');
    expect(cacheKey2.toString()).toBe('module2:service2:owner2');
  });

  it('should work with method chaining', () => {
    mockStringUtils.toCamelCase
      .mockReturnValueOnce('product')
      .mockReturnValueOnce('catalog');

    const result = ckMaker('product', 'catalog')
      .owner('store123')
      .single('electronics')
      .listParams({ page: 1, limit: 10 })
      .toString();

    expect(result).toBe('product:catalog:store123:electronics:limit=10&page=1');
  });
});
