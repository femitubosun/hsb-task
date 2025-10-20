import { DateBuilder } from '@/common/utils/date.utils';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type {
  IAvailabilityOverrideRepository,
  IAvailabilityScheduleRepository,
} from '../interfaces';

export interface EffectiveHours {
  startTime: string;
  endTime: string;
}

@Injectable()
export class AvailabilityValidationService {
  constructor(
    @Inject('IAvailabilityScheduleRepository')
    private readonly scheduleRepository: IAvailabilityScheduleRepository,
    @Inject('IAvailabilityOverrideRepository')
    private readonly overrideRepository: IAvailabilityOverrideRepository,
  ) {}

  async getEffectiveHoursForDate(
    businessId: string,
    date: Date,
  ): Promise<EffectiveHours | null> {
    const dateStr = DateBuilder.toISODateString(date);
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const [schedule, override] = await Promise.all([
      this.scheduleRepository.findOneByCondition({
        businessId: new Types.ObjectId(businessId),
        isActive: true,
      }),
      this.overrideRepository.findOneByCondition({
        businessId: new Types.ObjectId(businessId),
        date: { $gte: startOfDay, $lt: endOfDay },
        isActive: true,
      }),
    ]);

    const IS_PROCESSING = !!schedule || !!override;

    if (!IS_PROCESSING) {
      return null;
    }

    if (override?.type === 'closed') {
      return null;
    }

    if (override?.type === 'modified_hours') {
      if (!override.startTime || !override.endTime) {
        return null;
      }

      return {
        startTime: override.startTime,
        endTime: override.endTime,
      };
    }

    if (!schedule) {
      return null;
    }

    const effectiveFromStr = DateBuilder.toISODateString(
      schedule.effectiveFrom,
    );

    if (dateStr < effectiveFromStr) {
      return null;
    }

    if (schedule.effectiveUntil) {
      const effectiveUntilStr = DateBuilder.toISODateString(
        schedule.effectiveUntil,
      );
      if (dateStr > effectiveUntilStr) {
        return null;
      }
    }

    const dayOfWeek = this.#getDayOfWeekName(date.getUTCDay());

    if (!schedule.daysOfWeek.includes(dayOfWeek)) {
      return null;
    }

    return {
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    };
  }

  async validateBookingTime(
    businessId: string,
    bookingDate: Date,
    serviceDuration: number,
    bufferBefore: number,
    bufferAfter: number,
  ): Promise<void> {
    const hours = await this.getEffectiveHoursForDate(businessId, bookingDate);

    if (!hours) {
      throw new BadRequestException(
        'Selected time is not available for booking',
      );
    }

    const bookingTime = DateBuilder.from(bookingDate).getTime();
    const bookingStartWithBuffer = DateBuilder.from(bookingDate)
      .removeMinutes(bufferBefore)
      .getTime();
    const bookingEndWithBuffer = DateBuilder.from(bookingDate)
      .addMinutes(serviceDuration + bufferAfter)
      .getTime();

    if (bookingStartWithBuffer < hours.startTime) {
      throw new BadRequestException(
        `Booking at ${bookingTime} with ${bufferBefore}-minute buffer would start at ${bookingStartWithBuffer}, which is before business hours (${hours.startTime})`,
      );
    }

    if (bookingEndWithBuffer > hours.endTime) {
      throw new BadRequestException(
        `Booking at ${bookingTime} with ${serviceDuration}-minute duration and ${bufferAfter}-minute buffer would end at ${bookingEndWithBuffer}, which is after business hours (${hours.endTime})`,
      );
    }
  }

  #getDayOfWeekName(day: number): string {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[day];
  }
}
