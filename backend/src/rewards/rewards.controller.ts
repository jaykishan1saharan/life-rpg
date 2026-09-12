import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

import { RewardsService } from './rewards.service.js';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('rewards')
  async getRewards() {
    return this.rewardsService.getRewards();
  }

  @Post('rewards/:id/purchase')
  async purchase(
    @Param('id') itemId: string,
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.rewardsService.purchase(
      userId,
      itemId,
    );
  }

  @Get('inventory')
  async getInventory(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.rewardsService.getInventory(
      userId,
    );
  }
}