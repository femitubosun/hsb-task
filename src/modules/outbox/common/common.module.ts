import { HttpModule } from '@/lib/http/http.module';
import { QueueModule } from '@/lib/queue/queue.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEvent, OutboxEventSchema } from './entities/outbox-event.entity';
import { ProcessOutboxProcessor } from './processors/process-outbox.processor';
import { OutboxEventRepository } from './repositories/outbox-event.repository';
import { OutboxRelayService } from './services/outbox-relay.service';
import { OutboxService } from './services/outbox.service';
import { WebhookService } from './services/webhook.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
    QueueModule,
    HttpModule,
  ],
  providers: [
    {
      provide: 'IOutboxEventRepository',
      useClass: OutboxEventRepository,
    },
    OutboxService,
    OutboxRelayService,
    ProcessOutboxProcessor,
    WebhookService,
  ],
  exports: [OutboxService],
})
export class CommonModule {}
