import { toCamelCase } from '@/common/utils/string.utils';

export class CacheKey {
  private segments: string[] = [];
  private parameters: Record<string, unknown> = {};
  private ownerParam?: string;
  private prefix: string;

  constructor(module: string, service: string) {
    this.prefix = `${CacheKey.validateName(module)}:${CacheKey.validateName(service)}`;
  }

  /**
   * @description
   * Validates and normalizes the service name to camelCase
   * @param name Service name to validate
   * @returns Normalized service name in camelCase
   */
  static validateName(name: string): string {
    return toCamelCase(name);
  }

  /**
   * @description
   * Sets the owner of the cache key
   * @param input Owner identifier
   * @returns CacheKey instance for method chaining
   */
  owner(input: string): CacheKey {
    this.ownerParam = input;
    return this;
  }

  /**
   * @description
   * Adds a single item identifier to the cache key segments
   * @param itemId Item identifier (string or number)
   * @returns CacheKey instance for method chaining
   */
  single(itemId: string | number): CacheKey {
    this.segments.push(String(itemId));
    return this;
  }

  /**
   * @description
   * Adds query parameters to the cache key
   * @param parameters Object containing key-value parameters
   * @returns CacheKey instance for method chaining
   */
  listParams(parameters: Record<string, unknown>): CacheKey {
    this.parameters = {
      ...this.parameters,
      ...this.#sortObjectKeys(parameters),
    };
    return this;
  }

  /**
   * @description
   * Builds and returns the final cache key string
   * @returns Formatted cache key string
   */
  toString(): string {
    const baseKey = this.#makeBaseKey();

    if (!Object.keys(this.parameters).length) {
      return baseKey;
    }

    return this.#addParamsToBaseKey(baseKey);
  }

  /**
   * @description
   * Generates the owner segment for the cache key
   * @returns Owner segment string with colon prefix, or empty string
   */
  #makeOwnerSegment() {
    return this.ownerParam ? `:${this.ownerParam}` : '';
  }

  /**
   * @description
   * Generates the segments string for the cache key
   * @returns Segments joined with colons, or empty string
   */
  #makeSegementString() {
    return this.segments.length ? `:${this.segments.join(':')}` : '';
  }

  /**
   * @description
   * Constructs the base cache key without parameters
   * @returns Base cache key string
   */
  #makeBaseKey() {
    return `${this.prefix}${this.#makeOwnerSegment()}${this.#makeSegementString()}`;
  }

  /**
   * @description
   * Appends URL-encoded parameters to the base cache key
   * @param baseKey Base cache key string
   * @returns Cache key with parameters appended
   */
  #addParamsToBaseKey(baseKey: string) {
    if (!Object.keys(this.parameters).length) {
      return baseKey;
    }

    const paramString = Object.keys(this.parameters)
      .sort()
      .map(k => `${k}=${encodeURIComponent(this.#serializeValue(this.parameters[k]))}`)
      .join('&');

    return `${baseKey}:${paramString}`;
  }

  /**
   * @description
   * Gets the tag for invalidating cache by owner
   * @returns Owner tag string
   */
  get ownerTag() {
    if (this.#makeOwnerSegment()) {
      return `${this.moduleTag}${this.#makeOwnerSegment()}`;
    }

    return this.prefix;
  }

  /**
   * @description
   * Gets the module tag for cache invalidation
   * @returns Module tag string
   */
  get moduleTag() {
    return this.prefix.split(':')[0];
  }

  /**
   * @description
   * Serializes a value to a string for cache key generation
   * @param value Value to serialize
   * @returns Serialized string representation
   */
  #serializeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    return JSON.stringify(value);
  }

  /**
   * @description
   * Sorts object keys alphabetically (deep sort) for consistent cache key generation
   * @param obj Object to sort
   * @returns New object with sorted keys
   */
  #sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const value: unknown = obj[key];

        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          result[key] = this.#sortObjectKeys(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          result[key] = value.map((item: unknown) =>
            typeof item === 'object' && item !== null && !Array.isArray(item)
              ? this.#sortObjectKeys(item as Record<string, unknown>)
              : item,
          );
        } else {
          result[key] = value;
        }

        return result;
      }, {});
  }
}

/**
 * @description
 * Factory function to create a new CacheKey instance
 * @param service Service name for the cache key
 * @returns New CacheKey instance
 */
export const ckMaker = (module: string, service: string) =>
  new CacheKey(module, service);
