import { UserDocument } from '@/modules/identity/users/entities/user.entity';

export type AuthSessionType = {
  user: SessionUser;
  version: number;
};

export type SessionUser = Pick<UserDocument, 'email' | 'name' | 'role'> & {
  _id: string;
  business?: {
    _id: string;
    name: string;
  };
};
