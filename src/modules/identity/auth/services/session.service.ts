import { CacheService } from '@/lib/cache/cache.service';
import { Injectable } from '@nestjs/common';

import { AuthSessionType, SessionUser } from '@/common/types/auth-session.type';
import { ConfigService } from '@core/config/config.service';
import { NodeEnvironment } from '@core/config/env/env.schema';

@Injectable()
export class SessionService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @description Creates a new user session in cache.
   * @param user The user object to associate with the session.
   * @param version The session version number for invalidation purposes.
   */
  async create(user: SessionUser, version: number): Promise<AuthSessionType> {
    const sessionKey = this.#makeSessionKey(user._id);
    const session = this.#makeSessionObject(user, version);

    await this.cacheService.set(sessionKey, session, this.#authSessionTtl);

    return session;
  }

  /**
   * @description Retrieves an active session for a user.
   * @param userId The ID of the user whose session to retrieve.
   * @returns The session object if found, otherwise null.
   */
  async get(userId: string): Promise<AuthSessionType | null> {
    const sessionKey = this.#makeSessionKey(userId);

    return await this.cacheService.get<AuthSessionType>(sessionKey);
  }

  /**
   * @description Invalidates a user's session by removing it from cache.
   * @param userId The ID of the user whose session to invalidate.
   */
  async invalidate(userId: string) {
    const sessionKey = this.#makeSessionKey(userId);

    await this.cacheService.delete(sessionKey);
  }

  /**
   * @description Generates a standardized session cache key.
   * @param userId The user ID to include in the key.
   * @returns The formatted session key.
   */
  #makeSessionKey(userId: string) {
    return `session:${userId}`;
  }

  /**
   * @description Creates a session object with user data and version.
   * @param user The user object to store in the session.
   * @param version The version number for session management.
   * @returns The formatted session object.
   */
  #makeSessionObject(user: SessionUser, version: number) {
    return {
      user,
      version,
    };
  }

  /**
   * @description Calculates the appropriate TTL for auth sessions.
   * Uses 30 days in development, 24 hours in production.
   * @returns TTL in seconds.
   */
  get #authSessionTtl() {
    const THIRTY_DAYS_TTL = 7 * 24 * 60 * 60;

    return this.configService.env('NODE_ENV') === NodeEnvironment.Development
      ? THIRTY_DAYS_TTL
      : this.configService.env('AUTH_SESSION_TTL');
  }
}
