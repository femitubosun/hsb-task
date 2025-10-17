import { Request } from 'express';
import { SessionUser } from '@/common/types/auth-session.type';

export type AuthedRequest = Request & { user: SessionUser };
