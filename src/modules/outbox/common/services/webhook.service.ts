import { ConfigService } from '@/core/config/config.service';
import { HttpService } from '@/lib/http/http.service';
import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventDocument } from '../entities/outbox-event.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async publishEvent(event: OutboxEventDocument): Promise<void> {
    this.logger.log(
      `Publishing event ${event.type} to webhooks for aggregate ${event.aggregateId}`,
    );

    const endpointUrl = this.configService.env('BOOKING_EVENTS_URL');

    const webhookPayload = {
      id: event._id.toString(),
      type: event.type,
      createdAt: event.createdAt?.toISOString() || new Date().toISOString(),
      data: event.payload,
    };

    await this.httpService.post({
      endpointUrl,
      dataPayload: webhookPayload,
    });

    this.logger.debug(`Webhook payload: ${JSON.stringify(webhookPayload)}`);
  }
}
