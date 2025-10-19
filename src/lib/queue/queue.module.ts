import { BullMqModule } from '@/infra/bullmq/bullmq.module';
import { Module } from '@nestjs/common';
import { QueueName, QueueService } from './queue.service';
import { registerAllNamedQueues } from './utils';

@Module({
  imports: [BullMqModule, ...registerAllNamedQueues(QueueName)],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
