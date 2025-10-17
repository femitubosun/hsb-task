import { BaseEntity } from '@/common/entity';
import { User } from '@/modules/identity/users/entities/user.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type BusinessDocument = HydratedDocument<Business>;

@Schema()
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
