import { Request } from 'express';
import { SessionUser } from '@core/types/auth-session.type';

export type AuthedRequest = Request & { user: SessionUser };
