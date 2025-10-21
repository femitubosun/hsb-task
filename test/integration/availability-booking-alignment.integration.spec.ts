import { RedisService } from '@/infra/redis/redis.service';
import { AvailabilitySearchService } from '@/modules/availability/client/services/availability-search.service';
import { AvailabilityValidationService } from '@/modules/availability/common/services/availability-validation.service';
import { BookingLockService } from '@/modules/booking/common/services/booking-lock.service';
import { BookingService } from '@/modules/booking/common/services/booking.service';
import * as crypto from 'crypto';
import { connect, Connection, Types } from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { TestDataFactory } from '../helpers/test-data-factory';
import { TimeHelpers } from '../helpers/time-helpers';

describe('Availability-Booking Alignment Integration Tests', () => {
  let mongoConnection: Connection;
  let redisClient: RedisClientType;
  let redisService: RedisService;
  let lockService: BookingLockService;
  let bookingService: BookingService;
  let searchService: AvailabilitySearchService;
  let validationService: AvailabilityValidationService;

  let businessId: string;
  let serviceId: string;
  let clientId: string;
  let scheduleId: string;

  let businessModel: any;
  let serviceModel: any;
  let scheduleModel: any;
  let bookingModel: any;
  let overrideModel: any;
  let userModel: any;

  beforeAll(async () => {
    const uri =
      process.env.MONGODB_URI ||
      'mongodb://admin:test123@localhost:27018/hsb-test?authSource=admin';
    mongoConnection = (await connect(uri)).connection;

    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6380'}`,
    });
    await redisClient.connect();

    redisService = { instance: redisClient } as RedisService;
    lockService = new BookingLockService(redisService);
    await lockService.onModuleInit();

    businessModel = mongoConnection.model(
      'Business',
      new mongoConnection.base.Schema({
        userId: { type: Types.ObjectId, ref: 'User' },
        name: String,
        bannerUrl: String,
        profileImgUrl: String,
      }),
    );

    userModel = mongoConnection.model(
      'User',
      new mongoConnection.base.Schema({
        email: String,
        password: String,
      }),
    );

    serviceModel = mongoConnection.model(
      'Service',
      new mongoConnection.base.Schema({
        businessId: { type: Types.ObjectId, ref: 'Business' },
        name: String,
        duration: Number,
        bufferBefore: Number,
        bufferAfter: Number,
        price: Number,
        isActive: Boolean,
      }),
    );

    scheduleModel = mongoConnection.model(
      'AvailabilitySchedule',
      new mongoConnection.base.Schema({
        businessId: { type: Types.ObjectId, ref: 'Business' },
        daysOfWeek: [String],
        startTime: String,
        endTime: String,
        effectiveFrom: Date,
        effectiveUntil: Date,
        isActive: Boolean,
      }),
    );

    overrideModel = mongoConnection.model(
      'AvailabilityOverride',
      new mongoConnection.base.Schema({
        businessId: { type: Types.ObjectId, ref: 'Business' },
        date: Date,
        type: String,
        startTime: String,
        endTime: String,
        isActive: Boolean,
      }),
    );

    bookingModel = mongoConnection.model(
      'Booking',
      new mongoConnection.base.Schema(
        {
          clientId: { type: Types.ObjectId, ref: 'User' },
          businessId: { type: Types.ObjectId, ref: 'Business' },
          serviceId: { type: Types.ObjectId, ref: 'Service' },
          startsAt: Date,
          endsAt: Date,
          duration: Number,
          bufferBefore: Number,
          bufferAfter: Number,
          priceAtBooking: Number,
          status: String,
          idempotencyKey: String,
          cancellationFee: { type: Number, default: 0 },
          refundAmount: { type: Number, default: 0 },
          rescheduledFrom: {
            type: Types.ObjectId,
            ref: 'Booking',
            default: null,
          },
        },
        { timestamps: true },
      ),
    );

    const scheduleRepo = {
      findOneByCondition: async (condition: any) => {
        return await scheduleModel.findOne(condition).lean().exec();
      },
    };

    const overrideRepo = {
      findOneByCondition: async (condition: any) => {
        return await overrideModel.findOne(condition).lean().exec();
      },
      findMany: async (condition: any) => {
        const items = await overrideModel.find(condition).lean().exec();
        return { items, count: items.length };
      },
    };

    validationService = new AvailabilityValidationService(
      scheduleRepo as any,
      overrideRepo as any,
    );

    const serviceRepo = {
      findOneById: async (id: string) => {
        return await serviceModel.findById(id).lean().exec();
      },
    };

    const cacheService = {
      fetch: async ({ resolver }: any) => resolver(),
      invalidate: async () => {},
      invalidateByTag: async () => {},
    } as any;

    searchService = new AvailabilitySearchService(
      scheduleRepo as any,
      overrideRepo as any,
      serviceRepo as any,
      validationService,
      lockService,
      cacheService,
    );

    const bookingRepo = {
      findOneByCondition: async (condition: any, select: any, options: any) => {
        let query = bookingModel.findOne(condition);
        if (select) query = query.select(select);
        if (options?.populate) {
          for (const pop of options.populate) {
            query = query.populate(pop);
          }
        }
        return await query.lean().exec();
      },
      create: async (data: any) => {
        const doc = new bookingModel(data);
        return await doc.save();
      },
      findById: async (id: string, options: any) => {
        let query = bookingModel.findById(id);
        if (options?.populate) {
          for (const pop of options.populate) {
            query = query.populate(pop);
          }
        }
        return await query.lean().exec();
      },
      findOneById: async (id: string, options: any) => {
        let query = bookingModel.findById(id);
        if (options?.populate) {
          for (const pop of options.populate) {
            query = query.populate(pop);
          }
        }
        return await query.lean().exec();
      },
      updateById: async (id: string, update: any) => {
        return await bookingModel
          .findByIdAndUpdate(id, update, { new: true })
          .lean()
          .exec();
      },
    };

    const servicesService = {
      findOneById: async (id: string) => {
        return await serviceModel.findById(id).lean().exec();
      },
    } as any;

    const queueService = {
      addToQueue: async () => {},
      enqueueJob: async () => {},
    } as any;

    const outboxService = {
      createEvent: async () => ({ _id: new Types.ObjectId() }),
    } as any;

    bookingService = new BookingService(
      bookingRepo as any,
      validationService,
      cacheService,
      servicesService,
      lockService,
      queueService,
      outboxService,
    );
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await redisClient.flushAll();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushAll();

    await Promise.all([
      businessModel.deleteMany({}),
      userModel.deleteMany({}),
      serviceModel.deleteMany({}),
      scheduleModel.deleteMany({}),
      overrideModel.deleteMany({}),
      bookingModel.deleteMany({}),
    ]);

    const user = await userModel.create(TestDataFactory.createUser());
    const business = await businessModel.create(
      TestDataFactory.createBusiness({ userId: user._id }),
    );
    const service = await serviceModel.create(
      TestDataFactory.createService(business._id, {
        duration: 45,
        bufferBefore: 10,
        bufferAfter: 10,
      }),
    );
    const schedule = await scheduleModel.create(
      TestDataFactory.createSchedule(business._id, {
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startTime: '09:00',
        endTime: '17:00',
      }),
    );

    businessId = business._id.toString();
    serviceId = service._id.toString();
    clientId = user._id.toString();
    scheduleId = schedule._id.toString();
  });

  describe('Search Then Book - Buffer Adjustment Tests', () => {
    it('should allow booking at first time shown in search results after existing booking (Bug 4)', async () => {
      const testDate = '2025-10-21';
      const existingBookingStart = TimeHelpers.utcDate(2025, 10, 21, 9, 0);
      const existingBookingEnd = TimeHelpers.addMinutes(
        existingBookingStart,
        45,
      );

      const existingBookingStartWithBuffer = TimeHelpers.addMinutes(
        existingBookingStart,
        -10,
      );
      const existingBookingEndWithBuffer = TimeHelpers.addMinutes(
        existingBookingEnd,
        10,
      );

      await lockService.tryAcquireSlot({
        businessId,
        date: testDate,
        start: existingBookingStartWithBuffer.getTime(),
        end: existingBookingEndWithBuffer.getTime(),
        bookingId: 'existing-booking-1',
      });

      const searchResult = await searchService.search({
        serviceId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(searchResult.availableSlots.length).toBeGreaterThan(0);

      const firstSlot = searchResult.availableSlots[0];
      expect(firstSlot).toBeDefined();

      const expectedStartTime = '10:05';
      expect(firstSlot.startTime).toBe(expectedStartTime);

      const bookingAtFirstSlot = await bookingService.create({
        clientId,
        serviceId,
        startsAt: new Date(`${testDate}T${expectedStartTime}:00.000Z`),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(bookingAtFirstSlot).toBeDefined();
      expect(bookingAtFirstSlot?.status).toBe('confirmed');
    });

    it('should fail when trying to book before adjusted gap start time', async () => {
      const testDate = '2025-10-21';
      const existingBookingStart = TimeHelpers.utcDate(2025, 10, 21, 9, 0);
      const existingBookingEnd = TimeHelpers.addMinutes(
        existingBookingStart,
        45,
      );

      const existingBookingStartWithBuffer = TimeHelpers.addMinutes(
        existingBookingStart,
        -10,
      );
      const existingBookingEndWithBuffer = TimeHelpers.addMinutes(
        existingBookingEnd,
        10,
      );

      await lockService.tryAcquireSlot({
        businessId,
        date: testDate,
        start: existingBookingStartWithBuffer.getTime(),
        end: existingBookingEndWithBuffer.getTime(),
        bookingId: 'existing-booking-1',
      });

      const searchResult = await searchService.search({
        serviceId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(searchResult.availableSlots.length).toBeGreaterThan(0);
      const firstSlot = searchResult.availableSlots[0];

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date(`${testDate}T09:55:00.000Z`),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow();
    });

    it('should show correct times in search with multiple bookings', async () => {
      const testDate = '2025-10-21';

      await lockService.tryAcquireSlot({
        businessId,
        date: testDate,
        start: TimeHelpers.toEpoch(testDate, '08:50'),
        end: TimeHelpers.toEpoch(testDate, '09:55'),
        bookingId: 'booking-1',
      });

      await lockService.tryAcquireSlot({
        businessId,
        date: testDate,
        start: TimeHelpers.toEpoch(testDate, '13:50'),
        end: TimeHelpers.toEpoch(testDate, '15:05'),
        bookingId: 'booking-2',
      });

      const searchResult = await searchService.search({
        serviceId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(searchResult.availableSlots.length).toBeGreaterThan(0);

      const slot1 = searchResult.availableSlots.find(
        (s) => s.startTime === '10:05',
      );
      expect(slot1).toBeDefined();

      const slot2 = searchResult.availableSlots.find(
        (s) => s.startTime === '15:15',
      );
      expect(slot2).toBeDefined();
    });

    it('should maintain consistency between search and booking for multiple consecutive bookings', async () => {
      const testDate = '2025-10-22';

      const searchResult1 = await searchService.search({
        serviceId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(searchResult1.availableSlots.length).toBeGreaterThan(0);
      const firstSlot = searchResult1.availableSlots[0];

      const booking1 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: new Date(`${testDate}T${firstSlot.startTime}:00.000Z`),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking1?.status).toBe('confirmed');

      const searchResult2 = await searchService.search({
        serviceId,
        startDate: testDate,
        endDate: testDate,
      });

      expect(searchResult2.availableSlots.length).toBeGreaterThan(0);
      const secondSlot = searchResult2.availableSlots[0];

      const booking2 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: new Date(`${testDate}T${secondSlot.startTime}:00.000Z`),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking2?.status).toBe('confirmed');
    });
  });

  describe('Closed Day Consistency', () => {
    it('should not show closed days in search and reject bookings on those days', async () => {
      const closedDate = '2025-12-25';

      await overrideModel.create(
        TestDataFactory.createOverride(businessId, {
          date: new Date(`${closedDate}T00:00:00.000Z`),
          type: 'closed',
        }),
      );

      const searchResult = await searchService.search({
        serviceId,
        startDate: closedDate,
        endDate: closedDate,
      });

      expect(searchResult.availableSlots).toHaveLength(0);

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date(`${closedDate}T10:00:00.000Z`),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow('Selected time is not available for booking');
    });
  });

  describe('Modified Hours Consistency', () => {
    it('should show only modified hours in search and reject bookings outside modified hours', async () => {
      const modifiedDate = '2025-12-24';

      await overrideModel.create(
        TestDataFactory.createOverride(businessId, {
          date: new Date(`${modifiedDate}T00:00:00.000Z`),
          type: 'modified_hours',
          startTime: '09:00',
          endTime: '13:00',
        }),
      );

      const searchResult = await searchService.search({
        serviceId,
        startDate: modifiedDate,
        endDate: modifiedDate,
      });

      expect(searchResult.availableSlots.length).toBeGreaterThan(0);
      const lastSlot =
        searchResult.availableSlots[searchResult.availableSlots.length - 1];

      expect(lastSlot.endTime <= '12:50').toBe(true);

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date(`${modifiedDate}T15:00:00.000Z`),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow();
    });
  });

  describe('Business Hours with Buffers', () => {
    it('should not allow booking at opening time if buffer-before extends before business hours (Bug 6)', async () => {
      const testDate = '2025-10-23';

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date(`${testDate}T09:00:00.000Z`),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow(/before business hours/);
    });

    it('should allow booking at first valid time after buffer adjustment', async () => {
      const testDate = '2025-10-23';

      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: new Date(`${testDate}T09:10:00.000Z`),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking?.status).toBe('confirmed');
    });

    it('should not allow booking near closing time if buffer-after extends past business hours (Bug 6)', async () => {
      const testDate = '2025-10-23';

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date(`${testDate}T16:10:00.000Z`),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow(/after business hours/);
    });

    it('should allow booking at last valid time before closing', async () => {
      const testDate = '2025-10-23';

      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: new Date(`${testDate}T16:05:00.000Z`),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking?.status).toBe('confirmed');
    });
  });
});
