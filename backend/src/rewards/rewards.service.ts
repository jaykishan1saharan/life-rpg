import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RewardsRepository } from './rewards.repository.js';

@Injectable()
export class RewardsService {
  constructor(
    private readonly repository: RewardsRepository,
  ) {}

  async getRewards() {
    return this.repository.findAll();
  }

  async purchase(
    userId: string,
    itemId: string,
  ) {
    try {
      const result =
        await this.repository.purchase(
          userId,
          itemId,
        );

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Purchase failed';

      if (
        message === 'Reward not found'
      ) {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  async getInventory(userId: string) {
    return this.repository.getInventory(
      userId,
    );
  }
}