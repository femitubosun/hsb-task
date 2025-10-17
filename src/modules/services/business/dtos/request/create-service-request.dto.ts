import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsNumber()
  @Min(0)
  bufferBefore: number;

  @IsNumber()
  @Min(0)
  bufferAfter: number;

  @IsNumber()
  @Min(1)
  price: number;
}
