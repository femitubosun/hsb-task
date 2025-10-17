import { BaseEntity } from '@/common/entity';
import { Business } from '@/modules/profile/business/entities/business.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AvailabilityOverrideDocument =
  HydratedDocument<AvailabilityOverride>;

@Schema({ _id: false })
export class PriceModifier {
  @Prop({ enum: ['percentage', 'fixed'], required: true })
  type: 'percentage' | 'fixed';

  @Prop({ required: true })
  value: number;
}

@Schema()
export class AvailabilityOverride extends BaseEntity {
  @Prop({
    type: Types.ObjectId,
    ref: Business.name,
    required: true,
  })
  businessId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({
    type: String,
    enum: ['closed', 'modified_hours'],
    required: true,
  })
  type: string;

  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop({ type: PriceModifier })
  priceModifier?: PriceModifier;

  @Prop({ default: true })
  isActive: boolean;
}

export const AvailabilityOverrideSchema =
  SchemaFactory.createForClass(AvailabilityOverride);

AvailabilityOverrideSchema.index({ businessId: 1, date: 1 });
