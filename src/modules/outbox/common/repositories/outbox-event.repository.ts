import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OutboxEvent,
  OutboxEventDocument,
} from '../entities/outbox-event.entity';

import { IOutboxEventRepository } from '../interfaces/outbox-event-repository.interface';

@Injectable()
export class OutboxEventRepository
  extends BaseRepositoryAbstract<OutboxEventDocument>
  implements IOutboxEventRepository
{
  constructor(
    @InjectModel(OutboxEvent.name)
    model: Model<OutboxEventDocument>,
  ) {
    super(model);
  }
}
