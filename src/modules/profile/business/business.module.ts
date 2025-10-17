import { Module } from '@nestjs/common';
import { Business, BusinessSchema } from './entities/business.entity';
import { MongooseModule } from '@nestjs/mongoose';

const ENTITIES = [
  {
    name: Business.name,
    schema: BusinessSchema,
  },
];

@Module({ imports: [MongooseModule.forFeature(ENTITIES)] })
export class BusinessModule {}
