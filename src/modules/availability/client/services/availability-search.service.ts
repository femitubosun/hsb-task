import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { BookingLockService } from '@/modules/booking/common/services/booking-lock.service';
import { ServiceDocument } from '@/modules/services/common/entities/service.entity';
import type { IServiceRepository } from '@/modules/services/common/interfaces/service-repository.interface';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AvailabilityOverride } from '../../common/entities/availability-override.entity';
import type { AvailabilitySchedule } from '../../common/entities/availability-schedule.entity';
import type {
  IAvailabilityOverrideRepository,
  IAvailabilityScheduleRepository,
} from '../../common/interfaces';
import {
  AvailabilitySearchRequestDto,
  AvailabilitySearchResponseDto,
  AvailabilitySlotDto,
} from '../dtos';

type BusinessConfig = {
  schedule: AvailabilitySchedule;
  overrideMap: Map<string, AvailabilityOverride>;
};

@Injectable()
export class AvailabilitySearchService {
  private readonly CACHE_LOOKAHEAD_DAYS = 30;

  constructor(
    @Inject('IAvailabilityScheduleRepository')
    private readonly availabilityScheduleRepository: IAvailabilityScheduleRepository,
    @Inject('IAvailabilityOverrideRepository')
    private readonly availabilityOverrideRepository: IAvailabilityOverrideRepository,
    @Inject('IServicesRepository')
    private readonly serviceRepository: IServiceRepository,
    private readonly lockService: BookingLockService,
    private readonly cacheService: CacheService,
  ) {}

  async search(
    input: AvailabilitySearchRequestDto,
  ): Promise<AvailabilitySearchResponseDto> {
    const businessConfig = await this.#getBusinessConfig(input.businessId);

    const service = await this.serviceRepository.findOneById(input.serviceId);

    if (!service || service.businessId.toString() !== input.businessId) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));
    }

    const slots = await this.#computeSlotsFromRedis(
      input.businessId,
      businessConfig,
      service,
      new Date(input.startDate),
      new Date(input.endDate),
    );

    return {
      service: {
        _id: service._id.toString(),
        businessId: service.businessId.toString(),
        name: service.name,
        duration: service.duration,
        price: service.price,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
      },
      availableSlots: slots,
    };
  }

  async #getBusinessConfig(businessId: string): Promise<BusinessConfig> {
    const cacheKey = ckMaker('availability', 'business-config')
      .owner(businessId)
      .toString();

    return this.cacheService.fetch({
      key: cacheKey,
      resolver: async () => {
        const now = new Date();
        const futureDate = DateBuilder.from(now)
          .addDays(this.CACHE_LOOKAHEAD_DAYS)
          .toDate();

        const [schedules, overrides] = await Promise.all([
          this.availabilityScheduleRepository.findMany({
            businessId: new Types.ObjectId(businessId),
            effectiveFrom: { $lte: now },
            $or: [{ effectiveUntil: { $gte: now } }, { effectiveUntil: null }],
            isActive: true,
          }),
          this.availabilityOverrideRepository.findMany({
            businessId: new Types.ObjectId(businessId),
            date: { $gte: now, $lte: futureDate },
            isActive: true,
          }),
        ]);

        if (!schedules.items.length) {
          throw new NotFoundException(
            `No active schedule found for business ${businessId}`,
          );
        }

        const schedule = schedules.items[0];

        const overrideMap = new Map(
          overrides.items.map((o) => [DateBuilder.toISODateString(o.date), o]),
        );

        return { schedule, overrideMap };
      },
      tags: [`business:${businessId}`],
    });
  }

  async #computeSlotsFromRedis(
    businessId: string,
    config: BusinessConfig,
    service: ServiceDocument,
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilitySlotDto[]> {
    const slots: AvailabilitySlotDto[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = this.#getDayOfWeekName(current.getDay());

      if (config.schedule.daysOfWeek.includes(dayOfWeek)) {
        const dateStr = DateBuilder.toISODateString(current);
        const override = config.overrideMap.get(dateStr);

        if (override?.type !== 'closed') {
          const dayStart = override?.startTime || config.schedule.startTime;
          const dayEnd = override?.endTime || config.schedule.endTime;

          const gaps = await this.lockService.getAvailableSlots({
            businessId,
            date: dateStr,
            dayStart: DateBuilder.timeToEpoch(dateStr, dayStart),
            dayEnd: DateBuilder.timeToEpoch(dateStr, dayEnd),
            serviceDuration: service.duration,
            bufferBefore: service.bufferBefore,
            bufferAfter: service.bufferAfter,
          });

          gaps.forEach((gap) => {
            slots.push({
              date: dateStr,
              startTime: DateBuilder.epochToTime(gap.start),
              endTime: DateBuilder.epochToTime(gap.end),
              duration: gap.duration,
            });
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
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
