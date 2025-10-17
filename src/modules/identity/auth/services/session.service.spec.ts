import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '@/lib/cache/cache.service';
import { ConfigService } from '@core/config/config.service';
import { NodeEnvironment } from '@core/config/env/env.schema';
import { AuthSessionType, SessionUser } from '@/common/types/auth-session.type';
import { SessionService } from './session.service';
import { UserRoles } from '@/modules/identity/users/dtos/create-user.dto';

describe('SessionService', () => {
  let service: SessionService;
  let cacheService: CacheService;
  let configService: ConfigService;

  const mockSessionUser: SessionUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRoles.BUSINESS,
    business: {
      _id: 'business123',
      name: 'Test Business',
    },
  };

  const mockSession: AuthSessionType = {
    user: mockSessionUser,
    version: 1,
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    env: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(cacheService).toBeDefined();
    expect(configService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new session successfully', async () => {
      const ttl = 86400;
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(ttl);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.create(mockSessionUser, 1);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'session:507f1f77bcf86cd799439011',
        mockSession,
        ttl,
      );
      expect(result).toEqual(mockSession);
    });

    it('should create session with development TTL', async () => {
      const developmentTtl = 7 * 24 * 60 * 60;
      mockConfigService.env.mockReturnValue(NodeEnvironment.Development);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.create(mockSessionUser, 2);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'session:507f1f77bcf86cd799439011',
        { user: mockSessionUser, version: 2 },
        developmentTtl,
      );
    });

    it('should create session with production TTL', async () => {
      const productionTtl = 3600;
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(productionTtl);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.create(mockSessionUser, 3);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'session:507f1f77bcf86cd799439011',
        { user: mockSessionUser, version: 3 },
        productionTtl,
      );
    });

    it('should handle user without business', async () => {
      const userWithoutBusiness: SessionUser = {
        _id: '507f1f77bcf86cd799439012',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: UserRoles.BUSINESS,
      };

      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.create(userWithoutBusiness, 1);

      expect(result.user).toEqual(userWithoutBusiness);
      expect(result.version).toBe(1);
    });

    it('should handle cache service errors', async () => {
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.create(mockSessionUser, 1)).rejects.toThrow(
        'Cache error',
      );
    });
  });

  describe('get', () => {
    it('should retrieve an existing session', async () => {
      mockCacheService.get.mockResolvedValue(mockSession);

      const result = await service.get('507f1f77bcf86cd799439011');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'session:507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockSession);
    });

    it('should return null when session does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.get('nonexistent-user-id');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'session:nonexistent-user-id',
      );
      expect(result).toBeNull();
    });

    it('should handle cache service errors during retrieval', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      await expect(service.get('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Cache error',
      );
    });

    it('should handle different user ID formats', async () => {
      const userIds = [
        '507f1f77bcf86cd799439011',
        'short-id',
        'user@email.com',
        '12345',
      ];

      mockCacheService.get.mockResolvedValue(mockSession);

      for (const userId of userIds) {
        await service.get(userId);
        expect(mockCacheService.get).toHaveBeenCalledWith(`session:${userId}`);
      }
    });
  });

  describe('invalidate', () => {
    it('should invalidate a session successfully', async () => {
      mockCacheService.delete.mockResolvedValue(true);

      await service.invalidate('507f1f77bcf86cd799439011');

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'session:507f1f77bcf86cd799439011',
      );
    });

    it('should handle non-existent session during invalidation', async () => {
      mockCacheService.delete.mockResolvedValue(false);

      await service.invalidate('nonexistent-user-id');

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        'session:nonexistent-user-id',
      );
    });

    it('should handle cache service errors during invalidation', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.invalidate('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Cache error');
    });

    it('should handle different user ID formats for invalidation', async () => {
      const userIds = [
        '507f1f77bcf86cd799439011',
        'short-id',
        'user@email.com',
        '12345',
      ];

      mockCacheService.delete.mockResolvedValue(true);

      for (const userId of userIds) {
        await service.invalidate(userId);
        expect(mockCacheService.delete).toHaveBeenCalledWith(
          `session:${userId}`,
        );
      }
    });
  });

  describe('TTL calculation', () => {
    it('should use correct development TTL', async () => {
      const expectedTtl = 7 * 24 * 60 * 60;
      mockConfigService.env.mockReturnValue(NodeEnvironment.Development);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.create(mockSessionUser, 1);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expectedTtl,
      );
    });

    it('should use production TTL from config', async () => {
      const productionTtl = 1800;
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(productionTtl);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.create(mockSessionUser, 1);

      expect(mockConfigService.env).toHaveBeenCalledWith('NODE_ENV');
      expect(mockConfigService.env).toHaveBeenCalledWith('AUTH_SESSION_TTL');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        productionTtl,
      );
    });
  });

  describe('Session key generation', () => {
    it('should generate consistent session keys', async () => {
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(mockSession);
      mockCacheService.delete.mockResolvedValue(true);

      const userId = '507f1f77bcf86cd799439011';
      const expectedKey = `session:${userId}`;

      await service.create(mockSessionUser, 1);
      await service.get(userId);
      await service.invalidate(userId);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expectedKey,
        expect.any(Object),
        expect.any(Number),
      );
      expect(mockCacheService.get).toHaveBeenCalledWith(expectedKey);
      expect(mockCacheService.delete).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('Session object structure', () => {
    it('should create session objects with correct structure', async () => {
      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockResolvedValue(undefined);

      const version = 5;
      const result = await service.create(mockSessionUser, version);

      expect(result).toEqual({
        user: mockSessionUser,
        version: version,
      });
      expect(result.user._id).toBe(mockSessionUser._id);
      expect(result.user.name).toBe(mockSessionUser.name);
      expect(result.user.email).toBe(mockSessionUser.email);
      expect(result.user.role).toBe(mockSessionUser.role);
      expect(result.user.business).toBe(mockSessionUser.business);
      expect(result.version).toBe(version);
    });

    it('should handle different version numbers', async () => {
      const versions = [0, 1, 10, 999, -1];
      mockConfigService.env
        .mockReturnValue(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockResolvedValue(undefined);

      for (const version of versions) {
        mockConfigService.env.mockReturnValueOnce(86400);
        const result = await service.create(mockSessionUser, version);
        expect(result.version).toBe(version);
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete session lifecycle', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const version = 1;

      mockConfigService.env
        .mockReturnValueOnce(NodeEnvironment.Production)
        .mockReturnValueOnce(86400);
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(mockSession);
      mockCacheService.delete.mockResolvedValue(true);

      const createdSession = await service.create(mockSessionUser, version);
      expect(createdSession).toEqual(mockSession);

      const retrievedSession = await service.get(userId);
      expect(retrievedSession).toEqual(mockSession);

      await service.invalidate(userId);

      expect(mockCacheService.set).toHaveBeenCalledTimes(1);
      expect(mockCacheService.get).toHaveBeenCalledTimes(1);
      expect(mockCacheService.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle session not found after invalidation', async () => {
      const userId = '507f1f77bcf86cd799439011';

      mockCacheService.delete.mockResolvedValue(true);
      mockCacheService.get.mockResolvedValue(null);

      await service.invalidate(userId);
      const result = await service.get(userId);

      expect(result).toBeNull();
    });
  });
});
