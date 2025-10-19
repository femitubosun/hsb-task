import { RedisService } from '@infra/redis/redis.service';
import { createClient, RedisClientType } from 'redis';
import { BookingLockService } from './booking-lock.service';

describe('BookingLockService Integration Tests', () => {
  let redisClient: RedisClientType;
  let lockService: BookingLockService;
  let redisService: RedisService;

  beforeAll(async () => {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6380'}`,
    });

    await redisClient.connect();

    redisService = {
      instance: redisClient,
    } as RedisService;

    lockService = new BookingLockService(redisService);

    await lockService.onModuleInit();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushAll();
  });

  describe('tryAcquireSlot - Lua Script: atomic-booking-lock', () => {
    it('should successfully acquire an available slot', async () => {
      const result = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      expect(result).toBe(true);

      const bookings = await redisClient.zRangeWithScores(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(bookings[0]?.value).toBe('booking-1');
      expect(bookings[0]?.score).toBe(1000);

      const endTime = await redisClient.hGet('booking_end_times', 'booking-1');
      expect(endTime).toBe('2000');
    });

    it('should prevent double-booking with concurrent requests (race condition test)', async () => {
      const range = {
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      };

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          lockService.tryAcquireSlot({
            ...range,
            bookingId: `booking-${i}`,
          }),
        ),
      );

      const successful = results.filter((r) => r === true);
      expect(successful).toHaveLength(1);

      const count = await redisClient.zCard('bookings:biz-123:2025-01-20');
      expect(count).toBe(1);
    });

    it('should detect overlapping bookings', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1500,
        end: 2500,
        bookingId: 'booking-2',
      });

      expect(result).toBe(false);

      const bookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(bookings).toEqual(['booking-1']);
    });

    it('should allow adjacent bookings (no overlap)', async () => {
      const result1 = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result2 = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 2000,
        end: 3000,
        bookingId: 'booking-2',
      });

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      const count = await redisClient.zCard('bookings:biz-123:2025-01-20');
      expect(count).toBe(2);
    });

    it('should isolate bookings by business ID', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result = await lockService.tryAcquireSlot({
        businessId: 'biz-456',
        date: '2025-01-20',
        start: 1500,
        end: 2500,
        bookingId: 'booking-2',
      });

      expect(result).toBe(true);
    });

    it('should isolate bookings by date', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-21',
        start: 1500,
        end: 2500,
        bookingId: 'booking-2',
      });

      expect(result).toBe(true);
    });
  });

  describe('releaseSlot', () => {
    it('should release a booking slot', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      await lockService.releaseSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        bookingId: 'booking-1',
      });

      const bookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(bookings).toEqual([]);

      const endTime = await redisClient.hGet('booking_end_times', 'booking-1');
      expect(endTime).toBeNull();
    });

    it('should allow re-booking after release', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      await lockService.releaseSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        bookingId: 'booking-1',
      });

      const result = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1500,
        end: 2500,
        bookingId: 'booking-2',
      });

      expect(result).toBe(true);
    });
  });

  describe('getAvailableSlots - Lua Script: get-available-slots', () => {
    it('should return full day when no bookings exist', async () => {
      const dayStart = 0;
      const dayEnd = 8 * 60 * 60 * 1000;

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart,
        dayEnd,
        serviceDuration: 60,
        bufferBefore: 0,
        bufferAfter: 0,
      });

      expect(gaps).toEqual([{ start: dayStart, end: dayEnd, duration: 480 }]);
    });

    it('should compute gaps around existing bookings', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 2 * 60 * 60 * 1000,
        end: baseTime + 3 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 5 * 60 * 60 * 1000,
        end: baseTime + 6 * 60 * 60 * 1000,
        bookingId: 'booking-2',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });

      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 2 * 60 * 60 * 1000, duration: 120 },
        {
          start: baseTime + 3 * 60 * 60 * 1000,
          end: baseTime + 5 * 60 * 60 * 1000,
          duration: 120,
        },
        {
          start: baseTime + 6 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 120,
        },
      ]);
    });

    it('should respect service buffers when computing gaps', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 2 * 60 * 60 * 1000,
        end: baseTime + 3 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 10,
        bufferAfter: 15,
      });

      expect(gaps).toEqual([
        {
          start: baseTime,
          end: baseTime + 2 * 60 * 60 * 1000,
          duration: 120,
        },
        {
          start: baseTime + 3 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 300,
        },
      ]);
    });

    it('should filter out gaps smaller than minimum duration', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 1 * 60 * 60 * 1000,
        end: baseTime + 2 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 2 * 60 * 60 * 1000 + 30 * 60 * 1000,
        end: baseTime + 3 * 60 * 60 * 1000 + 30 * 60 * 1000,
        bookingId: 'booking-2',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 60,
        bufferBefore: 0,
        bufferAfter: 0,
      });

      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 1 * 60 * 60 * 1000, duration: 60 },
        {
          start: baseTime + 3 * 60 * 60 * 1000 + 30 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 270,
        },
      ]);
    });

    it('should exclude specified booking when provided', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 2 * 60 * 60 * 1000,
        end: baseTime + 3 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 5 * 60 * 60 * 1000,
        end: baseTime + 6 * 60 * 60 * 1000,
        bookingId: 'booking-2',
      });

      const gaps = await lockService.getAvailableSlots(
        {
          businessId: 'biz-123',
          date: '2025-01-20',
          dayStart: baseTime,
          dayEnd: baseTime + 8 * 60 * 60 * 1000,
          serviceDuration: 30,
          bufferBefore: 0,
          bufferAfter: 0,
        },
        'booking-1',
      );

      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 5 * 60 * 60 * 1000, duration: 300 },
        {
          start: baseTime + 6 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 120,
        },
      ]);
    });

    it('should handle zero buffers', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 3 * 60 * 60 * 1000,
        end: baseTime + 4 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });

      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 3 * 60 * 60 * 1000, duration: 180 },
        {
          start: baseTime + 4 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 240,
        },
      ]);
    });

    it('should handle large buffers', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 3 * 60 * 60 * 1000,
        end: baseTime + 4 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 30,
        bufferAfter: 45,
      });

      expect(gaps).toEqual([
        {
          start: baseTime,
          end: baseTime + 3 * 60 * 60 * 1000,
          duration: 180,
        },
        {
          start: baseTime + 4 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 240,
        },
      ]);
    });
  });

  describe('atomicRescheduleSwap - Lua Script: atomic-reschedule-swap', () => {
    it('should swap bookings atomically to different date', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'booking-1',
        oldDate: '2025-01-20',
        newDate: '2025-01-21',
        newStart: 3000,
        newEnd: 4000,
      });

      expect(result).toBe(true);

      const oldBookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(oldBookings).toEqual([]);

      const newBookings = await redisClient.zRangeWithScores(
        'bookings:biz-123:2025-01-21',
        0,
        -1,
      );
      expect(newBookings[0]?.value).toBe('booking-1');
      expect(newBookings[0]?.score).toBe(3000);

      const endTime = await redisClient.hGet('booking_end_times', 'booking-1');
      expect(endTime).toBe('4000');
    });

    it('should swap bookings atomically on same date', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      const result = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'booking-1',
        oldDate: '2025-01-20',
        newDate: '2025-01-20',
        newStart: 5000,
        newEnd: 6000,
      });

      expect(result).toBe(true);

      const bookings = await redisClient.zRangeWithScores(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(bookings[0]?.value).toBe('booking-1');
      expect(bookings[0]?.score).toBe(5000);

      const endTime = await redisClient.hGet('booking_end_times', 'booking-1');
      expect(endTime).toBe('6000');
    });

    it('should fail and rollback if new slot conflicts', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-21',
        start: 3000,
        end: 4000,
        bookingId: 'booking-other',
      });

      const result = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'booking-1',
        oldDate: '2025-01-20',
        newDate: '2025-01-21',
        newStart: 3500,
        newEnd: 4500,
      });

      expect(result).toBe(false);

      const oldBookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-20',
        0,
        -1,
      );
      expect(oldBookings).toEqual(['booking-1']);

      const oldEndTime = await redisClient.hGet(
        'booking_end_times',
        'booking-1',
      );
      expect(oldEndTime).toBe('2000');
    });

    it('should fail if old booking does not exist', async () => {
      const result = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'non-existent',
        oldDate: '2025-01-20',
        newDate: '2025-01-21',
        newStart: 3000,
        newEnd: 4000,
      });

      expect(result).toBe(false);

      const newBookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-21',
        0,
        -1,
      );
      expect(newBookings).toEqual([]);
    });

    it('should handle swap with adjacent bookings in new slot', async () => {
      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: 1000,
        end: 2000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-21',
        start: 2000,
        end: 3000,
        bookingId: 'booking-adjacent',
      });

      const result = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'booking-1',
        oldDate: '2025-01-20',
        newDate: '2025-01-21',
        newStart: 1000,
        newEnd: 2000,
      });

      expect(result).toBe(true);

      const bookings = await redisClient.zRange(
        'bookings:biz-123:2025-01-21',
        0,
        -1,
      );
      expect(bookings).toContain('booking-1');
      expect(bookings).toContain('booking-adjacent');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple bookings with various gaps correctly', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 1 * 60 * 60 * 1000,
        end: baseTime + 1.5 * 60 * 60 * 1000,
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 3 * 60 * 60 * 1000,
        end: baseTime + 3.5 * 60 * 60 * 1000,
        bookingId: 'booking-2',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 5 * 60 * 60 * 1000,
        end: baseTime + 6 * 60 * 60 * 1000,
        bookingId: 'booking-3',
      });

      await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 7 * 60 * 60 * 1000,
        end: baseTime + 7.5 * 60 * 60 * 1000,
        bookingId: 'booking-4',
      });

      const gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 10 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });

      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 1 * 60 * 60 * 1000, duration: 60 },
        {
          start: baseTime + 1.5 * 60 * 60 * 1000,
          end: baseTime + 3 * 60 * 60 * 1000,
          duration: 90,
        },
        {
          start: baseTime + 3.5 * 60 * 60 * 1000,
          end: baseTime + 5 * 60 * 60 * 1000,
          duration: 90,
        },
        {
          start: baseTime + 6 * 60 * 60 * 1000,
          end: baseTime + 7 * 60 * 60 * 1000,
          duration: 60,
        },
        {
          start: baseTime + 7.5 * 60 * 60 * 1000,
          end: baseTime + 10 * 60 * 60 * 1000,
          duration: 150,
        },
      ]);
    });

    it('should handle booking lifecycle: create, query, reschedule, release', async () => {
      const baseTime = 9 * 60 * 60 * 1000;

      const created = await lockService.tryAcquireSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        start: baseTime + 2 * 60 * 60 * 1000,
        end: baseTime + 3 * 60 * 60 * 1000,
        bookingId: 'booking-lifecycle',
      });
      expect(created).toBe(true);

      let gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });
      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 2 * 60 * 60 * 1000, duration: 120 },
        {
          start: baseTime + 3 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 300,
        },
      ]);

      const rescheduled = await lockService.atomicRescheduleSwap({
        businessId: 'biz-123',
        oldBookingId: 'booking-lifecycle',
        oldDate: '2025-01-20',
        newDate: '2025-01-20',
        newStart: baseTime + 5 * 60 * 60 * 1000,
        newEnd: baseTime + 6 * 60 * 60 * 1000,
      });
      expect(rescheduled).toBe(true);

      gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });
      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 5 * 60 * 60 * 1000, duration: 300 },
        {
          start: baseTime + 6 * 60 * 60 * 1000,
          end: baseTime + 8 * 60 * 60 * 1000,
          duration: 120,
        },
      ]);

      await lockService.releaseSlot({
        businessId: 'biz-123',
        date: '2025-01-20',
        bookingId: 'booking-lifecycle',
      });

      gaps = await lockService.getAvailableSlots({
        businessId: 'biz-123',
        date: '2025-01-20',
        dayStart: baseTime,
        dayEnd: baseTime + 8 * 60 * 60 * 1000,
        serviceDuration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
      });
      expect(gaps).toEqual([
        { start: baseTime, end: baseTime + 8 * 60 * 60 * 1000, duration: 480 },
      ]);
    });
  });
});
