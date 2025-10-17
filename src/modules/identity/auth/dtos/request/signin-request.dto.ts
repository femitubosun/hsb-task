import { IsEmail, IsString } from 'class-validator';

export class SigninRequestDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
