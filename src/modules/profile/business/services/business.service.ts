import { CreateBusinessDto } from '@/modules/profile/business/dots/create-business.dto';
import type { IBusinessRepository } from '@/modules/profile/business/interfaces/business-repository.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class BusinessService {
  constructor(
    @Inject('IBusinessRepository')
    private readonly businessRepository: IBusinessRepository,
  ) {}

  async create(input: CreateBusinessDto) {
    return this.businessRepository.create(input);
  }

  async list() {
    return this.businessRepository.findMany({});
  }

  async getById(businessId: string) {
    return this.businessRepository.findOneById(businessId, undefined, {
      populate: { path: 'services', match: { deletedAt: null } },
    });
  }
}
