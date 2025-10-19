import { SessionUser } from '@/common/types/auth-session.type';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  BookingDocument,
  BookingStatus,
} from '../../common/entities/booking.entity';
import { BookingService } from '../../common/services/booking.service';
import {
  CreateBookingRequestDto,
  RescheduleBookingRequestDto,
} from '../dtos/request';
import { BookingController } from './booking.controller';

describe('BookingController (Client)', () => {
  let controller: BookingController;

  const clientId = '507f1f77bcf86cd799439011';
  const businessId = '507f1f77bcf86cd799439012';
  const serviceId = '507f1f77bcf86cd799439013';
  const bookingId = '507f1f77bcf86cd799439014';
  const idempotencyKey = '550e8400-e29b-41d4-a716-446655440000';

  const mockUser: SessionUser = {
    _id: clientId,
    email: 'client@example.com',
    name: 'John Doe',
    role: 'client',
  };

  const mockBooking = {
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
    status: BookingStatus.CONFIRMED,
    idempotencyKey,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  } as BookingDocument;

  const mockBookingService = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
  } as jest.Mocked<
    Pick<
      BookingService,
      'create' | 'findById' | 'findAll' | 'cancel' | 'reschedule'
    >
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new booking', async () => {
      const createDto: CreateBookingRequestDto = {
        serviceId,
        startsAt: '2025-01-20T10:00:00Z',
        idempotencyKey,
      };

      mockBookingService.create.mockResolvedValue(mockBooking);

      const result = await controller.create(createDto, mockUser);

      expect(mockBookingService.create).toHaveBeenCalledWith({
        serviceId,
        startsAt: new Date('2025-01-20T10:00:00Z'),
        idempotencyKey,
        clientId,
      });
      expect(result).toEqual(mockBooking);
    });

    it('should convert startsAt string to Date object', async () => {
      const createDto: CreateBookingRequestDto = {
        serviceId,
        startsAt: '2025-01-20T10:00:00Z',
        idempotencyKey,
      };

      mockBookingService.create.mockResolvedValue(mockBooking);

      await controller.create(createDto, mockUser);

      const callArgs = mockBookingService.create.mock.calls[0][0];
      expect(callArgs.startsAt).toBeInstanceOf(Date);
      expect(callArgs.startsAt.toISOString()).toBe('2025-01-20T10:00:00.000Z');
    });

    it('should use authenticated user as clientId', async () => {
      const createDto: CreateBookingRequestDto = {
        serviceId,
        startsAt: '2025-01-20T10:00:00Z',
        idempotencyKey,
      };

      mockBookingService.create.mockResolvedValue(mockBooking);

      await controller.create(createDto, mockUser);

      const callArgs = mockBookingService.create.mock.calls[0][0];
      expect(callArgs.clientId).toBe(mockUser._id);
    });
  });

  describe('list', () => {
    it('should return bookings for authenticated client', async () => {
      const mockBookings = { items: [mockBooking], count: 1 };

      mockBookingService.findAll.mockResolvedValue(mockBookings);

      const result = await controller.list(mockUser);

      expect(mockBookingService.findAll).toHaveBeenCalledWith({
        clientId: mockUser._id,
      });
      expect(result).toEqual(mockBookings);
    });

    it('should return empty array when client has no bookings', async () => {
      mockBookingService.findAll.mockResolvedValue({ items: [], count: 0 });

      const result = await controller.list(mockUser);

      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return a booking by id', async () => {
      mockBookingService.findById.mockResolvedValue(mockBooking);

      const result = await controller.getById(bookingId);

      expect(mockBookingService.findById).toHaveBeenCalledWith(bookingId);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('reschedule', () => {
    it('should reschedule a booking', async () => {
      const rescheduleDto: RescheduleBookingRequestDto = {
        startsAt: '2025-01-21T14:00:00Z',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      };

      const rescheduledBooking = {
        ...mockBooking,
        _id: new Types.ObjectId(),
        startsAt: new Date('2025-01-21T14:00:00Z'),
        rescheduledFrom: mockBooking._id,
      } as BookingDocument;

      mockBookingService.reschedule.mockResolvedValue(rescheduledBooking);

      const result = await controller.reschedule(
        bookingId,
        mockUser,
        rescheduleDto,
      );

      expect(mockBookingService.reschedule).toHaveBeenCalledWith(
        bookingId,
        mockUser._id,
        {
          startsAt: new Date('2025-01-21T14:00:00Z'),
          idempotencyKey: rescheduleDto.idempotencyKey,
        },
      );
      expect(result).toEqual(rescheduledBooking);
    });

    it('should convert startsAt string to Date object', async () => {
      const rescheduleDto: RescheduleBookingRequestDto = {
        startsAt: '2025-01-21T14:00:00Z',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      };

      mockBookingService.reschedule.mockResolvedValue(mockBooking);

      await controller.reschedule(bookingId, mockUser, rescheduleDto);

      const callArgs = mockBookingService.reschedule.mock.calls[0][2];
      expect(callArgs.startsAt).toBeInstanceOf(Date);
    });
  });

  describe('cancel', () => {
    const cancelledBooking = {
      ...mockBooking,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2025-01-18T10:00:00Z'),
    } as BookingDocument;

    it('should cancel a booking', async () => {
      mockBookingService.cancel.mockResolvedValue(cancelledBooking);

      await controller.cancel(bookingId, mockUser);

      expect(mockBookingService.cancel).toHaveBeenCalledWith(
        bookingId,
        mockUser._id,
      );
    });

    it('should not return anything (204 No Content)', async () => {
      mockBookingService.cancel.mockResolvedValue(cancelledBooking);

      const result = await controller.cancel(bookingId, mockUser);

      expect(result).toBe(cancelledBooking);
    });
  });
});
