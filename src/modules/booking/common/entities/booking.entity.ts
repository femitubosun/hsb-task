import { BaseEntity } from '@/common/entity';
import { User } from '@/modules/identity/users/entities/user.entity';
import { Business } from '@/modules/profile/business/entities/business.entity';
import { Service } from '@/modules/services/common/entities/service.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookingDocument = HydratedDocument<Booking>;

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Booking extends BaseEntity {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  clientId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Service.name,
    required: true,
  })
  serviceId: Types.ObjectId;

  @Prop({ required: true, index: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ required: true })
  duration: number;

  @Prop({ default: 0 })
  bufferBefore: number;

  @Prop({ default: 0 })
  bufferAfter: number;

  @Prop({ required: true })
  priceAtBooking: number;

  @Prop({ default: 0 })
  cancellationFee: number;

  @Prop({ default: 0 })
  refundAmount: number;

  @Prop({ default: null })
  refundedAt: Date;

  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.CONFIRMED,
    index: true,
  })
  status: BookingStatus;

  @Prop({ default: null })
  cancelledAt: Date;

  @Prop({ default: null })
  cancellationReason: string;

  @Prop({ default: null })
  completedAt: Date;

  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  @Prop({
    type: Types.ObjectId,
    ref: Booking.name,
    default: null,
  })
  rescheduledFrom: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index(
  {
    businessId: 1,
    serviceId: 1,
    startsAt: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [BookingStatus.CONFIRMED] },
    },
  },
);

BookingSchema.index({ clientId: 1, startsAt: -1 });
BookingSchema.index({ businessId: 1, startsAt: 1 });
BookingSchema.index({ idempotencyKey: 1 });
