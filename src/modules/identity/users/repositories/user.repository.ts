import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { User, UserDocument } from '../entities/user.entity';
import { IUserRepository } from '../interfaces/user-repository.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserRepository
  extends BaseRepositoryAbstract<UserDocument>
  implements IUserRepository
{
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }
}
