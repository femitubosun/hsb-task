import { IsEmail, IsEnum, IsString } from 'class-validator';

export enum UserRoles {
  ADMIN = 'admin',
  BUSINESS = 'business',
  CLIENT = 'client',
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(UserRoles)
  role: UserRoles;
}
