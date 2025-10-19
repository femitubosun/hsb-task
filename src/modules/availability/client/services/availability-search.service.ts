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
    const service = await this.serviceRepository.findOneById(input.serviceId);

    if (!service) {
      throw new NotFoundException(RESOURCE_NOT_FOUND('Service'));
    }

    const businessId = service.businessId.toString();

    const businessConfig = await this.#getBusinessConfig(businessId);

    const slots = await this.#computeSlotsFromRedis(
      businessId,
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

    const cached = await this.cacheService.fetch({
      key: cacheKey,
      resolver: async () => {
        const now = new Date();
        const futureDate = DateBuilder.from(now)
          .addDays(this.CACHE_LOOKAHEAD_DAYS)
          .toDate();

        const [schedule, overrides] = await Promise.all([
          this.availabilityScheduleRepository.findOneByCondition({
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

        if (!schedule) {
          throw new NotFoundException(
            RESOURCE_NOT_FOUND('Business Availability Schedule'),
          );
        }

        const overrideMap = new Map(
          overrides.items.map((o) => [DateBuilder.toISODateString(o.date), o]),
        );

        return { schedule, overrideMap };
      },
      tags: [`business:${businessId}`],
    });

    if (!(cached.overrideMap instanceof Map)) {
      cached.overrideMap = new Map(Object.entries(cached.overrideMap));
    }

    return cached;
  }

  async #computeSlotsFromRedis(
    businessId: string,
    config: BusinessConfig,
    service: ServiceDocument,
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilitySlotDto[]> {
    const slots: AvailabilitySlotDto[] = [];
    const effectiveStart = new Date(
      Math.max(
        startDate.getTime(),
        new Date(config.schedule.effectiveFrom).getTime(),
      ),
    );
    const effectiveEnd = config.schedule.effectiveUntil
      ? new Date(
          Math.min(
            endDate.getTime(),
            new Date(config.schedule.effectiveUntil).getTime(),
          ),
        )
      : endDate;
    const current = new Date(effectiveStart);

    while (current <= effectiveEnd) {
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
