import { RedisService } from '@/infra/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  ATOMIC_LOCK_SCRIPT,
  ATOMIC_RESCHEDULE_SWAP_SCRIPT,
  GET_AVAILABLE_SLOTS_RESCHEDULE_SCRIPT,
  GET_AVAILABLE_SLOTS_SCRIPT,
} from '../constants';
import { BookingIdentifier, BookingRange, SlotQueryParams } from '../dtos';

@Injectable()
export class BookingLockService {
  #lockScriptSha: string;
  #slotsScriptSha: string;
  #slotsRescheduleScriptSha: string;
  #rescheduleSwapScriptSha: string;

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    const lockScript = await readFile(ATOMIC_LOCK_SCRIPT, 'utf-8');
    const slotsScript = await readFile(GET_AVAILABLE_SLOTS_SCRIPT, 'utf-8');
    const slotsRescheduleScript = await readFile(
      GET_AVAILABLE_SLOTS_RESCHEDULE_SCRIPT,
      'utf-8',
    );
    const rescheduleSwapScript = await readFile(
      ATOMIC_RESCHEDULE_SWAP_SCRIPT,
      'utf-8',
    );

    this.#lockScriptSha =
      await this.redisService.instance.scriptLoad(lockScript);
    this.#slotsScriptSha =
      await this.redisService.instance.scriptLoad(slotsScript);
    this.#slotsRescheduleScriptSha =
      await this.redisService.instance.scriptLoad(slotsRescheduleScript);
    this.#rescheduleSwapScriptSha =
      await this.redisService.instance.scriptLoad(rescheduleSwapScript);
  }

  async tryAcquireSlot(range: BookingRange): Promise<boolean> {
    const key = `bookings:${range.businessId}:${range.date}`;

    const result = await this.redisService.instance.evalSha(
      this.#lockScriptSha,
      {
        keys: [key],
        arguments: [
          range.start.toString(),
          range.end.toString(),
          range.bookingId,
        ],
      },
    );

    return result === 1;
  }

  /**
   * Release a booking slot (used when booking creation fails)
   */
  async releaseSlot(identifier: BookingIdentifier): Promise<void> {
    const key = `bookings:${identifier.businessId}:${identifier.date}`;

    await Promise.all([
      this.redisService.instance.zRem(key, identifier.bookingId),
      this.redisService.instance.hDel(
        'booking_end_times',
        identifier.bookingId,
      ),
    ]);
  }

  async persistBooking(range: BookingRange): Promise<void> {
    const key = `bookings:${range.businessId}:${range.date}`;

    await Promise.all([
      this.redisService.instance.zAdd(key, {
        score: range.start,
        value: range.bookingId,
      }),
      this.redisService.instance.hSet(
        'booking_end_times',
        range.bookingId,
        range.end.toString(),
      ),
    ]);
  }

  /**
   * Get available slots for a specific day using Redis Lua script
   * Returns array of time gaps that can fit the service
   */
  async getAvailableSlots(
    input: SlotQueryParams,
    excludeBookingId?: string,
  ): Promise<
    Array<{
      start: number;
      end: number;
      duration: number;
    }>
  > {
    const key = `bookings:${input.businessId}:${input.date}`;

    const scriptSha = excludeBookingId
      ? this.#slotsRescheduleScriptSha
      : this.#slotsScriptSha;

    const totalTimeNeeded =
      (input.bufferBefore + input.serviceDuration + input.bufferAfter) *
      60 *
      1000;

    const args = excludeBookingId
      ? [
          input.dayStart.toString(),
          input.dayEnd.toString(),
          totalTimeNeeded.toString(),
          excludeBookingId,
        ]
      : [
          input.dayStart.toString(),
          input.dayEnd.toString(),
          totalTimeNeeded.toString(),
        ];

    const result = await this.redisService.instance.evalSha(scriptSha, {
      keys: [key],
      arguments: args,
    });

    if (!result) {
      return [];
    }

    let output: unknown;

    if (typeof result === 'string') {
      output = JSON.parse(result);
    } else if (Array.isArray(result)) {
      output = result;
    } else {
      return [];
    }

    if (!Array.isArray(output)) {
      return [];
    }

    return output.map(
      (o: { start: number; end: number; duration: number }) => ({
        start: o.start,
        end: o.end,
        duration: Math.floor(o.duration / (60 * 1000)),
      }),
    );
  }

  async atomicRescheduleSwap(params: {
    businessId: string;
    oldBookingId: string;
    oldDate: string;
    newDate: string;
    newStart: number;
    newEnd: number;
  }): Promise<boolean> {
    const oldKey = `bookings:${params.businessId}:${params.oldDate}`;
    const newKey = `bookings:${params.businessId}:${params.newDate}`;

    const oldStart = await this.redisService.instance.zScore(
      oldKey,
      params.oldBookingId,
    );
    const oldEnd = await this.redisService.instance.hGet(
      'booking_end_times',
      params.oldBookingId,
    );

    if (oldStart === null || oldEnd === null) {
      return false;
    }

    const result = await this.redisService.instance.evalSha(
      this.#rescheduleSwapScriptSha,
      {
        keys: [oldKey, newKey],
        arguments: [
          oldStart.toString(),
          oldEnd,
          params.newStart.toString(),
          params.newEnd.toString(),
          params.oldBookingId,
        ],
      },
    );

    return result === 1;
  }
}
