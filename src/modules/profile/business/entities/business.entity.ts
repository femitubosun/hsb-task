import { BaseEntity } from '@/common/entity';
import { User } from '@/modules/identity/users/entities/user.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type BusinessDocument = HydratedDocument<Business>;

@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Business extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, unique: true })
  userId: Types.ObjectId;

  @Prop()
  name: string;

  @Prop()
  bannerUrl: string;

  @Prop()
  profileImgUrl: string;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

BusinessSchema.virtual('services', {
  ref: 'Service',
  localField: '_id',
  foreignField: 'businessId',
});
