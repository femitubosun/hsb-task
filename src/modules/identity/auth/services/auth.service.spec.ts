import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@/core/config/config.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { UsersService } from '@modules/identity/users/services/user.service';
import { BusinessService } from '@/modules/profile/business/services/business.service';
import * as hashUtils from '@/common/utils/hash.utils';
import {
  SigninRequestDto,
  SignupBusinessRequestDto,
  SignupRequestDto,
} from '../dtos/request';
import { UserRoles } from '@/modules/identity/users/dtos/create-user.dto';
import { UserDocument } from '@/modules/identity/users/entities/user.entity';
import { AuthSessionType, SessionUser } from '@/common/types/auth-session.type';
import {
  INVALID_CREDENTIALS,
  SOMETHING_WENT_WRONG,
  USER_EXISTS,
} from '../message';

jest.mock('@/common/utils/hash.utils');

describe('AuthService', () => {
  let service: AuthService;
  let sessionService: SessionService;
  let jwtService: JwtService;
  let userService: UsersService;
  let configService: ConfigService;
  let businessService: BusinessService;

  const mockHashUtils = hashUtils as jest.Mocked<typeof hashUtils>;

  const mockUser: UserDocument = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2b$10$hashedpassword',
    role: UserRoles.BUSINESS,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as UserDocument;

  const mockBusinessUser: UserDocument = {
    ...mockUser,
    business: {
      _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Test Business',
    },
  } as UserDocument;

  const mockSessionUser: SessionUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRoles.BUSINESS,
  };

  const mockBusinessSessionUser: SessionUser = {
    ...mockSessionUser,
    business: {
      _id: '507f1f77bcf86cd799439012',
      name: 'Test Business',
    },
  };

  const mockSession: AuthSessionType = {
    user: mockSessionUser,
    version: 1,
  };

  const mockSignupRequestDto: SignupRequestDto = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
  };

  const mockSignupBusinessRequestDto: SignupBusinessRequestDto = {
    name: 'Business Owner',
    email: 'owner@business.com',
    password: 'password123',
    business: {
      name: 'Test Business',
    },
  };

  const mockSigninRequestDto: SigninRequestDto = {
    email: 'john@example.com',
    password: 'password123',
  };

  const mockSessionService = {
    create: jest.fn(),
    get: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUserService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockConfigService = {
    env: jest.fn(),
  };

  const mockBusinessService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BusinessService,
          useValue: mockBusinessService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    sessionService = module.get<SessionService>(SessionService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
    businessService = module.get<BusinessService>(BusinessService);

    jest.clearAllMocks();
    mockHashUtils.verifyHash.mockResolvedValue(true);
    mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
    mockConfigService.env.mockReturnValue('mock-secret');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(sessionService).toBeDefined();
    expect(jwtService).toBeDefined();
    expect(userService).toBeDefined();
    expect(configService).toBeDefined();
    expect(businessService).toBeDefined();
  });

  describe('signupBusiness', () => {
    it('should create a business user successfully', async () => {
      const createdUser = { ...mockUser, role: UserRoles.BUSINESS };
      const businessUserWithBusiness = { ...mockBusinessUser };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockBusinessService.create.mockResolvedValue({});
      mockUserService.findById.mockResolvedValue(businessUserWithBusiness);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      const result = await service.signupBusiness(mockSignupBusinessRequestDto);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSignupBusinessRequestDto.email,
      );
      expect(mockUserService.create).toHaveBeenCalledWith({
        ...mockSignupBusinessRequestDto,
        role: UserRoles.BUSINESS,
      });
      expect(mockBusinessService.create).toHaveBeenCalledWith({
        userId: createdUser._id,
        ...mockSignupBusinessRequestDto.business,
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(
        String(createdUser._id),
      );
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: mockBusinessSessionUser,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.signupBusiness(mockSignupBusinessRequestDto),
      ).rejects.toThrow(new ConflictException(USER_EXISTS));

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSignupBusinessRequestDto.email,
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
      expect(mockBusinessService.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if user creation fails', async () => {
      const createdUser = { ...mockUser, role: UserRoles.BUSINESS };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockBusinessService.create.mockResolvedValue({});
      mockUserService.findById.mockResolvedValue(null);

      await expect(
        service.signupBusiness(mockSignupBusinessRequestDto),
      ).rejects.toThrow(new InternalServerErrorException(SOMETHING_WENT_WRONG));

      expect(mockUserService.findById).toHaveBeenCalledWith(
        String(createdUser._id),
      );
    });

    it('should handle business service creation errors', async () => {
      const createdUser = { ...mockUser, role: UserRoles.BUSINESS };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockBusinessService.create.mockRejectedValue(new Error('Business error'));

      await expect(
        service.signupBusiness(mockSignupBusinessRequestDto),
      ).rejects.toThrow('Business error');

      expect(mockBusinessService.create).toHaveBeenCalledWith({
        userId: createdUser._id,
        ...mockSignupBusinessRequestDto.business,
      });
      expect(mockUserService.findById).not.toHaveBeenCalled();
    });

    it('should handle user service creation errors', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.signupBusiness(mockSignupBusinessRequestDto),
      ).rejects.toThrow('Database error');

      expect(mockUserService.create).toHaveBeenCalledWith({
        ...mockSignupBusinessRequestDto,
        role: UserRoles.BUSINESS,
      });
      expect(mockBusinessService.create).not.toHaveBeenCalled();
    });
  });

  describe('signupClient', () => {
    it('should create a client user successfully', async () => {
      const createdUser = { ...mockUser, role: UserRoles.CLIENT };
      const expectedSessionUser: SessionUser = {
        _id: String(createdUser._id),
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(createdUser);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: expectedSessionUser,
        version: 1,
      });

      const result = await service.signupClient(mockSignupRequestDto);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSignupRequestDto.email,
      );
      expect(mockUserService.create).toHaveBeenCalledWith({
        ...mockSignupRequestDto,
        role: UserRoles.CLIENT,
      });
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: expectedSessionUser,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.signupClient(mockSignupRequestDto)).rejects.toThrow(
        new ConflictException(USER_EXISTS),
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSignupRequestDto.email,
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if user creation returns null', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(null);

      await expect(service.signupClient(mockSignupRequestDto)).rejects.toThrow(
        new InternalServerErrorException(SOMETHING_WENT_WRONG),
      );

      expect(mockUserService.create).toHaveBeenCalledWith({
        ...mockSignupRequestDto,
        role: UserRoles.CLIENT,
      });
    });

    it('should handle user service creation errors', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockRejectedValue(new Error('Database error'));

      await expect(service.signupClient(mockSignupRequestDto)).rejects.toThrow(
        'Database error',
      );

      expect(mockUserService.create).toHaveBeenCalledWith({
        ...mockSignupRequestDto,
        role: UserRoles.CLIENT,
      });
    });

    it('should handle different user roles correctly', async () => {
      const roles = [UserRoles.CLIENT, UserRoles.ADMIN];

      for (const role of roles) {
        const createdUser = { ...mockUser, role };
        mockUserService.findByEmail.mockResolvedValue(null);
        mockUserService.create.mockResolvedValue(createdUser);
        mockSessionService.get.mockResolvedValue(null);
        mockSessionService.create.mockResolvedValue({
          user: { ...mockSessionUser, role },
          version: 1,
        });

        await service.signupClient(mockSignupRequestDto);

        expect(mockUserService.create).toHaveBeenCalledWith({
          ...mockSignupRequestDto,
          role: UserRoles.CLIENT,
        });
      }
    });
  });

  describe('signIn', () => {
    it('should authenticate user successfully', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      const result = await service.signIn(mockSigninRequestDto);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSigninRequestDto.email,
      );
      expect(mockHashUtils.verifyHash).toHaveBeenCalledWith(
        mockSigninRequestDto.password,
        mockUser.password,
      );
      expect(result).toEqual({
        token: 'mock-jwt-token',
        user: mockSessionUser,
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(service.signIn(mockSigninRequestDto)).rejects.toThrow(
        new BadRequestException(INVALID_CREDENTIALS),
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSigninRequestDto.email,
      );
      expect(mockHashUtils.verifyHash).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if password is invalid', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockHashUtils.verifyHash.mockResolvedValue(false);

      await expect(service.signIn(mockSigninRequestDto)).rejects.toThrow(
        new BadRequestException(INVALID_CREDENTIALS),
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSigninRequestDto.email,
      );
      expect(mockHashUtils.verifyHash).toHaveBeenCalledWith(
        mockSigninRequestDto.password,
        mockUser.password,
      );
    });

    it('should handle user service errors', async () => {
      mockUserService.findByEmail.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.signIn(mockSigninRequestDto)).rejects.toThrow(
        'Database error',
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        mockSigninRequestDto.email,
      );
    });

    it('should handle hash verification errors', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockHashUtils.verifyHash.mockRejectedValue(new Error('Hash error'));

      await expect(service.signIn(mockSigninRequestDto)).rejects.toThrow(
        'Hash error',
      );

      expect(mockHashUtils.verifyHash).toHaveBeenCalledWith(
        mockSigninRequestDto.password,
        mockUser.password,
      );
    });

    it('should handle business users correctly', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockBusinessUser);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: mockBusinessSessionUser,
        version: 1,
      });

      const result = await service.signIn(mockSigninRequestDto);

      expect(result.user).toEqual(mockBusinessSessionUser);
      expect(result.user.business).toBeDefined();
      expect(result.user.business?.name).toBe('Test Business');
    });

    it('should handle different email formats', async () => {
      const emails = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
      ];

      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      for (const email of emails) {
        const userWithEmail = { ...mockUser, email };
        mockUserService.findByEmail.mockResolvedValue(userWithEmail);

        const signinDto = { ...mockSigninRequestDto, email };
        await service.signIn(signinDto);

        expect(mockUserService.findByEmail).toHaveBeenCalledWith(email);
      }
    });
  });

  describe('logout', () => {
    it('should invalidate user session successfully', async () => {
      mockSessionService.invalidate.mockResolvedValue(undefined);

      await service.logout(mockSessionUser);

      expect(mockSessionService.invalidate).toHaveBeenCalledWith(
        mockSessionUser._id,
      );
    });

    it('should handle session service errors', async () => {
      mockSessionService.invalidate.mockRejectedValue(new Error('Cache error'));

      await expect(service.logout(mockSessionUser)).rejects.toThrow(
        'Cache error',
      );

      expect(mockSessionService.invalidate).toHaveBeenCalledWith(
        mockSessionUser._id,
      );
    });

    it('should handle different user types', async () => {
      const users = [
        mockSessionUser,
        mockBusinessSessionUser,
        { ...mockSessionUser, role: UserRoles.ADMIN },
      ];

      mockSessionService.invalidate.mockResolvedValue(undefined);

      for (const user of users) {
        await service.logout(user);
        expect(mockSessionService.invalidate).toHaveBeenCalledWith(user._id);
      }
    });

    it('should handle users without business correctly', async () => {
      const userWithoutBusiness: SessionUser = {
        _id: '507f1f77bcf86cd799439013',
        name: 'Client User',
        email: 'client@example.com',
        role: UserRoles.CLIENT,
      };

      mockSessionService.invalidate.mockResolvedValue(undefined);

      await service.logout(userWithoutBusiness);

      expect(mockSessionService.invalidate).toHaveBeenCalledWith(
        userWithoutBusiness._id,
      );
    });
  });

  describe('Session management', () => {
    it('should create session with incremented version', async () => {
      const existingSession = { user: mockSessionUser, version: 5 };
      const newSession = { user: mockSessionUser, version: 6 };

      mockSessionService.get.mockResolvedValue(existingSession);
      mockSessionService.create.mockResolvedValue(newSession);

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      await service.signupClient(mockSignupRequestDto);

      expect(mockSessionService.get).toHaveBeenCalledWith(String(mockUser._id));
      expect(mockSessionService.create).toHaveBeenCalledWith(
        mockSessionUser,
        6,
      );
    });

    it('should start with version 1 for new sessions', async () => {
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      await service.signupClient(mockSignupRequestDto);

      expect(mockSessionService.create).toHaveBeenCalledWith(
        mockSessionUser,
        1,
      );
    });

    it('should generate JWT token with correct payload', async () => {
      const expectedPayload = {
        sub: mockSessionUser._id,
        version: 1,
      };
      const expectedOptions = {
        secret: 'mock-secret',
        expiresIn: '6d',
      };

      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      await service.signupClient(mockSignupRequestDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expectedPayload,
        expectedOptions,
      );
    });

    it('should handle JWT service errors', async () => {
      mockJwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      await expect(service.signupClient(mockSignupRequestDto)).rejects.toThrow(
        'JWT error',
      );
    });
  });

  describe('User conversion', () => {
    it('should convert UserDocument to SessionUser correctly', async () => {
      const expectedSessionUser: SessionUser = {
        _id: String(mockUser._id),
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
      };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: expectedSessionUser,
        version: 1,
      });

      const result = await service.signupClient(mockSignupRequestDto);

      expect(result.user).toEqual(expectedSessionUser);
      expect(result.user._id).toBe(String(mockUser._id));
    });

    it('should include business information when present', async () => {
      const expectedSessionUser: SessionUser = {
        _id: String(mockBusinessUser._id),
        name: mockBusinessUser.name,
        email: mockBusinessUser.email,
        role: mockBusinessUser.role,
        business: {
          _id: String(mockBusinessUser.business?._id),
          name: mockBusinessUser.business?.name ?? '',
        },
      };

      mockUserService.findByEmail.mockResolvedValue(mockBusinessUser);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: expectedSessionUser,
        version: 1,
      });

      const result = await service.signIn(mockSigninRequestDto);

      expect(result.user.business).toBeDefined();
      expect(result.user.business?._id).toBe(
        String(mockBusinessUser.business?._id),
      );
      expect(result.user.business?.name).toBe(mockBusinessUser.business?.name);
    });

    it('should handle users without business', async () => {
      const userWithoutBusiness = mockUser;

      const expectedSessionUser: SessionUser = {
        _id: String(userWithoutBusiness._id),
        name: userWithoutBusiness.name,
        email: userWithoutBusiness.email,
        role: userWithoutBusiness.role,
      };

      mockUserService.findByEmail.mockResolvedValue(userWithoutBusiness);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: expectedSessionUser,
        version: 1,
      });

      const result = await service.signIn(mockSigninRequestDto);

      expect(result.user.business).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete authentication flow', async () => {
      mockUserService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      mockUserService.create.mockResolvedValue(mockUser);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue(mockSession);
      mockSessionService.invalidate.mockResolvedValue(undefined);

      const signupResult = await service.signupClient(mockSignupRequestDto);
      expect(signupResult.token).toBe('mock-jwt-token');

      const signinResult = await service.signIn(mockSigninRequestDto);
      expect(signinResult.token).toBe('mock-jwt-token');

      await service.logout(mockSessionUser);

      expect(mockUserService.create).toHaveBeenCalledTimes(1);
      expect(mockSessionService.create).toHaveBeenCalledTimes(2);
      expect(mockSessionService.invalidate).toHaveBeenCalledTimes(1);
    });

    it('should handle business user complete flow', async () => {
      const createdUser = { ...mockUser, role: UserRoles.BUSINESS };

      mockUserService.findByEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockBusinessUser);
      mockUserService.create.mockResolvedValue(createdUser);
      mockUserService.findById.mockResolvedValue(mockBusinessUser);
      mockBusinessService.create.mockResolvedValue({});
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(null);
      mockSessionService.create.mockResolvedValue({
        user: mockBusinessSessionUser,
        version: 1,
      });
      mockSessionService.invalidate.mockResolvedValue(undefined);

      const signupResult = await service.signupBusiness(
        mockSignupBusinessRequestDto,
      );
      expect(signupResult.user.business).toBeDefined();

      const signinResult = await service.signIn(mockSigninRequestDto);
      expect(signinResult.user.business).toBeDefined();

      await service.logout(mockBusinessSessionUser);

      expect(mockBusinessService.create).toHaveBeenCalledTimes(1);
      expect(mockSessionService.invalidate).toHaveBeenCalledTimes(1);
    });

    it('should maintain session versioning across operations', async () => {
      const existingSession = { user: mockSessionUser, version: 3 };
      const newSession = { user: mockSessionUser, version: 4 };

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockHashUtils.verifyHash.mockResolvedValue(true);
      mockSessionService.get.mockResolvedValue(existingSession);
      mockSessionService.create.mockResolvedValue(newSession);

      await service.signIn(mockSigninRequestDto);

      expect(mockSessionService.create).toHaveBeenCalledWith(
        mockSessionUser,
        4,
      );
    });
  });
});
