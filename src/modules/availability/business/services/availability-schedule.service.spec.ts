import { CacheService } from '@/lib/cache/cache.service';
import { FetchInput } from '@/lib/cache/dto';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateAvailabilityScheduleInput } from '../../common/dtos/create-availability-schedule';
import { AvailabilityScheduleDocument } from '../../common/entities';
import type { IAvailabilityScheduleRepository } from '../../common/interfaces';
import { UpdateAvailabilityScheduleRequestDto } from '../dtos/request';
import { AvailabilityScheduleService } from './availability-schedule.service';

describe('AvailabilityScheduleService', () => {
  let service: AvailabilityScheduleService;
  let repository: IAvailabilityScheduleRepository;
  let cacheService: CacheService;

  const businessId = '507f1f77bcf86cd799439011';
  const scheduleId = '507f1f77bcf86cd799439012';

  const mockSchedule: AvailabilityScheduleDocument = {
    _id: new Types.ObjectId(scheduleId),
    businessId: new Types.ObjectId(businessId),
    daysOfWeek: ['monday', 'tuesday', 'wednesday'],
    startTime: '09:00',
    endTime: '17:00',
    effectiveFrom: new Date('2025-01-01'),
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as unknown as AvailabilityScheduleDocument;

  const mockCreateInput: CreateAvailabilityScheduleInput = {
    businessId,
    daysOfWeek: ['monday', 'wednesday', 'friday'],
    startTime: '10:00',
    endTime: '18:00',
    effectiveFrom: '2025-02-01T00:00:00.000Z',
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
        AvailabilityScheduleService,
        {
          provide: 'IAvailabilityScheduleRepository',
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AvailabilityScheduleService>(
      AvailabilityScheduleService,
    );
    repository = module.get<IAvailabilityScheduleRepository>(
      'IAvailabilityScheduleRepository',
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
    it('should create a new schedule and invalidate cache', async () => {
      mockRepository.findMany.mockResolvedValue({ items: [], count: 0 });
      mockRepository.create.mockResolvedValue(mockSchedule);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.create(mockCreateInput);

      expect(mockRepository.findMany).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        daysOfWeek: mockCreateInput.daysOfWeek,
        startTime: mockCreateInput.startTime,
        endTime: mockCreateInput.endTime,
        effectiveFrom: new Date(mockCreateInput.effectiveFrom),
        businessId: new Types.ObjectId(businessId),
      });
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(mockSchedule);
    });

    it('should throw BadRequestException when overlapping schedule exists', async () => {
      const overlappingSchedule = {
        ...mockSchedule,
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        daysOfWeek: ['monday', 'wednesday'],
        effectiveFrom: new Date('2025-01-15'),
        effectiveUntil: new Date('2025-03-01'),
      };

      mockRepository.findMany.mockResolvedValue({
        items: [overlappingSchedule],
        count: 1,
      });

      await expect(service.create(mockCreateInput)).rejects.toThrow(
        'An active schedule already exists for',
      );
    });

    it('should throw BadRequestException when effectiveUntil is before effectiveFrom', async () => {
      const invalidInput = {
        ...mockCreateInput,
        effectiveFrom: '2025-12-31',
        effectiveUntil: '2025-01-01',
      };

      await expect(service.create(invalidInput)).rejects.toThrow(
        'effectiveUntil must be after effectiveFrom',
      );
    });
  });

  describe('list', () => {
    it('should return cached list of schedules for a business', async () => {
      const mockSchedules = [mockSchedule];

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findMany.mockResolvedValue(mockSchedules);

      const result = await service.list(businessId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        businessId: new Types.ObjectId(businessId),
      });
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('getById', () => {
    it('should return cached schedule by id when it exists', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(mockSchedule);

      const result = await service.getById(businessId, scheduleId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockRepository.findOneById).toHaveBeenCalledWith(scheduleId);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(service.getById(businessId, scheduleId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById(businessId, scheduleId)).rejects.toThrow(
        'Availability Schedule not found',
      );
    });

    it('should throw NotFoundException when schedule belongs to different business', async () => {
      const differentBusinessSchedule = {
        ...mockSchedule,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => {
          return resolver();
        },
      );
      mockRepository.findOneById.mockResolvedValue(differentBusinessSchedule);

      await expect(service.getById(businessId, scheduleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAvailabilityScheduleRequestDto = {
      daysOfWeek: ['thursday', 'friday'],
      startTime: '08:00',
      endTime: '16:00',
      effectiveFrom: '2025-03-01',
    };

    it('should update a schedule and invalidate cache', async () => {
      const updatedSchedule = {
        ...mockSchedule,
        daysOfWeek: ['thursday', 'friday'],
        startTime: '08:00',
        endTime: '16:00',
      };

      mockRepository.findOneById.mockResolvedValue(mockSchedule);
      mockRepository.findMany.mockResolvedValue({ items: [], count: 0 });
      mockRepository.update.mockResolvedValue(updatedSchedule);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.update(businessId, scheduleId, updateDto);

      expect(mockRepository.findOneById).toHaveBeenCalledWith(scheduleId);
      expect(mockRepository.update).toHaveBeenCalledWith(scheduleId, {
        daysOfWeek: ['thursday', 'friday'],
        startTime: '08:00',
        endTime: '16:00',
        effectiveFrom: new Date('2025-03-01'),
      });
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(updatedSchedule);
    });

    it('should throw BadRequestException when update creates overlap', async () => {
      const overlappingSchedule = {
        ...mockSchedule,
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        daysOfWeek: ['thursday', 'friday'],
        effectiveFrom: new Date('2025-02-01'),
        effectiveUntil: new Date('2025-04-01'),
      };

      mockRepository.findOneById.mockResolvedValue(mockSchedule);
      mockRepository.findMany.mockResolvedValue({
        items: [overlappingSchedule],
        count: 1,
      });

      await expect(
        service.update(businessId, scheduleId, updateDto),
      ).rejects.toThrow('An active schedule already exists for');
    });

    it('should throw BadRequestException when update makes effectiveUntil before effectiveFrom', async () => {
      const invalidUpdateDto = {
        effectiveFrom: '2025-12-31',
        effectiveUntil: '2025-01-01',
      };

      mockRepository.findOneById.mockResolvedValue(mockSchedule);

      await expect(
        service.update(businessId, scheduleId, invalidUpdateDto),
      ).rejects.toThrow('effectiveUntil must be after effectiveFrom');
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.update(businessId, scheduleId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when schedule belongs to different business', async () => {
      const differentBusinessSchedule = {
        ...mockSchedule,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockRepository.findOneById.mockResolvedValue(differentBusinessSchedule);

      await expect(
        service.update(businessId, scheduleId, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete a schedule and invalidate cache', async () => {
      mockRepository.findOneById.mockResolvedValue(mockSchedule);
      mockRepository.softDelete.mockResolvedValue(true);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      await service.delete(businessId, scheduleId);

      expect(mockRepository.findOneById).toHaveBeenCalledWith(scheduleId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(scheduleId);
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      mockRepository.findOneById.mockResolvedValue(null);

      await expect(service.delete(businessId, scheduleId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when schedule belongs to different business', async () => {
      const differentBusinessSchedule = {
        ...mockSchedule,
        businessId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockRepository.findOneById.mockResolvedValue(differentBusinessSchedule);

      await expect(service.delete(businessId, scheduleId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
