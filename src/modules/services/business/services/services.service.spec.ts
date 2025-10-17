import { CacheService } from '@/lib/cache/cache.service';
import { FetchInput } from '@/lib/cache/dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateServiceInput } from '../../common/dtos/create-service';
import { ServiceDocument } from '../../common/entities/service.entity';
import type { IServiceRepository } from '../../common/interfaces/service-repository.interface';
import { UpdateServiceRequestDto } from '../dtos/request';
import { ServicesService } from './services.service';
describe('ServicesService', () => {
  let service: ServicesService;
  let repository: IServiceRepository;
  let cacheService: CacheService;

  const businessId = '507f1f77bcf86cd799439011';
  const serviceId = '507f1f77bcf86cd799439012';

  const mockService: ServiceDocument = {
    _id: new Types.ObjectId(serviceId),
    businessId: new Types.ObjectId(businessId),
    name: 'Haircut',
    duration: 30,
    bufferBefore: 5,
    bufferAfter: 5,
    price: 25.0,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as ServiceDocument;

  const mockCreateInput: CreateServiceInput = {
    businessId,
    name: 'Hair Coloring',
    duration: 60,
    bufferBefore: 10,
    bufferAfter: 10,
    price: 50.0,
  };

  const mockServiceRepository = {
    create: jest.fn(),
    findOneById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockCacheService = {
    fetch: jest.fn(),
    invalidateByTag: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: 'IServicesRepository',
          useValue: mockServiceRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    repository = module.get<IServiceRepository>('IServicesRepository');
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(cacheService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new service and invalidate cache', async () => {
      const expectedService = {
        ...mockService,
        name: mockCreateInput.name,
        duration: mockCreateInput.duration,
        price: mockCreateInput.price,
      };

      mockServiceRepository.create.mockResolvedValue(expectedService);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.create(mockCreateInput);

      expect(mockServiceRepository.create).toHaveBeenCalledWith({
        ...mockCreateInput,
        businessId: new Types.ObjectId(businessId),
      });
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(expectedService);
    });

    it('should handle repository creation errors', async () => {
      mockServiceRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(mockCreateInput)).rejects.toThrow(
        'Database error',
      );

      expect(mockServiceRepository.create).toHaveBeenCalledWith({
        ...mockCreateInput,
        businessId: new Types.ObjectId(businessId),
      });
    });
  });

  describe('list', () => {
    it('should return cached list of services for a business', async () => {
      const mockServices = [mockService, { ...mockService, name: 'Massage' }];

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockServiceRepository.findMany.mockResolvedValue(mockServices);

      const result = await service.list(businessId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockServiceRepository.findMany).toHaveBeenCalledWith({
        businessId: new Types.ObjectId(businessId),
      });
      expect(result).toEqual(mockServices);
    });

    it('should return empty array when no services exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockServiceRepository.findMany.mockResolvedValue([]);

      const result = await service.list(businessId);

      expect(result).toEqual([]);
      expect(mockServiceRepository.findMany).toHaveBeenCalledWith({
        businessId: new Types.ObjectId(businessId),
      });
    });

    it('should use cache when available', async () => {
      const cachedServices = [mockService];
      mockCacheService.fetch.mockResolvedValue(cachedServices);

      const result = await service.list(businessId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(result).toEqual(cachedServices);
    });
  });

  describe('getById', () => {
    it('should return cached service by id when it exists', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockServiceRepository.findOneById.mockResolvedValue(mockService);

      const result = await service.getById(businessId, serviceId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockServiceRepository.findOneById).toHaveBeenCalledWith(serviceId);
      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockServiceRepository.findOneById.mockResolvedValue(null);

      await expect(service.getById(businessId, serviceId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById(businessId, serviceId)).rejects.toThrow(
        'Service not found',
      );
    });

    it('should throw NotFoundException when service belongs to different business', async () => {
      const differentBusinessService = {
        ...mockService,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockServiceRepository.findOneById.mockResolvedValue(
        differentBusinessService,
      );

      await expect(service.getById(businessId, serviceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use cache when available', async () => {
      mockCacheService.fetch.mockResolvedValue(mockService);

      const result = await service.getById(businessId, serviceId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockService);
    });
  });

  describe('update', () => {
    const updateDto: UpdateServiceRequestDto = {
      name: 'Updated Service',
      price: 35.0,
    };

    it('should update a service and invalidate cache', async () => {
      const updatedService = { ...mockService, ...updateDto };

      mockServiceRepository.findOneById.mockResolvedValue(mockService);
      mockServiceRepository.update.mockResolvedValue(updatedService);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.update(businessId, serviceId, updateDto);

      expect(mockServiceRepository.findOneById).toHaveBeenCalledWith(
        serviceId,
        'id businessId',
      );
      expect(mockServiceRepository.update).toHaveBeenCalledWith(
        serviceId,
        updateDto,
      );
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(updatedService);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServiceRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(businessId, serviceId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockServiceRepository.update).not.toHaveBeenCalled();
      expect(mockCacheService.invalidateByTag).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when service belongs to different business', async () => {
      const differentBusinessService = {
        ...mockService,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockServiceRepository.findOneById.mockResolvedValue(
        differentBusinessService,
      );

      await expect(
        service.update(businessId, serviceId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockServiceRepository.update).not.toHaveBeenCalled();
    });

    it('should update isActive field', async () => {
      const activeUpdateDto: UpdateServiceRequestDto = { isActive: false };
      const updatedService = { ...mockService, isActive: false };

      mockServiceRepository.findOneById.mockResolvedValue(mockService);
      mockServiceRepository.update.mockResolvedValue(updatedService);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.update(
        businessId,
        serviceId,
        activeUpdateDto,
      );

      expect(mockServiceRepository.update).toHaveBeenCalledWith(
        serviceId,
        activeUpdateDto,
      );
      expect(result?.isActive).toBe(false);
    });

    it('should handle repository update errors', async () => {
      mockServiceRepository.findOneById.mockResolvedValue(mockService);
      mockServiceRepository.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.update(businessId, serviceId, updateDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('delete', () => {
    it('should soft delete a service and invalidate cache', async () => {
      mockServiceRepository.findOneById.mockResolvedValue(mockService);
      mockServiceRepository.softDelete.mockResolvedValue(true);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      await service.delete(businessId, serviceId);

      expect(mockServiceRepository.findOneById).toHaveBeenCalledWith(
        serviceId,
        'id businessId',
      );
      expect(mockServiceRepository.softDelete).toHaveBeenCalledWith(serviceId);
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServiceRepository.findOneById.mockResolvedValue(null);

      await expect(service.delete(businessId, serviceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockServiceRepository.softDelete).not.toHaveBeenCalled();
      expect(mockCacheService.invalidateByTag).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when service belongs to different business', async () => {
      const differentBusinessService = {
        ...mockService,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockServiceRepository.findOneById.mockResolvedValue(
        differentBusinessService,
      );

      await expect(service.delete(businessId, serviceId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockServiceRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should handle repository deletion errors', async () => {
      mockServiceRepository.findOneById.mockResolvedValue(mockService);
      mockServiceRepository.softDelete.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.delete(businessId, serviceId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete service lifecycle', async () => {
      const createdService = mockService;
      const updateDto: UpdateServiceRequestDto = { price: 40.0 };
      const updatedService = { ...mockService, price: 40.0 };

      mockServiceRepository.create.mockResolvedValue(createdService);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockServiceRepository.findOneById.mockResolvedValue(createdService);
      mockServiceRepository.update.mockResolvedValue(updatedService);
      mockServiceRepository.softDelete.mockResolvedValue(true);

      const created = await service.create(mockCreateInput);
      expect(created).toEqual(createdService);

      const found = await service.getById(businessId, serviceId);
      expect(found).toEqual(createdService);

      const updated = await service.update(businessId, serviceId, updateDto);
      expect(updated?.price).toBe(40.0);

      await service.delete(businessId, serviceId);

      expect(mockServiceRepository.create).toHaveBeenCalledTimes(1);
      expect(mockServiceRepository.update).toHaveBeenCalledTimes(1);
      expect(mockServiceRepository.softDelete).toHaveBeenCalledTimes(1);
      expect(mockCacheService.invalidateByTag).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple services for same business', async () => {
      const services = [
        mockService,
        { ...mockService, _id: new Types.ObjectId(), name: 'Massage' },
        { ...mockService, _id: new Types.ObjectId(), name: 'Manicure' },
      ];

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockServiceRepository.findMany.mockResolvedValue(services);

      const result = await service.list(businessId);

      expect(result).toHaveLength(3);
      expect(mockServiceRepository.findMany).toHaveBeenCalledWith({
        businessId: new Types.ObjectId(businessId),
      });
    });
  });
});
