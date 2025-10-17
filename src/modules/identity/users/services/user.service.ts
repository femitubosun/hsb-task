import { Roles } from '@/common/types/roles.type';
import { hashInput } from '@/common/utils/hash.utils';
import { UserDocument } from '@/modules/identity/users/entities/user.entity';
import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dtos/create-user.dto';
import type { IUserRepository } from '../interfaces/user-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async create(input: CreateUserDto): Promise<UserDocument> {
    const { password, ...rest } = input;

    return this.userRepository.create({
      ...rest,
      password: await hashInput(password),
    });
  }

  async findByEmail(email: string) {
    return this.userRepository.findOneByCondition({ email }, undefined, {
      populate: 'business',
    });
  }

  findById(id: string) {
    return this.userRepository.findOneById(id, undefined, {
      populate: 'business',
    });
  }

  async findAll(condition: object = {}, options?: object) {
    return this.userRepository.findMany(condition, options);
  }

  async update(
    id: string,
    updateData: Partial<{
      name: string;
      email: string;
      password: string;
      role: Roles;
    }>,
  ) {
    return this.userRepository.update(id, updateData);
  }

  async softDelete(id: string) {
    return this.userRepository.softDelete(id);
  }

  async hardDelete(id: string) {
    return this.userRepository.hardDelete(id);
  }
}
