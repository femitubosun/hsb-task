import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Service, Servicechema } from './entities/service.entity';
import { ServiceRepository } from './repositories/service.repository';
import { ServicesService } from './services/services.service';

const ENTITIES = [
  {
    name: Service.name,
    schema: Servicechema,
  },
];

@Module({
  imports: [MongooseModule.forFeature(ENTITIES)],
  providers: [
    ServicesService,
    {
      provide: 'IServicesRepository',
      useClass: ServiceRepository,
    },
  ],
  exports: [ServicesService],
})
export class ServicesModule {}
