import { RedisService } from '@/infra/redis/redis.service';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingIdentifier, BookingRange, SlotQueryParams } from '../dtos';
import { BookingLockService } from './booking-lock.service';

type EvalShaArgs = {
  keys: string[];
  arguments: string[];
};

type ZAddArgs = [string, { score: number; value: string }];

describe('LockService', () => {
  let service: BookingLockService;

  const mockRedisInstance = {
    scriptLoad: jest.fn<Promise<string>, [string]>(),
    evalSha: jest.fn<Promise<number | string | null>, [string, EvalShaArgs]>(),
    zAdd: jest.fn<Promise<string | number>, ZAddArgs>(),
    zRem: jest.fn<Promise<number>, [string, string]>(),
    zScore: jest.fn<Promise<number | null>, [string, string]>(),
    hSet: jest.fn<Promise<number>, [string, string, string]>(),
    hGet: jest.fn<Promise<string | null>, [string, string]>(),
    hDel: jest.fn<Promise<number>, [string, string]>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingLockService,
        {
          provide: RedisService,
          useValue: {
            instance: mockRedisInstance,
          },
        },
      ],
    }).compile();

    service = module.get<BookingLockService>(BookingLockService);

    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should load all Lua scripts into Redis', async () => {
      mockRedisInstance.scriptLoad.mockResolvedValue('sha1hash');

      await service.onModuleInit();

      expect(mockRedisInstance.scriptLoad).toHaveBeenCalledTimes(4);
      expect(mockRedisInstance.scriptLoad).toHaveBeenCalledWith(
        expect.stringContaining('KEYS[1]'),
      );
    });
  });

  describe('tryAcquireSlot', () => {
    const bookingRange: BookingRange = {
      businessId: '507f1f77bcf86cd799439012',
      date: '2025-01-20',
      start: 1737367200000,
      end: 1737370800000,
      bookingId: 'booking-123',
    };

    beforeEach(async () => {
      mockRedisInstance.scriptLoad.mockResolvedValue('lock-script-sha');
      await service.onModuleInit();
    });

    it('should successfully acquire a slot when no conflict exists', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(1);

      const result = await service.tryAcquireSlot(bookingRange);

      expect(result).toBe(true);
      expect(mockRedisInstance.evalSha).toHaveBeenCalledWith(
        'lock-script-sha',
        {
          keys: ['bookings:507f1f77bcf86cd799439012:2025-01-20'],
          arguments: ['1737367200000', '1737370800000', 'booking-123'],
        },
      );
    });

    it('should fail to acquire slot when conflict exists', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(0);

      const result = await service.tryAcquireSlot(bookingRange);

      expect(result).toBe(false);
    });

    it('should use correct Redis key format with businessId', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(1);

      await service.tryAcquireSlot(bookingRange);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.keys[0]).toBe(
        'bookings:507f1f77bcf86cd799439012:2025-01-20',
      );
    });
  });

  describe('releaseSlot', () => {
    const bookingIdentifier: BookingIdentifier = {
      businessId: '507f1f77bcf86cd799439012',
      date: '2025-01-20',
      bookingId: 'booking-123',
    };

    it('should remove booking from Redis sorted set and hash', async () => {
      mockRedisInstance.zRem.mockResolvedValue(1);
      mockRedisInstance.hDel.mockResolvedValue(1);

      await service.releaseSlot(bookingIdentifier);

      expect(mockRedisInstance.zRem).toHaveBeenCalledWith(
        'bookings:507f1f77bcf86cd799439012:2025-01-20',
        'booking-123',
      );
      expect(mockRedisInstance.hDel).toHaveBeenCalledWith(
        'booking_end_times',
        'booking-123',
      );
    });

    it('should execute both Redis operations in parallel', async () => {
      const zRemPromise = Promise.resolve(1);
      const hDelPromise = Promise.resolve(1);

      mockRedisInstance.zRem.mockReturnValue(zRemPromise);
      mockRedisInstance.hDel.mockReturnValue(hDelPromise);

      await service.releaseSlot(bookingIdentifier);

      expect(mockRedisInstance.zRem).toHaveBeenCalled();
      expect(mockRedisInstance.hDel).toHaveBeenCalled();
    });

    it('should only require businessId, date, and bookingId', async () => {
      mockRedisInstance.zRem.mockResolvedValue(1);
      mockRedisInstance.hDel.mockResolvedValue(1);

      await service.releaseSlot({
        businessId: '507f1f77bcf86cd799439012',
        date: '2025-01-20',
        bookingId: 'booking-123',
      });

      expect(mockRedisInstance.zRem).toHaveBeenCalled();
      expect(mockRedisInstance.hDel).toHaveBeenCalled();
    });
  });

  describe('persistBooking', () => {
    const bookingRange: BookingRange = {
      businessId: '507f1f77bcf86cd799439012',
      date: '2025-01-20',
      start: 1737367200000,
      end: 1737370800000,
      bookingId: 'booking-123',
    };

    it('should add booking to Redis sorted set and hash', async () => {
      mockRedisInstance.zAdd.mockResolvedValue('OK');
      mockRedisInstance.hSet.mockResolvedValue(1);

      await service.persistBooking(bookingRange);

      expect(mockRedisInstance.zAdd).toHaveBeenCalledWith(
        'bookings:507f1f77bcf86cd799439012:2025-01-20',
        {
          score: 1737367200000,
          value: 'booking-123',
        },
      );
      expect(mockRedisInstance.hSet).toHaveBeenCalledWith(
        'booking_end_times',
        'booking-123',
        '1737370800000',
      );
    });

    it('should use start time as score in sorted set', async () => {
      mockRedisInstance.zAdd.mockResolvedValue('OK');
      mockRedisInstance.hSet.mockResolvedValue(1);

      await service.persistBooking(bookingRange);

      const zAddCall = mockRedisInstance.zAdd.mock.calls[0];
      expect(zAddCall?.[1]?.score).toBe(bookingRange.start);
    });
  });

  describe('getAvailableSlots', () => {
    const slotQuery: SlotQueryParams = {
      businessId: '507f1f77bcf86cd799439012',
      date: '2025-01-20',
      dayStart: 1737363600000,
      dayEnd: 1737392400000,
      serviceDuration: 60,
      bufferBefore: 10,
      bufferAfter: 5,
    };

    beforeEach(async () => {
      mockRedisInstance.scriptLoad
        .mockResolvedValueOnce('lock-sha')
        .mockResolvedValueOnce('slots-sha')
        .mockResolvedValueOnce('slots-reschedule-sha')
        .mockResolvedValueOnce('reschedule-swap-sha');
      await service.onModuleInit();
    });

    it('should return available slots from Redis', async () => {
      const mockGaps = [
        { start: 1737367200000, end: 1737374400000, duration: 7200000 },
        { start: 1737381600000, end: 1737385200000, duration: 3600000 },
      ];

      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify(mockGaps));

      const result = await service.getAvailableSlots(slotQuery);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        start: 1737367200000,
        end: 1737374400000,
        duration: 120,
      });
      expect(result[1]).toEqual({
        start: 1737381600000,
        end: 1737385200000,
        duration: 60,
      });
    });

    it('should calculate total time needed correctly', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      const totalTimeNeeded = parseInt(callArgs?.arguments[2] ?? '0', 10);

      expect(totalTimeNeeded).toBe((10 + 60 + 5) * 60 * 1000);
    });

    it('should use reschedule script when excludeBookingId is provided', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery, 'booking-to-exclude');

      expect(mockRedisInstance.evalSha).toHaveBeenCalledWith(
        'slots-reschedule-sha',
        expect.any(Object),
      );

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.arguments).toContain('booking-to-exclude');
    });

    it('should use regular script when excludeBookingId is not provided', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery);

      expect(mockRedisInstance.evalSha).toHaveBeenCalledWith(
        'slots-sha',
        expect.any(Object),
      );

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.arguments).not.toContain('booking-to-exclude');
    });

    it('should return empty array when no slots available', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(null);

      const result = await service.getAvailableSlots(slotQuery);

      expect(result).toEqual([]);
    });

    it('should convert duration from milliseconds to minutes', async () => {
      const mockGaps = [
        { start: 1737367200000, end: 1737370800000, duration: 3600000 },
      ];

      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify(mockGaps));

      const result = await service.getAvailableSlots(slotQuery);

      expect(result[0].duration).toBe(60);
    });

    it('should pass epoch milliseconds for dayStart and dayEnd', async () => {
      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.arguments[0]).toBe('1737363600000');
      expect(callArgs?.arguments[1]).toBe('1737392400000');
    });
  });

  describe('atomicRescheduleSwap', () => {
    const rescheduleParams = {
      businessId: '507f1f77bcf86cd799439012',
      oldBookingId: 'booking-123',
      oldDate: '2025-01-20',
      newDate: '2025-01-21',
      newStart: 1737453600000,
      newEnd: 1737457200000,
    };

    beforeEach(async () => {
      mockRedisInstance.scriptLoad
        .mockResolvedValueOnce('lock-sha')
        .mockResolvedValueOnce('slots-sha')
        .mockResolvedValueOnce('slots-reschedule-sha')
        .mockResolvedValueOnce('reschedule-swap-sha');
      await service.onModuleInit();
    });

    it('should fetch old times from Redis and successfully swap booking', async () => {
      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(1737367200000);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue('1737370800000');
      mockRedisInstance.evalSha.mockResolvedValue(1);

      const result = await service.atomicRescheduleSwap(rescheduleParams);

      expect(result).toBe(true);
      expect(mockRedisInstance.zScore).toHaveBeenCalledWith(
        'bookings:507f1f77bcf86cd799439012:2025-01-20',
        'booking-123',
      );
      expect(mockRedisInstance.hGet).toHaveBeenCalledWith(
        'booking_end_times',
        'booking-123',
      );
      expect(mockRedisInstance.evalSha).toHaveBeenCalledWith(
        'reschedule-swap-sha',
        {
          keys: [
            'bookings:507f1f77bcf86cd799439012:2025-01-20',
            'bookings:507f1f77bcf86cd799439012:2025-01-21',
          ],
          arguments: [
            '1737367200000',
            '1737370800000',
            '1737453600000',
            '1737457200000',
            'booking-123',
          ],
        },
      );
    });

    it('should fail when new slot has conflict', async () => {
      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(1737367200000);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue('1737370800000');
      mockRedisInstance.evalSha.mockResolvedValue(0);

      const result = await service.atomicRescheduleSwap(rescheduleParams);

      expect(result).toBe(false);
    });

    it('should handle same-day reschedule', async () => {
      const sameDayParams = {
        ...rescheduleParams,
        newDate: '2025-01-20',
      };

      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(1737367200000);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue('1737370800000');
      mockRedisInstance.evalSha.mockResolvedValue(1);

      await service.atomicRescheduleSwap(sameDayParams);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.keys[0]).toBe(callArgs?.keys[1]);
    });

    it('should use businessId in both old and new keys', async () => {
      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(1737367200000);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue('1737370800000');
      mockRedisInstance.evalSha.mockResolvedValue(1);

      await service.atomicRescheduleSwap(rescheduleParams);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      expect(callArgs?.keys[0]).toContain('507f1f77bcf86cd799439012');
      expect(callArgs?.keys[1]).toContain('507f1f77bcf86cd799439012');
    });

    it('should return false when old booking does not exist in Redis', async () => {
      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(null);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue('1737370800000');

      const result = await service.atomicRescheduleSwap(rescheduleParams);

      expect(result).toBe(false);
      expect(mockRedisInstance.evalSha).not.toHaveBeenCalled();
    });

    it('should return false when old booking end time does not exist', async () => {
      mockRedisInstance.zScore = jest
        .fn<Promise<number | null>, [string, string]>()
        .mockResolvedValue(1737367200000);
      mockRedisInstance.hGet = jest
        .fn<Promise<string | null>, [string, string]>()
        .mockResolvedValue(null);

      const result = await service.atomicRescheduleSwap(rescheduleParams);

      expect(result).toBe(false);
      expect(mockRedisInstance.evalSha).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(async () => {
      mockRedisInstance.scriptLoad.mockResolvedValue('script-sha');
      await service.onModuleInit();
    });

    it('should handle complete booking lifecycle', async () => {
      const bookingRange: BookingRange = {
        businessId: '507f1f77bcf86cd799439012',
        date: '2025-01-20',
        start: 1737367200000,
        end: 1737370800000,
        bookingId: 'booking-123',
      };

      mockRedisInstance.evalSha.mockResolvedValue(1);
      mockRedisInstance.zAdd.mockResolvedValue('OK');
      mockRedisInstance.hSet.mockResolvedValue(1);
      mockRedisInstance.zRem.mockResolvedValue(1);
      mockRedisInstance.hDel.mockResolvedValue(1);

      const acquired = await service.tryAcquireSlot(bookingRange);
      expect(acquired).toBe(true);

      await service.persistBooking(bookingRange);
      expect(mockRedisInstance.zAdd).toHaveBeenCalled();
      expect(mockRedisInstance.hSet).toHaveBeenCalled();

      await service.releaseSlot({
        businessId: bookingRange.businessId,
        date: bookingRange.date,
        bookingId: bookingRange.bookingId,
      });
      expect(mockRedisInstance.zRem).toHaveBeenCalled();
      expect(mockRedisInstance.hDel).toHaveBeenCalled();
    });

    it('should handle failed acquisition gracefully', async () => {
      const bookingRange: BookingRange = {
        businessId: '507f1f77bcf86cd799439012',
        date: '2025-01-20',
        start: 1737367200000,
        end: 1737370800000,
        bookingId: 'booking-123',
      };

      mockRedisInstance.evalSha.mockResolvedValue(0);

      const acquired = await service.tryAcquireSlot(bookingRange);
      expect(acquired).toBe(false);

      expect(mockRedisInstance.zAdd).not.toHaveBeenCalled();
      expect(mockRedisInstance.hSet).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    beforeEach(async () => {
      mockRedisInstance.scriptLoad.mockResolvedValue('script-sha');
      await service.onModuleInit();
    });

    it('should handle zero buffer times', async () => {
      const slotQuery: SlotQueryParams = {
        businessId: '507f1f77bcf86cd799439012',
        date: '2025-01-20',
        dayStart: 1737363600000,
        dayEnd: 1737392400000,
        serviceDuration: 60,
        bufferBefore: 0,
        bufferAfter: 0,
      };

      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      const totalTimeNeeded = parseInt(callArgs?.arguments[2] ?? '0', 10);

      expect(totalTimeNeeded).toBe(60 * 60 * 1000);
    });

    it('should handle large buffer times', async () => {
      const slotQuery: SlotQueryParams = {
        businessId: '507f1f77bcf86cd799439012',
        date: '2025-01-20',
        dayStart: 1737363600000,
        dayEnd: 1737392400000,
        serviceDuration: 60,
        bufferBefore: 30,
        bufferAfter: 30,
      };

      mockRedisInstance.evalSha.mockResolvedValue(JSON.stringify([]));

      await service.getAvailableSlots(slotQuery);

      const callArgs = mockRedisInstance.evalSha.mock.calls[0]?.[1];
      const totalTimeNeeded = parseInt(callArgs?.arguments[2] ?? '0', 10);

      expect(totalTimeNeeded).toBe(120 * 60 * 1000);
    });
  });
});
