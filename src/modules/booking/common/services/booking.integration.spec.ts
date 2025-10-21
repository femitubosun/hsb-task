import { RedisService } from '@/infra/redis/redis.service';
import { AvailabilityValidationService } from '@/modules/availability/common/services/availability-validation.service';
import * as crypto from 'crypto';
import { connect, Connection, Types } from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { TestDataFactory } from '../../../../../test/helpers/test-data-factory';
import { TimeHelpers } from '../../../../../test/helpers/time-helpers';
import { DateBuilder } from '@/common/utils/date.utils';
import { BookingLockService } from './booking-lock.service';
import { BookingService } from './booking.service';

describe('BookingService Integration Tests', () => {
  let mongoConnection: Connection;
  let redisClient: RedisClientType;
  let redisService: RedisService;
  let lockService: BookingLockService;
  let bookingService: BookingService;
  let validationService: AvailabilityValidationService;

  let businessId: string;
  let serviceId: string;
  let clientId: string;

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
          refundedAt: Date,
          rescheduledFrom: {
            type: Types.ObjectId,
            ref: 'Booking',
            default: null,
          },
          cancelledAt: Date,
          cancellationReason: String,
        },
        { timestamps: true, strictPopulate: false },
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
    };

    validationService = new AvailabilityValidationService(
      scheduleRepo as any,
      overrideRepo as any,
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
      update: async (id: string, update: any) => {
        return await bookingModel
          .findByIdAndUpdate(id, update, { new: true })
          .lean()
          .exec();
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

    const cacheService = {
      fetch: async ({ resolver }: any) => resolver(),
      invalidate: async () => {},
      invalidateByTag: async () => {},
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
        price: 5000,
      }),
    );
    await scheduleModel.create(
      TestDataFactory.createSchedule(business._id, {
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startTime: '09:00',
        endTime: '17:00',
      }),
    );

    businessId = business._id.toString();
    serviceId = service._id.toString();
    clientId = user._id.toString();
  });

  describe('Create Booking Tests', () => {
    it('should create a valid booking within business hours', async () => {
      const testDate = TimeHelpers.utcDate(2025, 10, 21, 10, 0);

      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: testDate,
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking).toBeDefined();
      expect(booking?.status).toBe('confirmed');
      expect(booking?.clientId.toString()).toBe(clientId);
      expect(booking?.serviceId.toString()).toBe(serviceId);
      expect(new Date(booking?.startsAt || '').getTime()).toBe(
        testDate.getTime(),
      );

      const redisBookings = await redisClient.zRange(
        `bookings:${businessId}:2025-10-21`,
        0,
        -1,
      );
      expect(redisBookings.length).toBe(1);
    });

    it('should handle timezone normalization correctly (Bug 3)', async () => {
      const testDate1 = new Date('2025-10-21T10:10:00.000Z');
      const testDate2 = new Date('2025-10-22T10:10:00.000Z');

      const booking1 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: testDate1,
        idempotencyKey: crypto.randomUUID(),
      });

      await redisClient.flushAll();
      await bookingModel.deleteMany({});

      const booking2 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: testDate2,
        idempotencyKey: crypto.randomUUID(),
      });

      expect(new Date(booking1?.startsAt ?? '').toISOString()).toBe(
        testDate1.toISOString(),
      );
      expect(new Date(booking2?.startsAt ?? '').toISOString()).toBe(
        testDate2.toISOString(),
      );
    });

    it('should respect idempotency key and return existing booking', async () => {
      const testDate = TimeHelpers.utcDate(2025, 10, 21, 10, 0);
      const idempotencyKey = crypto.randomUUID();

      const booking1 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: testDate,
        idempotencyKey,
      });

      const booking2 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: testDate,
        idempotencyKey,
      });

      expect(booking1?._id.toString()).toBe(booking2?._id.toString());

      const allBookings = await bookingModel.find({}).lean().exec();
      expect(allBookings.length).toBe(1);
    });

    it('should reject booking outside business hours', async () => {
      const testDate = TimeHelpers.utcDate(2025, 10, 21, 8, 0);

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: testDate,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow(/before business hours/);
    });

    it('should reject booking on closed day (Bug 5)', async () => {
      const closedDate = new Date('2025-12-25T00:00:00.000Z');

      await overrideModel.create(
        TestDataFactory.createOverride(businessId, {
          date: closedDate,
          type: 'closed',
        }),
      );

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: new Date('2025-12-25T10:00:00.000Z'),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow('Selected time is not available for booking');
    });

    it('should reject booking with overlapping buffer times', async () => {
      const firstBooking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 10, 0),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(firstBooking?.status).toBe('confirmed');

      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: TimeHelpers.utcDate(2025, 10, 21, 10, 30),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow('This time is not available to be booked');
    });

    it('should reject booking at opening time when buffer-before extends before business hours (Bug 6)', async () => {
      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: TimeHelpers.utcDate(2025, 10, 21, 9, 0),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow(/before business hours/);
    });

    it('should allow booking at first valid time after buffer adjustment', async () => {
      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 9, 10),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking?.status).toBe('confirmed');
    });

    it('should reject booking near closing when buffer-after extends past business hours (Bug 6)', async () => {
      await expect(
        bookingService.create({
          clientId,
          serviceId,
          startsAt: TimeHelpers.utcDate(2025, 10, 21, 16, 10),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow(/after business hours/);
    });

    it('should allow booking at last valid time before closing', async () => {
      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 16, 5),
        idempotencyKey: crypto.randomUUID(),
      });

      expect(booking?.status).toBe('confirmed');
    });
  });

  describe('Concurrent Booking Tests', () => {
    it('should handle concurrent booking requests and only allow one to succeed', async () => {
      const testDate = TimeHelpers.utcDate(2025, 10, 21, 10, 0);

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, (_, i) =>
          bookingService.create({
            clientId,
            serviceId,
            startsAt: testDate,
            idempotencyKey: crypto.randomUUID(),
          }),
        ),
      );

      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(9);

      const allBookings = await bookingModel.find({}).lean().exec();
      expect(allBookings.length).toBe(1);
    });
  });

  beforeAll(() => {
    jest
      .spyOn(DateBuilder, 'utcNow')
      .mockReturnValue(
        DateBuilder.from(TimeHelpers.utcDate(2025, 10, 21, 18, 0)),
      );
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Cancel Booking Tests', () => {
    it('should cancel booking and release Redis lock', async () => {
      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 10, 0),
        idempotencyKey: crypto.randomUUID(),
      });

      await bookingService.cancel(booking?._id.toString() ?? '', clientId);

      const cancelled = await bookingModel.findById(booking?._id).lean().exec();
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancelledAt).toBeDefined();

      const redisBookings = await redisClient.zRange(
        `bookings:${businessId}:2025-10-21`,
        0,
        -1,
      );
      expect(redisBookings.length).toBe(0);
    });

    it('should calculate cancellation fee for late cancellations', async () => {
      const nearFutureDate = TimeHelpers.utcDate(2025, 10, 21, 16, 0);

      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: nearFutureDate,
        idempotencyKey: crypto.randomUUID(),
      });

      await bookingService.cancel(booking?._id.toString() ?? '', clientId);

      const cancelled = await bookingModel.findById(booking?._id).lean().exec();
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationFee).toBeGreaterThan(0);
      expect(cancelled.refundAmount).toBeLessThan(booking?.priceAtBooking ?? 0);
    });

    it('should provide full refund for early cancellations', async () => {
      const farFutureDate = TimeHelpers.utcDate(2025, 11, 4, 10, 0);

      const booking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: farFutureDate,
        idempotencyKey: crypto.randomUUID(),
      });
      await bookingService.cancel(booking?._id.toString() ?? '', clientId);

      const cancelled = await bookingModel.findById(booking?._id).lean().exec();
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationFee).toBe(0);
      expect(cancelled.refundAmount).toBe(booking?.priceAtBooking);
    });
  });

  describe('Reschedule Booking Tests', () => {
    it('should reschedule booking to a new valid time', async () => {
      const originalDate = TimeHelpers.utcDate(2025, 10, 21, 10, 0);
      const newDate = TimeHelpers.utcDate(2025, 10, 22, 14, 0);

      const originalBooking = await bookingService.create({
        clientId,
        serviceId,
        startsAt: originalDate,
        idempotencyKey: crypto.randomUUID(),
      });

      const rescheduled = await bookingService.reschedule(
        originalBooking?._id.toString() ?? '',
        clientId,
        {
          startsAt: newDate,
          idempotencyKey: crypto.randomUUID(),
        },
      );

      expect(rescheduled).toBeDefined();
      expect(rescheduled?.status).toBe('confirmed');
      const rescheduledTime = new Date(rescheduled?.startsAt ?? '').getTime();
      const expectedTime = newDate.getTime();
      expect(Math.abs(rescheduledTime - expectedTime)).toBeLessThan(1000);
      expect(rescheduled?.rescheduledFrom.toString()).toBe(
        originalBooking?._id.toString(),
      );

      const oldBooking = await bookingModel
        .findById(originalBooking?._id)
        .lean()
        .exec();
      expect(oldBooking.status).toBe('cancelled');

      const oldDateBookings = await redisClient.zRange(
        `bookings:${businessId}:2025-10-21`,
        0,
        -1,
      );
      expect(oldDateBookings.length).toBe(0);

      const newDateBookings = await redisClient.zRange(
        `bookings:${businessId}:2025-10-22`,
        0,
        -1,
      );
      expect(newDateBookings.length).toBe(1);
    });

    it('should fail to reschedule to a conflicting time slot', async () => {
      const booking1 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 10, 10),
        idempotencyKey: crypto.randomUUID(),
      });

      const booking2 = await bookingService.create({
        clientId,
        serviceId,
        startsAt: TimeHelpers.utcDate(2025, 10, 21, 14, 0),
        idempotencyKey: crypto.randomUUID(),
      });

      await expect(
        bookingService.reschedule(booking1?._id.toString() ?? '', clientId, {
          startsAt: TimeHelpers.utcDate(2025, 10, 21, 13, 50),
          idempotencyKey: crypto.randomUUID(),
        }),
      ).rejects.toThrow();
    });
  });
});
