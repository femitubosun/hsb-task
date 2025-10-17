import { Test, TestingModule } from '@nestjs/testing';
import { UserDocument } from './entities/user.entity';
import { IUserRepository } from './interfaces/user-repository.interface';
import { UsersService } from './user.service';
import { UserRoles } from './dtos/create-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: IUserRepository;

  const mockUser: UserDocument = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    role: UserRoles.BUSINESS,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as UserDocument;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
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

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: UserRoles.BUSINESS,
      };

      mockUserRepository.create.mockResolvedValue({
        ...mockUser,
        ...createDto,
      });

      const result = await service.create(createDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith(createDto);
      expect(result.name).toEqual(createDto.name);
      expect(result.email).toEqual(createDto.email);
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

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const mockResponse = {
        count: 2,
        items: [mockUser, { ...mockUser, _id: 'another-id' }],
      };

      mockUserRepository.findAll.mockResolvedValue(mockResponse);

      const result = await service.findAll({ role: 'business' });

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        { role: 'business' },
        undefined,
      );
      expect(result.count).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it('should handle pagination options', async () => {
      const mockResponse = { count: 10, items: [mockUser] };
      mockUserRepository.findAll.mockResolvedValue(mockResponse);

      const options = { limit: 10, skip: 0 };
      await service.findAll({}, options);

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({}, options);
    });

    it('should return all users when no condition provided', async () => {
      const mockResponse = { count: 5, items: [] };
      mockUserRepository.findAll.mockResolvedValue(mockResponse);

      await service.findAll();

      expect(mockUserRepository.findAll).toHaveBeenCalledWith({}, undefined);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result?.name).toBe('Updated Name');
    });

    it('should return null if user not found', async () => {
      mockUserRepository.update.mockResolvedValue(null);

      const result = await service.update('nonexistent-id', { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      const updateDto = {
        name: 'New Name',
        email: 'newemail@example.com',
      };

      mockUserRepository.update.mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });

      const result = await service.update(
        '507f1f77bcf86cd799439011',
        updateDto,
      );

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result?.name).toBe(updateDto.name);
      expect(result?.email).toBe(updateDto.email);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a user', async () => {
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

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a user', async () => {
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

      expect(result).toBe(false);
    });
  });
});
