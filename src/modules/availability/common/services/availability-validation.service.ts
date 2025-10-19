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

    const [schedule, override] = await Promise.all([
      this.scheduleRepository.findOneByCondition({
        businessId: new Types.ObjectId(businessId),
        isActive: true,
      }),
      this.overrideRepository.findOneByCondition({
        businessId: new Types.ObjectId(businessId),
        date: new Date(dateStr),
        isActive: true,
      }),
    ]);

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

    const dayOfWeek = this.#getDayOfWeekName(date.getDay());
    if (!schedule.daysOfWeek.includes(dayOfWeek)) {
      return null;
    }

    if (override?.type === 'closed') {
      return null;
    }

    return {
      startTime: override?.startTime || schedule.startTime,
      endTime: override?.endTime || schedule.endTime,
    };
  }

  async validateBookingTime(
    businessId: string,
    bookingDate: Date,
  ): Promise<void> {
    const hours = await this.getEffectiveHoursForDate(businessId, bookingDate);

    if (!hours) {
      throw new BadRequestException(
        'Selected time is not available for booking',
      );
    }

    const bookingTime = DateBuilder.from(bookingDate).getTime();
    if (bookingTime < hours.startTime || bookingTime >= hours.endTime) {
      throw new BadRequestException(
        `Booking time ${bookingTime} is outside business hours (${hours.startTime} - ${hours.endTime})`,
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
