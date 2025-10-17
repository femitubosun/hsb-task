import { ConfigService } from '@/core/config/config.service';

import { SessionService } from '@/modules/identity/auth/services/session.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  SigninRequestDto,
  SignupBusinessRequestDto,
  SignupRequestDto,
} from '../dtos/request';
import { AuthResponseDto } from '../dtos/response';

import { AuthSessionType, SessionUser } from '@/common/types/auth-session.type';
import { verifyHash } from '@/common/utils/hash.utils';
import {
  INVALID_CREDENTIALS,
  SOMETHING_WENT_WRONG,
  USER_EXISTS,
} from '@/modules/identity/auth/message';
import { UserDocument } from '@/modules/identity/users/entities/user.entity';
import { BusinessService } from '@/modules/profile/business/services/business.service';
import { UsersService } from '@modules/identity/users/services/user.service';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly businessService: BusinessService,
  ) {}

  async signupBusiness(
    input: SignupBusinessRequestDto,
  ): Promise<AuthResponseDto> {
    const { business, ...rest } = input;

    const existingUser = await this.userService.findByEmail(rest.email);

    if (existingUser) {
      throw new ConflictException(USER_EXISTS);
    }

    const user = await this.userService.create({
      ...input,
      role: 'business',
    });

    await this.businessService.create({
      userId: user._id as Types.ObjectId,
      ...business,
    });

    const createdUser = await this.userService.findById(String(user._id));

    if (!createdUser) {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }

    const authUser = this.#toSessionUser(createdUser);

    const token = await this.#createAuthSessionForUser(authUser);

    return {
      token,
      user: authUser,
    };
  }

  /**
   * @description Registers a new user and creates an authentication session.
   * @param input The signup request data containing user information.
   * @param role user role
   * @returns An object containing the JWT token and user session data.
   * @throws ConflictException if a user with the email already exists.
   */
  async signupClient(input: SignupRequestDto): Promise<AuthResponseDto> {
    const existingUser = await this.userService.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException(USER_EXISTS);
    }

    const user = await this.userService.create({
      ...input,
      role: 'client',
    });

    if (!user) {
      throw new InternalServerErrorException(SOMETHING_WENT_WRONG);
    }

    const authUser = this.#toSessionUser(user);

    const token = await this.#createAuthSessionForUser(authUser);

    return {
      token,
      user: authUser,
    };
  }

  /**
   * @description Authenticates an existing user and creates a new session.
   * @param input The signin request data containing email and password.
   * @returns An object containing the JWT token and user session data.
   * @throws BadRequestException if credentials are invalid.
   */
  async signIn(input: SigninRequestDto): Promise<AuthResponseDto> {
    const existingUser = await this.userService.findByEmail(input.email);

    if (!existingUser) {
      throw new BadRequestException(INVALID_CREDENTIALS);
    }

    const VALID_PASSWORD = await verifyHash(
      input.password,
      existingUser.password,
    );

    if (!VALID_PASSWORD) {
      throw new BadRequestException(INVALID_CREDENTIALS);
    }

    const user = this.#toSessionUser(existingUser);

    const token = await this.#createAuthSessionForUser(user);

    return {
      token,
      user,
    };
  }

  /**
   * @description Logs out currently signed-in user
   * @param user Currently logged-in user
   */
  async logout(user: SessionUser) {
    await this.sessionService.invalidate(user._id);
  }

  /**
   * @description Creates or updates an authentication session for a user.
   * Increments the session version to invalidate previous sessions.
   * @param user The session user object.
   * @returns A JWT token for the newly created session.
   */
  async #createAuthSessionForUser(user: SessionUser) {
    const existingSession = await this.sessionService.get(user._id);

    const newSessionVersion = (existingSession?.version ?? 0) + 1;

    const newSession = await this.sessionService.create(
      user,
      newSessionVersion,
    );

    return this.#makeJwtForSession(newSession);
  }

  /**
   * @description Generates a signed JWT token for an authentication session.
   * @param session The session object to encode in the token.
   * @returns A signed JWT token string.
   */
  async #makeJwtForSession(session: AuthSessionType): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: session.user._id,
        version: session.version,
      },
      {
        secret: this.configService.env('JWT_SECRET_KEY'),
        expiresIn: '6d',
      },
    );
  }

  /**
   * @description Converts a UserDocument to a SessionUser object.
   * Extracts only the necessary fields for session storage.
   * @param user The UserDocument from the database.
   * @returns A SessionUser object with essential user data.
   */
  #toSessionUser(user: UserDocument): SessionUser {
    return {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      ...(user.business && {
        business: {
          _id: String(user.business._id),
          name: user.business.name,
        },
      }),
    };
  }
}
