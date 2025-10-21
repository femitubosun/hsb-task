import { Module } from '@nestjs/common';
import { Business, BusinessSchema } from './entities/business.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessService } from '@/modules/profile/business/services/business.service';
import { BusinessRepository } from '@/modules/profile/business/repositories/business.repository';

const ENTITIES = [
  {
    name: Business.name,
    schema: BusinessSchema,
  },
];

@Module({
  imports: [MongooseModule.forFeature(ENTITIES)],
  providers: [
    BusinessService,
    {
      provide: 'IBusinessRepository',
      useClass: BusinessRepository,
    },
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
