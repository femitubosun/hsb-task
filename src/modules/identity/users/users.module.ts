import { Module } from '@nestjs/common';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './user.service';

const ENTITIES = [{ name: User.name, schema: UserSchema }];

@Module({
  imports: [MongooseModule.forFeature(ENTITIES)],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
