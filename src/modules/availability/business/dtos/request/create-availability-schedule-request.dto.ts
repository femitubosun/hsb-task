import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

export class CreateAvailabilityScheduleRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek: string[];

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsDateString()
  effectiveFrom: string;

  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;
}
