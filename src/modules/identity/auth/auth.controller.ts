import { AuthUser, Public } from '@/common/decorators';
import { AuthService } from '@/modules/identity/auth/services';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { MessageResponseDto } from '@/common/dtos/response/message-response.dto';
import type { SessionUser } from '@/common/types/auth-session.type';
import {
  SigninRequestDto,
  SignupBusinessRequestDto,
  SignupRequestDto,
} from '@/modules/identity/auth/dtos/request';
import { AuthResponseDto } from '@/modules/identity/auth/dtos/response';
import { LOGOUT_SUCCESSFUL } from '@/modules/identity/auth/message';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup/client')
  async signUpClient(
    @Body() input: SignupRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.signupClient(input);
  }

  @Public()
  @Post('signup/business')
  async signUpBusiness(
    @Body() input: SignupBusinessRequestDto,
  ): Promise<AuthResponseDto> {
    return this.authService.signupBusiness(input);
  }

  @Public()
  @Post('signup/admin')
  async signUpAdmin(@Body() input: SignupRequestDto): Promise<AuthResponseDto> {
    return this.authService.signupAdmin(input);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(@Body() input: SigninRequestDto): Promise<AuthResponseDto> {
    return this.authService.signIn(input);
  }

  @Get('logout')
  async logout(@AuthUser() user: SessionUser): Promise<MessageResponseDto> {
    await this.authService.logout(user);

    return {
      message: LOGOUT_SUCCESSFUL,
    };
  }
}
