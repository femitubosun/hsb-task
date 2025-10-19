import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { OutboxEventDocument } from '../entities/outbox-event.entity';

export type IOutboxEventRepository =
  BaseRepositoryInterface<OutboxEventDocument>;
