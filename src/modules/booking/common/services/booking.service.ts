import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { AvailabilityValidationService } from '@/modules/availability/common/services/availability-validation.service';
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
      throw new BadRequestException(
        'Slot conflicts with existing booking or is being booked by another user',
      );
    }

    try {
      const [booking] = await Promise.all([
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
        this.cacheService.invalidateByTag(ck.moduleTag),
      ]);

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

  async findAll(filters: { clientId?: string; businessId?: string }) {
    const ck = this.#getMethodCk('findAll');

    if (filters.clientId) {
      ck.owner(filters.clientId);
    } else if (filters.businessId) {
      ck.owner(filters.businessId);
    }

    const resolver = async () => {
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

  async cancel(bookingId: string, clientId: string) {
    const ck = this.#getMethodCk('cancel').owner(clientId).single(bookingId);

    const booking = await this.bookingRepository.findOneById(bookingId);

    if (!booking || booking.clientId.toString() !== clientId) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Booking'));
    }

    const bookingDate = DateBuilder.toISODateString(booking.startsAt);

    await Promise.all([
      this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: DateBuilder.today().toDate(),
      }),
      this.bookingLockService.releaseSlot({
        businessId: booking.businessId.toString(),
        date: bookingDate,
        bookingId: booking._id.toString(),
      }),
      this.cacheService.invalidateByTag(ck.moduleTag),
    ]);

    return this.findById(bookingId);
  }

  async reschedule(
    bookingId: string,
    clientId: string,
    input: RescheduleBookingInput,
  ) {
    const ck = this.#getMethodCk('reschedule')
      .owner(clientId)
      .single(bookingId);

    const booking = await this.bookingRepository.findOneById(bookingId);

    if (!booking || booking.clientId.toString() !== clientId) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Booking'));
    }

    const oldBookingDate = DateBuilder.toISODateString(booking.startsAt);

    const newStartsAt = DateBuilder.from(input.startsAt).toDate();

    await this.availabilityValidationService.validateBookingTime(
      booking.businessId.toString(),
      newStartsAt,
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

    const [newBooking] = await Promise.all([
      this.bookingRepository.create({
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
        cancelledAt: DateBuilder.today().toDate(),
        cancellationReason: 'rescheduled',
      }),
      this.cacheService.invalidateByTag(ck.moduleTag),
    ]);

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
