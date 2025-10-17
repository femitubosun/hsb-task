import { IsString } from 'class-validator';

export class MessageResponseDto {
  @IsString()
  message: string;
}
