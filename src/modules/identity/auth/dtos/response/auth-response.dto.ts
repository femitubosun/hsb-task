import { IsObject, IsString } from 'class-validator';
import type { SessionUser } from '@/common/types/auth-session.type';

export class AuthResponseDto {
  @IsObject()
  user: SessionUser;

  @IsString()
  token: string;
}
