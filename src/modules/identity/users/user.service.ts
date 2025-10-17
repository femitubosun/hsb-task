import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from './interfaces/user-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async findByEmail(email: string) {
    return this.userRepository.findOneByCondition({ email });
  }

  async create(input: {
    name: string;
    email: string;
    password: string;
    // role: string;
  }) {
    return this.userRepository.create(input);
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
      role: string;
    }>,
  ) {
    return this.userRepository.update(id, updateData as any);
  }

  async softDelete(id: string) {
    return this.userRepository.softDelete(id);
  }

  async hardDelete(id: string) {
    return this.userRepository.hardDelete(id);
  }
}
