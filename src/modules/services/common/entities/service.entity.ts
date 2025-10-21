import { BaseEntity } from '@/common/entity';
import { Business } from '@/modules/profile/business/entities/business.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service>;

@Schema()
export class Service extends BaseEntity {
  @Prop({
    type: Types.ObjectId,
    ref: Business.name,
    required: true,
  })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true, default: 0 })
  bufferBefore: number;

  @Prop({ required: true, default: 0 })
  bufferAfter: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const Servicechema = SchemaFactory.createForClass(Service);
