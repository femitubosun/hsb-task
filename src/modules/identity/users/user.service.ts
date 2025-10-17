import { User } from '@/modules/identity/users/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).populate('provider').exec();
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    const { role, ...rest } = input;

    const newUser = new this.userModel({ ...rest, role });

    return newUser.save();
  }

  async findById(id: string) {
    return this.userModel.findById(id).populate('provider').exec();
  }
}
