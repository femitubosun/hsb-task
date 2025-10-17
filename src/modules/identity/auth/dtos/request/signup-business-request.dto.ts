import { IntersectionType } from '@nestjs/swagger';

import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SignupRequestDto } from '@/modules/identity/auth/dtos/request/signup-request.dto';

class BusinessDto {
  @IsString()
  name: string;
}

export class SignupBusinessRequestDto extends IntersectionType(
  SignupRequestDto,
) {
  @IsObject()
  @Type(() => BusinessDto)
  @ValidateNested()
  business: BusinessDto;
}
