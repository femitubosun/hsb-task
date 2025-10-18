import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class PriceModifierDto {
  @IsEnum(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value: number;
}

export class CreateAvailabilityOverrideRequestDto {
  @IsDateString()
  date: string;

  @IsEnum(['closed', 'modified_hours'])
  type: 'closed' | 'modified_hours';

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @ValidateNested()
  @Type(() => PriceModifierDto)
  @IsOptional()
  priceModifier?: PriceModifierDto;
}
