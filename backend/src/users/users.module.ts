import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CharactersModule } from '../characters/characters.module.js';

import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    AuthModule,
    CharactersModule,
  ],
  controllers: [
    UsersController,
  ],
  providers: [
    UsersService,
    UsersRepository,
  ],
  exports: [
    UsersService,
  ],
})
export class UsersModule {}