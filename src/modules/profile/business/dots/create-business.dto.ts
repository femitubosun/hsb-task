import { IsString, IsOptional, IsObject } from 'class-validator';
import { Types } from 'mongoose';

export class CreateBusinessDto {
  @IsObject()
  userId: Types.ObjectId;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  profileImgUrl?: string;
}
