import { QueueName } from '@/lib/queue/queue.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OutboxEventStatus } from '../enums';
import { OutboxService } from '../services/outbox.service';
import { WebhookService } from '../services/webhook.service';

type ProcessOutboxEventInput = {
  eventId: string;
};

@Processor(QueueName.ProcessOutboxQ)
export class ProcessOutboxProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessOutboxProcessor.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly webhookService: WebhookService,
  ) {
    super();
  }

  async process(job: Job<ProcessOutboxEventInput>): Promise<any> {
    const { data } = job;
    const { eventId } = data;

    this.logger.log(`Processing outbox event: ${eventId}`);

    try {
      const event = await this.outboxService.getEventById(eventId);

      if (!event) {
        this.logger.warn(`Event ${eventId} not found, skipping`);
        return { success: false, reason: 'Event not found' };
      }

      if (event.status === OutboxEventStatus.PROCESSED) {
        this.logger.log(`Event ${eventId} already processed, skipping`);
        return { success: true, reason: 'Already processed' };
      }

      await this.outboxService.markAsProcessing(eventId);

      await this.webhookService.publishEvent(event);

      await this.outboxService.markAsProcessed(eventId);

      this.logger.log(`Successfully processed outbox event: ${eventId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to process outbox event: ${eventId}`,
        (error as Error).stack,
      );

      await this.outboxService.markAsFailed(
        eventId,
        (error as Error).message || 'Unknown error',
      );

      throw error;
    }
  }
}
