import { BaseEntity } from '@/common/entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OutboxEventStatus, OutboxEventType } from '../enums';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ timestamps: true })
export class OutboxEvent extends BaseEntity {
  @Prop({
    type: String,
    enum: Object.values(OutboxEventType),
    required: true,
    index: true,
  })
  type: OutboxEventType;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  aggregateId: string;

  @Prop({
    type: Object,
    required: true,
  })
  payload: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(OutboxEventStatus),
    default: OutboxEventStatus.PENDING,
    index: true,
  })
  status: OutboxEventStatus;

  @Prop({
    type: Date,
    default: null,
  })
  processedAt: Date | null;

  @Prop({
    type: Number,
    default: 0,
  })
  retryCount: number;

  @Prop({
    type: String,
    default: null,
  })
  error: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateId: 1, type: 1 });
OutboxEventSchema.index({ createdAt: -1 });
