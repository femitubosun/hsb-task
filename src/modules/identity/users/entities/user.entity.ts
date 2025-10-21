import { BaseEntity } from '@/common/entity';
import type { Roles } from '@/common/types/roles.type';
import { BusinessDocument } from '@/modules/profile/business/entities/business.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User> & {
  business?: BusinessDocument;
};

@Schema()
export class User extends BaseEntity {
  @Prop()
  name: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ type: String, enum: ['admin', 'business', 'client'] })
  role: Roles;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

UserSchema.virtual('business', {
  ref: 'Business',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

UserSchema.pre('findOneAndDelete', async function (next) {
  const user: UserDocument | null = await this.model.findOne(this.getFilter());

  if (user) {
    await this.model.db
      .collection('businesses')
      .deleteOne({ userId: user._id });
  }
  next();
});
