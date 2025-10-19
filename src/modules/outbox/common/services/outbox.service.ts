import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutboxEventStatus, OutboxEventType } from '../enums';
import type { IOutboxEventRepository } from '../interfaces/outbox-event-repository.interface';

interface CreateOutboxEventInput {
  type: OutboxEventType;
  aggregateId: string;
  payload: Record<string, any>;
}

@Injectable()
export class OutboxService {
  readonly #logger = new Logger(OutboxService.name);
  private readonly MAX_RETRY_COUNT = 5;

  constructor(
    @Inject('IOutboxEventRepository')
    private readonly outboxEventRepository: IOutboxEventRepository,
  ) {}

  async createEvent(input: CreateOutboxEventInput) {
    this.#logger.log(`Creating outbox event: ${input.type}`);

    return this.outboxEventRepository.create({
      type: input.type,
      aggregateId: input.aggregateId,
      payload: input.payload,
    });
  }

  async getEventById(eventId: string) {
    return this.outboxEventRepository.findOneById(eventId);
  }

  async getPendingEvents(limit: number = 100) {
    this.#logger.debug(`Fetching pending events with limit ${limit}`);

    const result = await this.outboxEventRepository.findMany(
      {
        status: OutboxEventStatus.PENDING,
        retryCount: { $lt: this.MAX_RETRY_COUNT },
      },
      { sort: { createdAt: 1 }, limit },
    );

    return result.items;
  }

  async markAsProcessing(eventId: string) {
    this.#logger.debug(`Marking event ${eventId} as processing`);

    await this.outboxEventRepository.update(eventId, {
      status: OutboxEventStatus.PROCESSING,
    });
  }

  async markAsProcessed(eventId: string) {
    this.#logger.debug(`Marking event ${eventId} as processed`);

    await this.outboxEventRepository.update(eventId, {
      status: OutboxEventStatus.PROCESSED,
      processedAt: new Date(),
    });
  }

  async markAsFailed(eventId: string, error: string) {
    this.#logger.warn(`Marking event ${eventId} as failed: ${error}`);

    const event = await this.outboxEventRepository.findOneById(eventId);

    if (!event) {
      this.#logger.error(`Event ${eventId} not found, cannot mark as failed`);
      return;
    }

    await this.outboxEventRepository.update(eventId, {
      status: OutboxEventStatus.FAILED,
      error,
      retryCount: event.retryCount + 1,
    });
  }
}
