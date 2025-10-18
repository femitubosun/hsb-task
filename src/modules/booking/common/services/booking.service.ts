import { AppModules } from '@/common/constants';
import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { ServicesService } from '@/modules/services/common/services/services.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateBookingInput, RescheduleBookingInput } from '../dtos';
import { BookingStatus } from '../entities/booking.entity';
import type { IBookingRepository } from '../interfaces/booking-repository.interface';

@Injectable()
export class BookingService {
  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    private readonly cacheService: CacheService,
    private readonly servicesService: ServicesService,
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

    const totalMinutes =
      service.duration + service.bufferBefore + service.bufferAfter;
    const startsAt = DateBuilder.from(input.startsAt).toDate();
    const endsAt = DateBuilder.from(input.startsAt)
      .addMinutes(totalMinutes)
      .toDate();

    const [booking] = await Promise.all([
      this.bookingRepository.create({
        clientId: new Types.ObjectId(input.clientId),
        businessId: service.businessId,
        serviceId: new Types.ObjectId(input.serviceId),
        startsAt,
        endsAt,
        duration: service.duration,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
        priceAtBooking: service.price,
        status: BookingStatus.CONFIRMED,
        idempotencyKey: input.idempotencyKey,
      }),
      this.cacheService.invalidateByTag(ck.ownerTag),
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

    await Promise.all([
      this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: DateBuilder.today().toDate(),
      }),
      this.cacheService.invalidateByTag(ck.ownerTag),
    ]);

    return this.bookingRepository.findOneById(bookingId, undefined, {
      populate: [
        { path: 'business', select: 'name email phone' },
        { path: 'service', select: 'name duration price' },
      ],
    });
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

    const totalMinutes =
      booking.duration + booking.bufferBefore + booking.bufferAfter;
    const newStartsAt = DateBuilder.from(input.startsAt).toDate();
    const newEndsAt = DateBuilder.from(input.startsAt)
      .addMinutes(totalMinutes)
      .toDate();

    const [newBooking] = await Promise.all([
      this.bookingRepository.create({
        clientId: booking.clientId,
        businessId: booking.businessId,
        serviceId: booking.serviceId,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
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
      this.cacheService.invalidateByTag(ck.ownerTag),
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
