import { CacheService } from '@/lib/cache/cache.service';
import { FetchInput } from '@/lib/cache/dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateAvailabilityOverrideInput } from '../../common/dtos/create-availability-override';
import { AvailabilityOverrideDocument } from '../../common/entities';
import type { IAvailabilityOverrideRepository } from '../../common/interfaces';
import {
  OverrideType,
  UpdateAvailabilityOverrideRequestDto,
} from '../dtos/request';
import { AvailabilityOverrideService } from './availability-override.service';

describe('AvailabilityOverrideService', () => {
  let service: AvailabilityOverrideService;
  let repository: IAvailabilityOverrideRepository;
  let cacheService: CacheService;

  const businessId = '507f1f77bcf86cd799439011';
  const overrideId = '507f1f77bcf86cd799439012';

  const mockOverride: AvailabilityOverrideDocument = {
    _id: new Types.ObjectId(overrideId),
    businessId: new Types.ObjectId(businessId),
    date: new Date('2025-12-25'),
    type: 'closed',
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as AvailabilityOverrideDocument;

  const mockCreateInput: CreateAvailabilityOverrideInput = {
    businessId,
    date: '2025-12-31',
    type: 'closed',
  };

  const mockRepository = {
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
        AvailabilityOverrideService,
        {
          provide: 'IAvailabilityOverrideRepository',
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AvailabilityOverrideService>(
      AvailabilityOverrideService,
    );
    repository = module.get<IAvailabilityOverrideRepository>(
      'IAvailabilityOverrideRepository',
    );
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(cacheService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new override and invalidate cache', async () => {
      mockRepository.findMany.mockResolvedValue({ items: [], count: 0 });
      mockRepository.create.mockResolvedValue(mockOverride);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.create(mockCreateInput);

      expect(mockRepository.findMany).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        type: mockCreateInput.type,
        startTime: mockCreateInput.startTime,
        endTime: mockCreateInput.endTime,
        priceModifier: mockCreateInput.priceModifier,
        date: new Date(mockCreateInput.date),
        businessId: new Types.ObjectId(businessId),
      });
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(mockOverride);
    });

    it('should throw BadRequestException when override already exists for the same date', async () => {
      const existingOverride = {
        ...mockOverride,
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        date: new Date('2025-12-31'),
      };

      mockRepository.findMany.mockResolvedValueOnce({
        items: [existingOverride],
        count: 1,
      });

      await expect(service.create(mockCreateInput)).rejects.toThrow(
        'An override already exists for',
      );

      expect(mockRepository.findMany).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return cached list of overrides for a business', async () => {
      const mockOverrides = [mockOverride];

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findMany.mockResolvedValue(mockOverrides);

      const result = await service.list(businessId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        businessId: new Types.ObjectId(businessId),
      });
      expect(result).toEqual(mockOverrides);
    });
  });

  describe('getById', () => {
    it('should return cached override by id when it exists', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(mockOverride);

      const result = await service.getById(businessId, overrideId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockRepository.findOneById).toHaveBeenCalledWith(overrideId);
      expect(result).toEqual(mockOverride);
    });

    it('should throw NotFoundException when override does not exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(service.getById(businessId, overrideId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById(businessId, overrideId)).rejects.toThrow(
        'Availability Override not found',
      );
    });

    it('should throw NotFoundException when override belongs to different business', async () => {
      const differentBusinessOverride = {
        ...mockOverride,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(differentBusinessOverride);

      await expect(service.getById(businessId, overrideId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAvailabilityOverrideRequestDto = {
      date: '2025-12-26',
      type: OverrideType.MODIFIED_HOURS,
      startTime: '10:00',
      endTime: '14:00',
    };

    it('should update an override and invalidate cache', async () => {
      const updatedOverride = {
        ...mockOverride,
        type: 'modified_hours',
        startTime: '10:00',
        endTime: '14:00',
      };

      mockRepository.findOneById.mockResolvedValue(mockOverride);
      mockRepository.findMany.mockResolvedValue({ items: [], count: 0 });
      mockRepository.update.mockResolvedValue(updatedOverride);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.update(businessId, overrideId, updateDto);

      expect(mockRepository.findOneById).toHaveBeenCalledWith(overrideId);
      expect(mockRepository.update).toHaveBeenCalledWith(overrideId, {
        type: 'modified_hours',
        startTime: '10:00',
        endTime: '14:00',
        date: new Date('2025-12-26'),
      });
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(updatedOverride);
    });

    it('should throw BadRequestException when updating to a date that already has an override', async () => {
      const conflictingOverride = {
        ...mockOverride,
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        date: new Date('2025-12-26'),
      };

      mockRepository.findOneById.mockResolvedValueOnce(mockOverride);
      mockRepository.findMany.mockResolvedValueOnce({
        items: [conflictingOverride],
        count: 1,
      });

      await expect(
        service.update(businessId, overrideId, updateDto),
      ).rejects.toThrow('An override already exists for');

      expect(mockRepository.findMany).toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when override does not exist', async () => {
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(businessId, overrideId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when override belongs to different business', async () => {
      const differentBusinessOverride = {
        ...mockOverride,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockRepository.findOneById.mockResolvedValue(differentBusinessOverride);

      await expect(
        service.update(businessId, overrideId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete an override and invalidate cache', async () => {
      mockRepository.findOneById.mockResolvedValue(mockOverride);
      mockRepository.softDelete.mockResolvedValue(true);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      await service.delete(businessId, overrideId);

      expect(mockRepository.findOneById).toHaveBeenCalledWith(overrideId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(overrideId);
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
    });

    it('should throw NotFoundException when override does not exist', async () => {
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(service.delete(businessId, overrideId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when override belongs to different business', async () => {
      const differentBusinessOverride = {
        ...mockOverride,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockRepository.findOneById.mockResolvedValue(differentBusinessOverride);

      await expect(service.delete(businessId, overrideId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
