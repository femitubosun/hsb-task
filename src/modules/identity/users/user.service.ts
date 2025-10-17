import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from './interfaces/user-repository.interface';
import { CreateUserDto, UserRoles } from './dtos/create-user.dto';
import { hashInput } from '@/common/utils/hash.utils';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async create(input: CreateUserDto) {
    const { password, ...rest } = input;

    return this.userRepository.create({
      ...rest,
      password: await hashInput(password),
    });
  }

  async findByEmail(email: string) {
    return this.userRepository.findOneByCondition({ email });
  }

  findById(id: string) {
    return this.userRepository.findOneById(id);
  }

  async findAll(condition: object = {}, options?: object) {
    return this.userRepository.findAll(condition, options);
  }

  async update(
    id: string,
    updateData: Partial<{
      name: string;
      email: string;
      password: string;
      role: UserRoles;
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
