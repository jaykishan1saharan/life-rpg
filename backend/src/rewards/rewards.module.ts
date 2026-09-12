import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';

import { RewardsController } from './rewards.controller.js';
import { RewardsRepository } from './rewards.repository.js';
import { RewardsService } from './rewards.service.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
  ],
  controllers: [
    RewardsController,
  ],
  providers: [
    RewardsRepository,
    RewardsService,
  ],
  exports: [
    RewardsService,
  ],
})
export class RewardsModule {}