import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceRequestDto } from './create-service-request.dto';

export class UpdateServiceRequestDto extends PartialType(
  CreateServiceRequestDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
