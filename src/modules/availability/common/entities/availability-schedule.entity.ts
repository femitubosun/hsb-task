import { BaseEntity } from '@/common/entity';
import { Business } from '@/modules/profile/business/entities/business.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AvailabilityScheduleDocument =
  HydratedDocument<AvailabilitySchedule> & {};

@Schema()
export class AvailabilitySchedule extends BaseEntity {
  @Prop({
    type: Types.ObjectId,
    ref: Business.name,
    required: true,
  })
  businessId: Types.ObjectId;

  @Prop({
    type: [String],
    enum: [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ],
  })
  daysOfWeek: string[];

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  effectiveFrom: Date;

  @Prop()
  effectiveUntil?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const AvailabilityScheduleSchema =
  SchemaFactory.createForClass(AvailabilitySchedule);

AvailabilityScheduleSchema.index({ businessId: 1, daysOfWeek: 1 });
AvailabilityScheduleSchema.index({
  businessId: 1,
  effectiveFrom: 1,
  effectiveUntil: 1,
});
