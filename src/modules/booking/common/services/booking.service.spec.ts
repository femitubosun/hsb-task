import { CacheService } from '@/lib/cache/cache.service';
import { FetchInput } from '@/lib/cache/dto';
import { AvailabilityValidationService } from '@/modules/availability/common/services/availability-validation.service';
import { ServiceDocument } from '@/modules/services/common/entities/service.entity';
import { ServicesService } from '@/modules/services/common/services/services.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateBookingInput, RescheduleBookingInput } from '../dtos';
import {
  type BookingDocument,
  BookingStatus,
} from '../entities/booking.entity';
import type { IBookingRepository } from '../interfaces/booking-repository.interface';
import { BookingLockService } from './booking-lock.service';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let repository: IBookingRepository;
  let cacheService: CacheService;
  let servicesService: ServicesService;

  const clientId = '507f1f77bcf86cd799439011';
  const businessId = '507f1f77bcf86cd799439012';
  const serviceId = '507f1f77bcf86cd799439013';
  const bookingId = '507f1f77bcf86cd799439014';
  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

  const mockServiceData = {
    _id: new Types.ObjectId(serviceId),
    businessId: new Types.ObjectId(businessId),
    name: 'Haircut',
    duration: 60,
    bufferBefore: 10,
    bufferAfter: 5,
    price: 50.0,
    isActive: true,
  };

  const mockBooking: BookingDocument = {
    _id: new Types.ObjectId(bookingId),
    clientId: new Types.ObjectId(clientId),
    businessId: new Types.ObjectId(businessId),
    serviceId: new Types.ObjectId(serviceId),
    startsAt: new Date('2025-01-20T10:00:00Z'),
    endsAt: new Date('2025-01-20T11:15:00Z'),
    duration: 60,
    bufferBefore: 10,
    bufferAfter: 5,
    priceAtBooking: 50.0,
    cancellationFee: 0,
    refundAmount: 0,
    refundedAt: null,
    status: BookingStatus.CONFIRMED,
    cancelledAt: null,
    cancellationReason: null,
    completedAt: null,
    idempotencyKey,
    rescheduledFrom: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    deletedAt: null,
  } as unknown as BookingDocument;

  const mockCreateInput: CreateBookingInput = {
    clientId,
    serviceId,
    startsAt: new Date('2025-01-20T10:00:00Z'),
    idempotencyKey,
  };

  const mockBookingRepository = {
    create: jest.fn(),
    findOneById: jest.fn(),
    findOneByCondition: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as jest.Mocked<
    Pick<
      IBookingRepository,
      | 'create'
      | 'findOneById'
      | 'findOneByCondition'
      | 'findMany'
      | 'update'
      | 'softDelete'
    >
  >;

  const mockCacheService = {
    fetch: jest.fn(),
    invalidateByTag: jest.fn(),
  } as jest.Mocked<Pick<CacheService, 'fetch' | 'invalidateByTag'>>;

  const mockServicesService = {
    findOneById: jest.fn(),
  } as jest.Mocked<Pick<ServicesService, 'findOneById'>>;

  const mockBookingLockService = {
    tryAcquireSlot: jest.fn(),
    releaseSlot: jest.fn(),
    atomicRescheduleSwap: jest.fn(),
  };

  const mockAvailabilityValidationService = {
    validateBookingTime: jest.fn(),
    getEffectiveHoursForDate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: 'IBookingRepository',
          useValue: mockBookingRepository,
        },
        {
          provide: AvailabilityValidationService,
          useValue: mockAvailabilityValidationService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
        {
          provide: BookingLockService,
          useValue: mockBookingLockService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    repository = module.get<IBookingRepository>('IBookingRepository');
    cacheService = module.get<CacheService>(CacheService);
    servicesService = module.get<ServicesService>(ServicesService);

    jest.clearAllMocks();
    mockBookingLockService.tryAcquireSlot.mockReset();
    mockBookingLockService.releaseSlot.mockReset();
    mockBookingLockService.atomicRescheduleSwap.mockReset();
    mockAvailabilityValidationService.validateBookingTime.mockReset();
    mockAvailabilityValidationService.getEffectiveHoursForDate.mockReset();

    mockAvailabilityValidationService.validateBookingTime.mockResolvedValue(
      undefined,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(cacheService).toBeDefined();
    expect(servicesService).toBeDefined();
  });

  describe('create', () => {
    it('should create a new booking and invalidate cache', async () => {
      mockServicesService.findOneById.mockResolvedValue(
        mockServiceData as ServiceDocument,
      );
      mockBookingRepository.findOneByCondition.mockResolvedValue(null);
      mockBookingLockService.tryAcquireSlot.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValue(mockBooking);
      mockBookingRepository.findOneById.mockResolvedValue(mockBooking);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.create(mockCreateInput);

      expect(mockServicesService.findOneById).toHaveBeenCalledWith(serviceId);
      expect(mockBookingRepository.findOneByCondition).toHaveBeenCalledWith(
        {
          idempotencyKey,
        },
        undefined,
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      expect(mockBookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: new Types.ObjectId(clientId),
          businessId: new Types.ObjectId(businessId),
          serviceId: new Types.ObjectId(serviceId),
          duration: 60,
          bufferBefore: 10,
          bufferAfter: 5,
          priceAtBooking: 50.0,
          status: BookingStatus.CONFIRMED,
          idempotencyKey,
        }),
      );
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });

    it('should calculate endsAt correctly including buffers', async () => {
      mockServicesService.findOneById.mockResolvedValue(
        mockServiceData as ServiceDocument,
      );
      mockBookingRepository.findOneByCondition.mockResolvedValue(null);
      mockBookingLockService.tryAcquireSlot.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValue(mockBooking);
      mockBookingRepository.findOneById.mockResolvedValue(mockBooking);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      await service.create(mockCreateInput);

      const createCall = mockBookingRepository.create.mock.calls[0][0];
      expect(createCall.startsAt).toEqual(new Date('2025-01-20T10:00:00Z'));
      expect(createCall.endsAt).toBeDefined();
      expect(createCall.startsAt).toBeDefined();

      const duration =
        (createCall.endsAt!.getTime() - createCall.startsAt!.getTime()) /
        (60 * 1000);
      expect(duration).toBe(65);
      expect(createCall.duration).toBe(60);
      expect(createCall.bufferBefore).toBe(10);
      expect(createCall.bufferAfter).toBe(5);
    });

    it('should throw NotFoundException when service does not exist', async () => {
      mockServicesService.findOneById.mockRejectedValue(
        new NotFoundException('Service not found'),
      );

      await expect(service.create(mockCreateInput)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockBookingRepository.create).not.toHaveBeenCalled();
      expect(mockCacheService.invalidateByTag).not.toHaveBeenCalled();
    });

    it('should handle repository creation errors', async () => {
      mockServicesService.findOneById.mockResolvedValue(
        mockServiceData as ServiceDocument,
      );
      mockBookingRepository.findOneByCondition.mockResolvedValue(null);
      mockBookingLockService.tryAcquireSlot.mockResolvedValue(true);
      mockBookingRepository.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(mockCreateInput)).rejects.toThrow(
        'Database error',
      );

      expect(mockBookingLockService.releaseSlot).toHaveBeenCalled();
    });

    it('should return existing booking when idempotency key already exists', async () => {
      mockServicesService.findOneById.mockResolvedValue(
        mockServiceData as ServiceDocument,
      );
      mockBookingRepository.findOneByCondition.mockResolvedValue(mockBooking);

      const result = await service.create(mockCreateInput);

      expect(mockServicesService.findOneById).toHaveBeenCalledWith(serviceId);
      expect(mockBookingRepository.findOneByCondition).toHaveBeenCalledWith(
        {
          idempotencyKey,
        },
        undefined,
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      expect(mockBookingRepository.create).not.toHaveBeenCalled();
      expect(mockCacheService.invalidateByTag).not.toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findById', () => {
    it('should return cached booking by id when it exists', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findOneById.mockResolvedValue(mockBooking);

      const result = await service.findById(bookingId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockBookingRepository.findOneById).toHaveBeenCalledWith(
        bookingId,
        undefined,
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findOneById.mockResolvedValue(null);

      await expect(service.findById(bookingId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(bookingId)).rejects.toThrow(
        'Booking not found',
      );
    });

    it('should use cache when available', async () => {
      mockCacheService.fetch.mockResolvedValue(mockBooking);

      const result = await service.findById(bookingId);

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findAll', () => {
    it('should return bookings filtered by clientId', async () => {
      const mockBookings = { items: [mockBooking], count: 1 };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findMany.mockResolvedValue(mockBookings);

      const result = await service.findAll({ clientId });

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockBookingRepository.findMany).toHaveBeenCalledWith(
        {
          clientId: new Types.ObjectId(clientId),
        },
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      expect(result).toEqual(mockBookings);
      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should return bookings filtered by businessId', async () => {
      const mockBookings = { items: [mockBooking], count: 1 };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findMany.mockResolvedValue(mockBookings);

      const result = await service.findAll({ businessId });

      expect(mockCacheService.fetch).toHaveBeenCalled();
      expect(mockBookingRepository.findMany).toHaveBeenCalledWith(
        {
          businessId: new Types.ObjectId(businessId),
        },
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      expect(result).toEqual(mockBookings);
      expect(result.items).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should return empty array when no bookings exist', async () => {
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findMany.mockResolvedValue({ items: [], count: 0 });

      const result = await service.findAll({ clientId });

      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should cancel a booking and invalidate cache', async () => {
      const cancelledAt = new Date('2025-01-16T10:00:00Z');
      const cancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt,
      } as BookingDocument;

      mockBookingRepository.findOneById
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(cancelledBooking);
      mockBookingRepository.update.mockResolvedValue(cancelledBooking);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.cancel(bookingId, clientId);

      expect(mockBookingRepository.findOneById).toHaveBeenCalledWith(bookingId);

      const updateCall = mockBookingRepository.update.mock.calls[0][1];
      expect(updateCall.status).toBe(BookingStatus.CANCELLED);
      expect(updateCall.cancelledAt).toBeInstanceOf(Date);

      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
      expect(result).toEqual(cancelledBooking);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockBookingRepository.findOneById.mockResolvedValue(null);

      await expect(service.cancel(bookingId, clientId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking belongs to different client', async () => {
      const differentClientBooking = {
        ...mockBooking,
        clientId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      } as BookingDocument;

      mockBookingRepository.findOneById.mockResolvedValue(
        differentClientBooking,
      );

      await expect(service.cancel(bookingId, clientId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('reschedule', () => {
    const rescheduleInput: RescheduleBookingInput = {
      startsAt: new Date('2025-01-21T14:00:00Z'),
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
    };

    it('should create new booking and cancel old one', async () => {
      const newBooking = {
        ...mockBooking,
        _id: new Types.ObjectId(),
        startsAt: rescheduleInput.startsAt,
        idempotencyKey: rescheduleInput.idempotencyKey,
        rescheduledFrom: mockBooking._id,
      };

      mockBookingRepository.findOneById
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(newBooking as BookingDocument);
      mockBookingLockService.atomicRescheduleSwap.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValue(
        newBooking as BookingDocument,
      );
      mockBookingRepository.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      } as BookingDocument);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      const result = await service.reschedule(
        bookingId,
        clientId,
        rescheduleInput,
      );

      expect(mockBookingRepository.findOneById).toHaveBeenCalledWith(bookingId);
      expect(mockBookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startsAt: rescheduleInput.startsAt,
          idempotencyKey: rescheduleInput.idempotencyKey,
          rescheduledFrom: mockBooking._id,
        }),
      );
      const updateCall = mockBookingRepository.update.mock.calls[0][1];
      expect(updateCall.status).toBe(BookingStatus.CANCELLED);
      expect(updateCall.cancelledAt).toBeInstanceOf(Date);
      expect(updateCall.cancellationReason).toBe('rescheduled');
      expect(result).toEqual(newBooking);
    });

    it('should preserve service details in rescheduled booking', async () => {
      const newBooking = {
        ...mockBooking,
        _id: new Types.ObjectId(),
        startsAt: rescheduleInput.startsAt,
      } as BookingDocument;

      mockBookingRepository.findOneById.mockResolvedValue(mockBooking);
      mockBookingLockService.atomicRescheduleSwap.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValue(newBooking);
      mockBookingRepository.update.mockResolvedValue(mockBooking);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);

      await service.reschedule(bookingId, clientId, rescheduleInput);

      expect(mockBookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: mockBooking.duration,
          bufferBefore: mockBooking.bufferBefore,
          bufferAfter: mockBooking.bufferAfter,
          priceAtBooking: mockBooking.priceAtBooking,
        }),
      );
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockBookingRepository.findOneById.mockResolvedValue(null);

      await expect(
        service.reschedule(bookingId, clientId, rescheduleInput),
      ).rejects.toThrow(NotFoundException);

      expect(mockBookingRepository.create).not.toHaveBeenCalled();
      expect(mockBookingRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking belongs to different client', async () => {
      const differentClientBooking = {
        ...mockBooking,
        clientId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      };

      mockBookingRepository.findOneById.mockResolvedValue(
        differentClientBooking as BookingDocument,
      );

      await expect(
        service.reschedule(bookingId, clientId, rescheduleInput),
      ).rejects.toThrow(NotFoundException);

      expect(mockBookingRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete booking lifecycle', async () => {
      const rescheduleInput: RescheduleBookingInput = {
        startsAt: new Date('2025-01-21T14:00:00Z'),
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockServicesService.findOneById.mockResolvedValue(
        mockServiceData as ServiceDocument,
      );
      mockBookingRepository.findOneByCondition.mockResolvedValue(null);
      mockBookingLockService.tryAcquireSlot.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValueOnce(mockBooking);
      mockCacheService.invalidateByTag.mockResolvedValue(undefined);
      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );

      const newBooking = { ...mockBooking, _id: new Types.ObjectId() };

      mockBookingRepository.findOneById
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(newBooking as BookingDocument);

      const created = await service.create(mockCreateInput);
      expect(created).toEqual(mockBooking);

      const found = await service.findById(bookingId);
      expect(found).toEqual(mockBooking);

      mockBookingLockService.atomicRescheduleSwap.mockResolvedValue(true);
      mockBookingRepository.create.mockResolvedValueOnce(
        newBooking as BookingDocument,
      );
      mockBookingRepository.update.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      } as BookingDocument);

      const rescheduled = await service.reschedule(
        bookingId,
        clientId,
        rescheduleInput,
      );
      expect(rescheduled).toEqual(newBooking);

      expect(mockBookingRepository.create).toHaveBeenCalledTimes(2);
      expect(mockCacheService.invalidateByTag).toHaveBeenCalled();
    });

    it('should handle multiple bookings for same client', async () => {
      const bookings = {
        items: [
          mockBooking,
          {
            ...mockBooking,
            _id: new Types.ObjectId(),
            startsAt: new Date('2025-01-21T10:00:00Z'),
          },
          {
            ...mockBooking,
            _id: new Types.ObjectId(),
            startsAt: new Date('2025-01-22T10:00:00Z'),
          },
        ],
        count: 3,
      } as {
        items: BookingDocument[];
        count: number;
      };

      mockCacheService.fetch.mockImplementation(
        async <T>({ resolver }: FetchInput<T>) => resolver(),
      );
      mockBookingRepository.findMany.mockResolvedValue(bookings);

      const result = await service.findAll({ clientId });

      expect(result.items).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(mockBookingRepository.findMany).toHaveBeenCalledWith(
        {
          clientId: new Types.ObjectId(clientId),
        },
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
    });
  });
});
