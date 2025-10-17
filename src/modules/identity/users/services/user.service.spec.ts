import { Test, TestingModule } from '@nestjs/testing';
import { UserDocument } from '../entities/user.entity';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { UsersService } from './user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import * as hashUtils from '@/common/utils/hash.utils';

jest.mock('@/common/utils/hash.utils');

describe('UsersService', () => {
  let service: UsersService;
  let repository: IUserRepository;

  const mockHashUtils = hashUtils as jest.Mocked<typeof hashUtils>;

  const mockUser: UserDocument = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2b$10$hashedpassword',
    role: 'business',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as UserDocument;

  const mockCreateUserDto: CreateUserDto = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    role: 'business',
  };

  const mockUserRepository = {
    create: jest.fn(),
    findOneById: jest.fn(),
    findOneByCondition: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    hardDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<IUserRepository>('IUserRepository');

    jest.clearAllMocks();
    mockHashUtils.hashInput.mockResolvedValue('$2b$10$hashedpassword');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const expectedUser = {
        ...mockUser,
        name: mockCreateUserDto.name,
        email: mockCreateUserDto.email,
        password: '$2b$10$hashedpassword',
      };

      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await service.create(mockCreateUserDto);

      expect(mockHashUtils.hashInput).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: mockCreateUserDto.name,
        email: mockCreateUserDto.email,
        role: mockCreateUserDto.role,
        password: '$2b$10$hashedpassword',
      });
      expect(result).toEqual(expectedUser);
    });

    it('should handle different user roles', async () => {
      const roles = ['admin', 'business', 'client'] as const;

      for (const role of roles) {
        const userDto = { ...mockCreateUserDto, role };
        const expectedUser = { ...mockUser, role };

        mockUserRepository.create.mockResolvedValue(expectedUser);

        const result = await service.create(userDto);

        expect(mockUserRepository.create).toHaveBeenCalledWith({
          ...userDto,
          password: '$2b$10$hashedpassword',
        });
        expect(result.role).toBe(role);
      }
    });

    it('should handle password hashing errors', async () => {
      mockHashUtils.hashInput.mockRejectedValue(new Error('Hash error'));

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        'Hash error',
      );

      expect(mockHashUtils.hashInput).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository creation errors', async () => {
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        'Database error',
      );

      expect(mockHashUtils.hashInput).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        name: mockCreateUserDto.name,
        email: mockCreateUserDto.email,
        role: mockCreateUserDto.role,
        password: '$2b$10$hashedpassword',
      });
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      mockUserRepository.findOneByCondition.mockResolvedValue(mockUser);

      const result = await service.findByEmail('john@example.com');

      expect(mockUserRepository.findOneByCondition).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOneByCondition.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(mockUserRepository.findOneByCondition).toHaveBeenCalledWith({
        email: 'notfound@example.com',
      });
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findOneByCondition.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findByEmail('test@example.com')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different email formats', async () => {
      const emails = [
        'user@domain.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org',
        'user123@test-domain.net',
      ];

      mockUserRepository.findOneByCondition.mockResolvedValue(mockUser);

      for (const email of emails) {
        await service.findByEmail(email);
        expect(mockUserRepository.findOneByCondition).toHaveBeenCalledWith({
          email,
        });
      }
    });
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      mockUserRepository.findOneById.mockResolvedValue(mockUser);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOneById.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(
        'nonexistent-id',
      );
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findOneById.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findById('some-id')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different ID formats', async () => {
      const ids = [
        '507f1f77bcf86cd799439011',
        'short-id',
        '12345',
        'uuid-like-format',
      ];

      mockUserRepository.findOneById.mockResolvedValue(mockUser);

      for (const id of ids) {
        await service.findById(id);
        expect(mockUserRepository.findOneById).toHaveBeenCalledWith(id);
      }
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = {
      count: 2,
      items: [mockUser, { ...mockUser, _id: 'another-id' }],
    };

    it('should return paginated list of users with condition', async () => {
      mockUserRepository.findAll.mockResolvedValue(mockPaginatedResponse);

      const condition = { role: 'business' };
      const result = await service.findAll(condition);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        condition,
        undefined,
      );
      expect(result.count).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('should handle pagination options', async () => {
      const mockResponse = { count: 10, items: [mockUser] };
      mockUserRepository.findAll.mockResolvedValue(mockResponse);

      const condition = { role: 'admin' };
      const options = { limit: 10, skip: 0 };

      const result = await service.findAll(condition, options);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        condition,
        options,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return all users when no condition provided', async () => {
      const mockResponse = { count: 5, items: [] };
      mockUserRepository.findAll.mockResolvedValue(mockResponse);

      const result = await service.findAll();

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty condition object', async () => {
      mockUserRepository.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await service.findAll({});

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({}, undefined);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle complex conditions', async () => {
      const complexCondition = {
        role: 'business',
        deletedAt: null,
        createdAt: { $gte: new Date('2023-01-01') },
      };

      mockUserRepository.findAll.mockResolvedValue(mockPaginatedResponse);

      await service.findAll(complexCondition);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        complexCondition,
        undefined,
      );
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll({})).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should update a user successfully', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result?.name).toBe('Updated Name');
    });

    it('should return null if user not found', async () => {
      mockUserRepository.update.mockResolvedValue(null);

      const result = await service.update('nonexistent-id', { name: 'Test' });

      expect(mockUserRepository.update).toHaveBeenCalledWith('nonexistent-id', {
        name: 'Test',
      });
      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      const updateDto = {
        name: 'New Name',
        email: 'newemail@example.com',
        role: 'admin' as const,
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result?.name).toBe(updateDto.name);
      expect(result?.email).toBe(updateDto.email);
      expect(result?.role).toBe(updateDto.role);
    });

    it('should handle password updates', async () => {
      const updateDto = { password: 'newpassword123' };
      const updatedUser = { ...mockUser, password: '$2b$10$newhashedpassword' };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(updatedUser);
    });

    it('should handle role changes', async () => {
      const roles = ['admin', 'business', 'client'] as const;

      for (const role of roles) {
        const updateDto = { role };
        const updatedUser = { ...mockUser, role };

        mockUserRepository.update.mockResolvedValue(updatedUser);

        const result = await service.update(userId, updateDto);

        expect(mockUserRepository.update).toHaveBeenCalledWith(
          userId,
          updateDto,
        );
        expect(result?.role).toBe(role);
      }
    });

    it('should handle repository errors', async () => {
      mockUserRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(userId, { name: 'Test' })).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle empty update data', async () => {
      const updateDto = {};
      mockUserRepository.update.mockResolvedValue(mockUser);

      const result = await service.update(userId, updateDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user successfully', async () => {
      mockUserRepository.softDelete.mockResolvedValue(true);

      const result = await service.softDelete('507f1f77bcf86cd799439011');

      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockUserRepository.softDelete.mockResolvedValue(false);

      const result = await service.softDelete('nonexistent-id');

      expect(mockUserRepository.softDelete).toHaveBeenCalledWith(
        'nonexistent-id',
      );
      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      mockUserRepository.softDelete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.softDelete('some-id')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different ID formats', async () => {
      const ids = ['507f1f77bcf86cd799439011', 'short-id', '12345'];

      mockUserRepository.softDelete.mockResolvedValue(true);

      for (const id of ids) {
        const result = await service.softDelete(id);
        expect(mockUserRepository.softDelete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
      }
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a user successfully', async () => {
      mockUserRepository.hardDelete.mockResolvedValue(true);

      const result = await service.hardDelete('507f1f77bcf86cd799439011');

      expect(mockUserRepository.hardDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockUserRepository.hardDelete.mockResolvedValue(false);

      const result = await service.hardDelete('nonexistent-id');

      expect(mockUserRepository.hardDelete).toHaveBeenCalledWith(
        'nonexistent-id',
      );
      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      mockUserRepository.hardDelete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.hardDelete('some-id')).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different ID formats', async () => {
      const ids = ['507f1f77bcf86cd799439011', 'short-id', '12345'];

      mockUserRepository.hardDelete.mockResolvedValue(true);

      for (const id of ids) {
        const result = await service.hardDelete(id);
        expect(mockUserRepository.hardDelete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      const createDto = mockCreateUserDto;
      const userId = '507f1f77bcf86cd799439011';
      const updateDto = { name: 'Updated Name' };

      mockUserRepository.create.mockResolvedValue(mockUser);
      mockUserRepository.findOneById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });
      mockUserRepository.softDelete.mockResolvedValue(true);

      const createdUser = await service.create(createDto);
      expect(createdUser).toEqual(mockUser);

      const foundUser = await service.findById(userId);
      expect(foundUser).toEqual(mockUser);

      const updatedUser = await service.update(userId, updateDto);
      expect(updatedUser?.name).toBe('Updated Name');

      const deleteResult = await service.softDelete(userId);
      expect(deleteResult).toBe(true);

      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.softDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle user not found scenarios consistently', async () => {
      const nonExistentId = 'nonexistent-id';

      mockUserRepository.findOneById.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(null);
      mockUserRepository.softDelete.mockResolvedValue(false);
      mockUserRepository.hardDelete.mockResolvedValue(false);

      const findResult = await service.findById(nonExistentId);
      expect(findResult).toBeNull();

      const updateResult = await service.update(nonExistentId, {
        name: 'Test',
      });
      expect(updateResult).toBeNull();

      const softDeleteResult = await service.softDelete(nonExistentId);
      expect(softDeleteResult).toBe(false);

      const hardDeleteResult = await service.hardDelete(nonExistentId);
      expect(hardDeleteResult).toBe(false);
    });
  });
});
