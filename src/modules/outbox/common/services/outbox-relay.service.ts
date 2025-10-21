import { QueueName, QueueService } from '@/lib/queue/queue.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly BATCH_SIZE = 100;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly queueService: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async relayPendingEvents() {
    try {
      this.logger.debug('Checking for pending outbox events...');

      const pendingEvents = await this.outboxService.getPendingEvents(
        this.BATCH_SIZE,
      );

      if (pendingEvents.length === 0) {
        this.logger.debug('No pending events to process');
        return;
      }

      this.logger.log(
        `Found ${pendingEvents.length} pending events, enqueuing...`,
      );

      await Promise.all(
        pendingEvents.map((event) =>
          this.queueService.enqueueJob({
            queueName: QueueName.ProcessOutboxQ,
            data: {
              eventId: event._id.toString(),
            },
          }),
        ),
      );

      this.logger.log(`Successfully enqueued ${pendingEvents.length} events`);
    } catch (error) {
      this.logger.error(
        'Failed to relay pending events',
        (error as Error).stack,
      );
    }
  }
}
