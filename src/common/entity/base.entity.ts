import { Prop } from '@nestjs/mongoose';
import { Expose, Transform } from 'class-transformer';
import { Schema, Types } from 'mongoose';

export class BaseEntity extends Schema {
  _id?: Types.ObjectId | string;

  @Expose()
  @Transform(
    (v: { obj?: { _id?: Types.ObjectId | string } }) => v.obj?._id?.toString(),
    {
      toClassOnly: true,
    },
  )
  id?: string;

  @Prop({ default: null })
  deletedAt?: Date;
}
