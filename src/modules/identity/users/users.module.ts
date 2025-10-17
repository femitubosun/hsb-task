import { Module } from '@nestjs/common';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './user.service';
import { UserRepository } from './repositories/user.repository';

const ENTITIES = [{ name: User.name, schema: UserSchema }];

@Module({
  imports: [MongooseModule.forFeature(ENTITIES)],
  providers: [
    UsersService,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
