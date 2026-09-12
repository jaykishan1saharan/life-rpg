import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { RpgModule } from '../rpg/rpg.module.js';
import { CharactersModule } from '../characters/characters.module.js';

import { QuestsController } from './quests.controller.js';
import { QuestsRepository } from './quests.repository.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RpgModule,
    CharactersModule,
  ],
  controllers: [
    QuestsController,
  ],
  providers: [
    QuestsService,
    QuestsRepository,
  ],
})
export class QuestsModule {}