import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { QUEUE_NOT_FOUND } from './messages';

export enum QueueName {
  ProcessOutboxQ = 'processOutboxQ',
}

type QueueInput<T extends QueueName> = T extends QueueName.ProcessOutboxQ
  ? { eventId: string }
  : any;

@Injectable()
export class QueueService {
  private readonly queueMap: Record<QueueName, Queue>;

  constructor(
    @InjectQueue(QueueName.ProcessOutboxQ)
    private readonly processOutboxQ: Queue,
  ) {
    this.queueMap = {
      [QueueName.ProcessOutboxQ]: this.processOutboxQ,
    };
  }

  async enqueueJob<T extends QueueName>(input: {
    queueName: T;
    data: QueueInput<T>;
    options?: JobsOptions;
  }) {
    const queue = this.#getQueueOrThrow(input.queueName);
    return this.#addJob(queue, input.queueName, input.data, input.options);
  }

  async #addJob(queue: Queue, jobName: string, data: any, opts?: JobsOptions) {
    await queue.add(jobName, data, opts);
  }

  #getQueueOrThrow(queueName: QueueName): Queue {
    const queue = this.queueMap[queueName];
    if (!queue) {
      throw new InternalServerErrorException(QUEUE_NOT_FOUND(queueName));
    }
    return queue;
  }
}
