import { RESOURCE_NOT_FOUND } from '@/common/messages';
import { DateBuilder } from '@/common/utils/date.utils';
import { tag } from '@/common/utils/string.utils';
import { ckMaker } from '@/lib/cache/cache-key.builder';
import { CacheService } from '@/lib/cache/cache.service';
import { BookingLockService } from '@/modules/booking/common/services/booking-lock.service';
import { ServiceDocument } from '@/modules/services/common/entities/service.entity';
import type { IServiceRepository } from '@/modules/services/common/interfaces/service-repository.interface';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AvailabilityOverride } from '../../common/entities/availability-override.entity';
import type { AvailabilitySchedule } from '../../common/entities/availability-schedule.entity';
import type {
  IAvailabilityOverrideRepository,
  IAvailabilityScheduleRepository,
} from '../../common/interfaces';
import { AvailabilityValidationService } from '../../common/services/availability-validation.service';
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
  readonly #CACHE_LOOKAHEAD_DAYS = 30;
  #logger = new Logger(AvailabilitySearchService.name);

  constructor(
    @Inject('IAvailabilityScheduleRepository')
    private readonly availabilityScheduleRepository: IAvailabilityScheduleRepository,
    @Inject('IAvailabilityOverrideRepository')
    private readonly availabilityOverrideRepository: IAvailabilityOverrideRepository,
    @Inject('IServicesRepository')
    private readonly serviceRepository: IServiceRepository,
    private readonly availabilityValidationService: AvailabilityValidationService,
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

    const startTime = performance.now();

    this.#logger.log(
      `Searching Availability for ${tag({ id: service._id.toString(), name: 'Service' })} from ${input.startDate} to ${input.endDate}`,
    );

    const businessId = service.businessId.toString();

    const businessConfig = await this.#getBusinessConfig(businessId);

    const slots = await this.#computeSlotsFromRedis(
      businessId,
      businessConfig,
      service,
      new Date(input.startDate),
      new Date(input.endDate),
    );

    const duration = performance.now() - startTime;

    this.#logger.log(`${slots.length} Slots found in ${duration.toFixed(2)}ms`);

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
          .addDays(this.#CACHE_LOOKAHEAD_DAYS)
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

    this.#logger.log(
      `Computing Slots between ${effectiveStart.toDateString()} and ${effectiveEnd.toDateString()} `,
    );

    const startTime = performance.now();

    while (current <= effectiveEnd) {
      const hours =
        await this.availabilityValidationService.getEffectiveHoursForDate(
          businessId,
          current,
        );

      if (hours) {
        const dateStr = DateBuilder.toISODateString(current);

        const gaps = await this.lockService.getAvailableSlots({
          businessId,
          date: dateStr,
          dayStart: DateBuilder.timeToEpoch(dateStr, hours.startTime),
          dayEnd: DateBuilder.timeToEpoch(dateStr, hours.endTime),
          serviceDuration: service.duration,
          bufferBefore: service.bufferBefore,
          bufferAfter: service.bufferAfter,
        });

        const bufferBeforeMs = service.bufferBefore * 60 * 1000;
        const bufferAfterMs = service.bufferAfter * 60 * 1000;

        gaps.forEach((gap) => {
          const bookableStart = gap.start + bufferBeforeMs;
          const bookableEnd = gap.end - bufferAfterMs;
          const bookableDuration = Math.floor(
            (bookableEnd - bookableStart) / (60 * 1000),
          );

          if (bookableDuration > 0) {
            slots.push({
              date: dateStr,
              startTime: DateBuilder.epochToTime(bookableStart),
              endTime: DateBuilder.epochToTime(bookableEnd),
              duration: bookableDuration,
            });
          }
        });
      }

      current.setDate(current.getDate() + 1);
    }

    const duration = performance.now() - startTime;

    this.#logger.log(
      `${slots.length} Slots computed in ${duration.toFixed(2)}ms`,
    );

    return slots;
  }
}
