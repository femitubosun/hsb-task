import { IsEmail, IsString } from 'class-validator';

export class SignupRequestDto {
  @IsString()
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
