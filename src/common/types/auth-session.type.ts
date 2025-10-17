// import { UserDocument } from '@/identity/users/schemas/user.schema';

export type AuthSessionType = {
  user: SessionUser;
  version: number;
};

export type SessionUser = Pick<
  { email: string; name: string; role: string },
  'email' | 'name' | 'role'
> & {
  _id: string;
  provider?: {
    _id: string;
    name: string;
  };
};
