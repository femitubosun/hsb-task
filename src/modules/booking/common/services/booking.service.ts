import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { QueueName, QueueService } from '@/lib/queue/queue.service';
import { AvailabilityValidationService } from '@/modules/availability/common/services/availability-validation.service';
import { OutboxEventType } from '@/modules/outbox/common/enums';
import { OutboxService } from '@/modules/outbox/common/services/outbox.service';
import { ServicesService } from '@/modules/services/common/services/services.service';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateBookingInput, RescheduleBookingInput } from '../dtos';
import { BookingStatus } from '../entities/booking.entity';
import type { IBookingRepository } from '../interfaces/booking-repository.interface';
import { TIME_NOT_AVAILABLE_FOR_BOOKING } from '../messages';
import { BookingLockService } from './booking-lock.service';

@Injectable()
export class BookingService {
  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    private readonly availabilityValidationService: AvailabilityValidationService,
    private readonly cacheService: CacheService,
    private readonly servicesService: ServicesService,
    private readonly bookingLockService: BookingLockService,
    private readonly queueService: QueueService,
    private readonly outboxService: OutboxService,
  ) {}

  async create(input: CreateBookingInput) {
    const ck = this.#getMethodCk('create');
    ck.owner(input.clientId);

    const service = await this.servicesService.findOneById(input.serviceId);

    if (!service) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));
    }

    const existing = await this.bookingRepository.findOneByCondition(
      {
        idempotencyKey: input.idempotencyKey,
      },
      undefined,
      {
        populate: [
          { path: 'business', select: 'name email phone' },
          { path: 'service', select: 'name duration price' },
        ],
      },
    );

    if (existing) {
      return existing;
    }

    const startsAt = DateBuilder.from(input.startsAt).toDate();

    await this.availabilityValidationService.validateBookingTime(
      service.businessId.toString(),
      startsAt,
      service.duration,
      service.bufferBefore,
      service.bufferAfter,
    );

    const startWithBuffer = DateBuilder.from(startsAt)
      .removeMinutes(service.bufferBefore)
      .toDate();
    const endWithBuffer = DateBuilder.from(startsAt)
      .addMinutes(service.duration + service.bufferAfter)
      .toDate();

    const bookingDate = DateBuilder.toISODateString(startsAt);
    const bookingId = new Types.ObjectId();

    const lockAcquired = await this.bookingLockService.tryAcquireSlot({
      businessId: service.businessId.toString(),
      date: bookingDate,
      start: startWithBuffer.getTime(),
      end: endWithBuffer.getTime(),
      bookingId: bookingId.toString(),
    });

    if (!lockAcquired) {
      throw new BadRequestException(TIME_NOT_AVAILABLE_FOR_BOOKING);
    }

    try {
      const [booking, outboxEvent] = await Promise.all([
        this.bookingRepository.create({
          _id: bookingId,
          clientId: new Types.ObjectId(input.clientId),
          businessId: service.businessId,
          serviceId: new Types.ObjectId(input.serviceId),
          startsAt,
          endsAt: endWithBuffer,
          duration: service.duration,
          bufferBefore: service.bufferBefore,
          bufferAfter: service.bufferAfter,
          priceAtBooking: service.price,
          status: BookingStatus.CONFIRMED,
          idempotencyKey: input.idempotencyKey,
        }),
        this.outboxService.createEvent({
          type: OutboxEventType.BOOKING_CREATED,
          aggregateId: bookingId.toString(),
          payload: {
            bookingId: bookingId.toString(),
            clientId: input.clientId,
            businessId: service.businessId.toString(),
            serviceId: input.serviceId,
            startsAt: startsAt.toISOString(),
            priceAtBooking: service.price,
          },
        }),
        this.cacheService.invalidateByTag(ck.moduleTag),
      ]);

      await this.queueService.enqueueJob({
        queueName: QueueName.ProcessOutboxQ,
        data: {
          eventId: outboxEvent._id.toString(),
        },
      });

      return this.bookingRepository.findOneById(
        booking._id.toString(),
        undefined,
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
    } catch (error) {
      await this.bookingLockService.releaseSlot({
        businessId: service.businessId.toString(),
        date: bookingDate,
        bookingId: bookingId.toString(),
      });
      throw error;
    }
  }

  async findById(bookingId: string) {
    const ck = this.#getMethodCk('findById').single(bookingId);

    const resolver = async () => {
      const booking = await this.bookingRepository.findOneById(
        bookingId,
        undefined,
        {
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );

      if (!booking) {
        throw new NotFoundException(RESOURCE_NOT_FOUND('Booking'));
      }

      return booking;
    };

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.moduleTag],
    });
  }

  async findAll(
    filters: { clientId?: string; businessId?: string },
    options: { page?: number; limit?: number } = {},
  ) {
    const ck = this.#getMethodCk('findAll');

    if (filters.clientId) {
      ck.owner(filters.clientId);
    } else if (filters.businessId) {
      ck.owner(filters.businessId);
    }

    const resolver = async () => {
      const skip =
        options.page && options.limit
          ? (options.page - 1) * options.limit
          : undefined;
      const result = await this.bookingRepository.findMany(
        {
          ...(filters?.clientId && {
            clientId: new Types.ObjectId(filters.clientId),
          }),
          ...(filters?.businessId && {
            businessId: new Types.ObjectId(filters.businessId),
          }),
        },
        {
          ...(skip !== undefined && { skip }),
          ...(options.limit && { limit: options.limit }),
          populate: [
            { path: 'business', select: 'name email phone' },
            { path: 'service', select: 'name duration price' },
          ],
        },
      );
      return result;
    };

    return this.cacheService.fetch({
      resolver,
      key: ck.toString(),
      tags: [ck.ownerTag, ck.moduleTag],
    });
  }

  async listAdminBookings({
    page,
    limit,
    filters,
  }: {
    page: number;
    limit: number;
    filters: {
      businessId?: string;
      clientId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
  }) {
    const skip = (page - 1) * limit;

    return this.bookingRepository.findMany(
      {
        ...(filters.businessId && {
          businessId: new Types.ObjectId(filters.businessId),
        }),
        ...(filters.clientId && {
          clientId: new Types.ObjectId(filters.clientId),
        }),
        ...(filters.status && {
          status: filters.status,
        }),
        ...((filters.startDate || filters.endDate) && {
          startsAt: {
            ...(filters.startDate && { $gte: new Date(filters.startDate) }),
            ...(filters.endDate && { $lte: new Date(filters.endDate) }),
          },
        }),
      },
      {
        skip,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: 'business', select: 'name email phone' },
          { path: 'service', select: 'name duration price' },
          { path: 'clientId', select: 'email' },
        ],
      },
    );
  }

  async cancel(
    bookingId: string,
    userId: string,
    reason?: string,
    isAdmin: boolean = false,
  ) {
    const ck = this.#getMethodCk('cancel').owner(userId).single(bookingId);

    const booking = await this.bookingRepository.findOneById(bookingId);

    if (!booking || (!isAdmin && booking.clientId.toString() !== userId)) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Booking'));
    }

    const bookingDate = DateBuilder.toISODateString(booking.startsAt);

    const now = DateBuilder.now();
    const twelveHoursBeforeBooking = DateBuilder.from(
      booking.startsAt,
    ).removeHours(12);

    const isLateCancellation = now.isAfterOrEqual(twelveHoursBeforeBooking);

    const penaltyMultiplier = isLateCancellation ? 0.3 : 0;
    const price = booking.priceAtBooking;
    const cancellationFee = price * penaltyMultiplier;
    const refundAmount = price - cancellationFee;

    const [, outboxEvent] = await Promise.all([
      this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: now.toDate(),
        refundedAt: now.toDate(),
        refundAmount,
        cancellationFee,
        cancellationReason: reason,
      }),
      this.outboxService.createEvent({
        type: OutboxEventType.BOOKING_CANCELLED,
        aggregateId: bookingId,
        payload: {
          bookingId,
          clientId: booking.clientId.toString(),
          businessId: booking.businessId.toString(),
          cancelledAt: now.toDate().toISOString(),
          refundAmount,
          cancellationFee,
          isLateCancellation,
        },
      }),
      this.bookingLockService.releaseSlot({
        businessId: booking.businessId.toString(),
        date: bookingDate,
        bookingId: booking._id.toString(),
      }),
      this.cacheService.invalidateByTag(ck.moduleTag),
    ]);

    await this.queueService.enqueueJob({
      queueName: QueueName.ProcessOutboxQ,
      data: {
        eventId: outboxEvent._id.toString(),
      },
    });

    return this.findById(bookingId);
  }

  async reschedule(
    bookingId: string,
    userId: string,
    input: RescheduleBookingInput,
    isAdmin: boolean = false,
  ) {
    const ck = this.#getMethodCk('reschedule').owner(userId).single(bookingId);

    const booking = await this.bookingRepository.findOneById(bookingId);

    if (!booking || (!isAdmin && booking.clientId.toString() !== userId)) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Booking'));
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot reschedule a cancelled booking. Please create a new booking instead.',
      );
    }

    const oldBookingDate = DateBuilder.toISODateString(booking.startsAt);

    const newStartsAt = DateBuilder.from(input.startsAt).toDate();

    await this.availabilityValidationService.validateBookingTime(
      booking.businessId.toString(),
      newStartsAt,
      booking.duration,
      booking.bufferBefore,
      booking.bufferAfter,
    );

    const newStartWithBuffer = DateBuilder.from(newStartsAt)
      .removeMinutes(booking.bufferBefore)
      .toDate();
    const newEndWithBuffer = DateBuilder.from(newStartsAt)
      .addMinutes(booking.duration + booking.bufferAfter)
      .toDate();
    const newBookingDate = DateBuilder.toISODateString(newStartsAt);

    const swapSuccessful = await this.bookingLockService.atomicRescheduleSwap({
      businessId: booking.businessId.toString(),
      oldBookingId: booking._id.toString(),
      oldDate: oldBookingDate,
      newDate: newBookingDate,
      newStart: newStartWithBuffer.getTime(),
      newEnd: newEndWithBuffer.getTime(),
    });

    if (!swapSuccessful) {
      throw new NotFoundException(
        'New slot conflicts with existing booking or is being booked by another user',
      );
    }

    const newBookingId = new Types.ObjectId();

    const [newBooking, , outboxEvent] = await Promise.all([
      this.bookingRepository.create({
        _id: newBookingId,
        clientId: booking.clientId,
        businessId: booking.businessId,
        serviceId: booking.serviceId,
        startsAt: newStartsAt,
        endsAt: newEndWithBuffer,
        duration: booking.duration,
        bufferBefore: booking.bufferBefore,
        bufferAfter: booking.bufferAfter,
        priceAtBooking: booking.priceAtBooking,
        status: BookingStatus.CONFIRMED,
        idempotencyKey: input.idempotencyKey,
        rescheduledFrom: new Types.ObjectId(booking._id),
      }),
      this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: DateBuilder.now().toDate(),
        cancellationReason: 'rescheduled',
      }),
      this.outboxService.createEvent({
        type: OutboxEventType.BOOKING_RESCHEDULED,
        aggregateId: newBookingId.toString(),
        payload: {
          oldBookingId: bookingId,
          newBookingId: newBookingId.toString(),
          clientId: booking.clientId.toString(),
          businessId: booking.businessId.toString(),
          oldStartsAt: booking.startsAt.toISOString(),
          newStartsAt: newStartsAt.toISOString(),
        },
      }),
      this.cacheService.invalidateByTag(ck.moduleTag),
    ]);

    await this.queueService.enqueueJob({
      queueName: QueueName.ProcessOutboxQ,
      data: {
        eventId: outboxEvent._id.toString(),
      },
    });

    return this.bookingRepository.findOneById(
      newBooking._id.toString(),
      undefined,
      {
        populate: [
          { path: 'business', select: 'name email phone' },
          { path: 'service', select: 'name duration price' },
        ],
      },
    );
  }

  #getMethodCk(method: string) {
    return ckMaker(AppModules.BOOKING, `${BookingService.name}:${method}`);
  }
}
