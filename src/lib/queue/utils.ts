import { BullModule } from '@nestjs/bullmq';
import { QueueName } from './queue.service';

/**
 * Registers a queue with the given name using BullMQ and BullBoard.
 * @param {string} name - The name of the queue to register.
 * @returns {Array} An array containing BullModule and BullBoardModule configurations.
 */
export function registerQueue(name: string) {
  return [
    BullModule.registerQueue({
      name,
    }),
  ];
}

/**
 * Registers all named queues defined in the QueueName enum.
 * @param {typeof QueueName} queueEnum - The QueueName enum.
 * @returns {Array} An array of configurations for all registered queues.
 */
export function registerAllNamedQueues(queueEnum: typeof QueueName) {
  const queueNames = Object.values(queueEnum);
  return queueNames.map((name) => registerQueue(name)).flat();
}
