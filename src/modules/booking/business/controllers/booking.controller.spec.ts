import { SessionUser } from '@/common/types/auth-session.type';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  BookingDocument,
  BookingStatus,
} from '../../common/entities/booking.entity';
import { BookingService } from '../../common/services/booking.service';
import { BookingController } from './booking.controller';

describe('BookingController (Business)', () => {
  let controller: BookingController;

  const clientId = '507f1f77bcf86cd799439011';
  const businessId = '507f1f77bcf86cd799439012';
  const serviceId = '507f1f77bcf86cd799439013';
  const bookingId = '507f1f77bcf86cd799439014';

  const mockBusiness: SessionUser['business'] = {
    _id: businessId,
    name: 'Beauty Salon',
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
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2025-01-15T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
  } as BookingDocument;

  const mockBookingService = {
    findById: jest.fn(),
    findAll: jest.fn(),
  } as jest.Mocked<Pick<BookingService, 'findById' | 'findAll'>>;

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
    // bookingService = module.get<BookingService>(BookingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return all bookings for authenticated business', async () => {
      const mockBookings = {
        items: [
          mockBooking,
          {
            ...mockBooking,
            _id: new Types.ObjectId(),
            clientId: new Types.ObjectId(),
          },
        ],
        count: 2,
      } as {
        items: BookingDocument[];
        count: number;
      };

      mockBookingService.findAll.mockResolvedValue(mockBookings);

      const result = await controller.list(mockBusiness);

      expect(mockBookingService.findAll).toHaveBeenCalledWith({
        businessId: mockBusiness._id,
      });
      expect(result).toEqual(mockBookings);
      expect(result.items).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should return empty array when business has no bookings', async () => {
      mockBookingService.findAll.mockResolvedValue({ items: [], count: 0 });

      const result = await controller.list(mockBusiness);

      expect(result.items).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should only fetch bookings for the authenticated business', async () => {
      const mockBookings = { items: [mockBooking], count: 1 };
      mockBookingService.findAll.mockResolvedValue(mockBookings);

      await controller.list(mockBusiness);

      expect(mockBookingService.findAll).toHaveBeenCalledWith({
        businessId: mockBusiness._id,
      });
      expect(mockBookingService.findAll).toHaveBeenCalledTimes(1);

      const callArgs = mockBookingService.findAll.mock.calls[0][0];
      expect(callArgs.clientId).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should return a booking by id', async () => {
      mockBookingService.findById.mockResolvedValue(mockBooking);

      const result = await controller.getById(bookingId);

      expect(mockBookingService.findById).toHaveBeenCalledWith(bookingId);
      expect(result).toEqual(mockBooking);
    });

    it('should return booking regardless of which business it belongs to', async () => {
      mockBookingService.findById.mockResolvedValue(mockBooking);

      const result = await controller.getById(bookingId);

      expect(result).toBeDefined();
      expect(result).toEqual(mockBooking);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple bookings from different clients', async () => {
      const client1Id = new Types.ObjectId();
      const client2Id = new Types.ObjectId();

      const mockBookings = {
        items: [
          { ...mockBooking, _id: new Types.ObjectId(), clientId: client1Id },
          { ...mockBooking, _id: new Types.ObjectId(), clientId: client2Id },
          { ...mockBooking, _id: new Types.ObjectId(), clientId: client1Id },
        ],
        count: 3,
      } as {
        items: BookingDocument[];
        count: number;
      };

      mockBookingService.findAll.mockResolvedValue(mockBookings);

      const result = await controller.list(mockBusiness);

      expect(result.items).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(mockBookingService.findAll).toHaveBeenCalledWith({
        businessId: mockBusiness._id,
      });
    });

    it('should list and fetch individual booking details', async () => {
      const mockBookings = { items: [mockBooking], count: 1 };

      mockBookingService.findAll.mockResolvedValue(mockBookings);
      mockBookingService.findById.mockResolvedValue(mockBooking);

      const list = await controller.list(mockBusiness);
      expect(list.items).toHaveLength(1);
      expect(list.count).toBe(1);

      const detail = await controller.getById(bookingId);
      expect(detail).toEqual(mockBooking);

      expect(mockBookingService.findAll).toHaveBeenCalledTimes(1);
      expect(mockBookingService.findById).toHaveBeenCalledTimes(1);
    });
  });
});
