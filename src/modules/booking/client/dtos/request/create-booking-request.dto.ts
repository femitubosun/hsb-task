import { HsbDateTimeDto } from '@/common/dtos/common/hsb-date-time.dto';
import { Type } from 'class-transformer';
import { IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateBookingRequestDto {
  @IsString()
  serviceId: string;

  @IsObject()
  @Type(() => HsbDateTimeDto)
  @ValidateNested()
  dateTime: HsbDateTimeDto;

  @IsUUID()
  idempotencyKey: string;
}
