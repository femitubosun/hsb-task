import { IsValidDateString } from '@/common/validators/is-valid-date-string.validator';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export enum OverrideType {
  CLOSED = 'closed',
  MODIFIED_HOURS = 'modified_hours',
}

export enum PriceModifierType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

class PriceModifierDto {
  @IsEnum(PriceModifierType)
  type: PriceModifierType;

  @IsNumber()
  @Min(0)
  value: number;
}

export class CreateAvailabilityOverrideRequestDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  @IsValidDateString()
  date: string;

  @IsEnum(OverrideType)
  type: OverrideType;

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
