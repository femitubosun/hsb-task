import type { IBusinessRepository } from '@/modules/profile/business/interfaces/business-repository.interface';
import { Injectable, Inject } from '@nestjs/common';
import { CreateBusinessDto } from '@/modules/profile/business/dots/create-business.dto';

@Injectable()
export class BusinessService {
  constructor(
    @Inject('IBusinessRepository')
    private readonly businessRepository: IBusinessRepository,
  ) {}

  async create(input: CreateBusinessDto) {
    return this.businessRepository.create(input);
  }
}
