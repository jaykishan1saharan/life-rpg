import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InventoryRepository } from './inventory.repository.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
  ) {}

  async getInventory(userId: string) {
    return this.repository.getInventory(userId);
  }

  async equip(
    userId: string,
    itemId: string,
  ) {
    try {
      return await this.repository.equip(
        userId,
        itemId,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Equip failed';

      if (message === 'Reward not found') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  async unequip(
    userId: string,
    itemId: string,
  ) {
    try {
      return await this.repository.unequip(
        userId,
        itemId,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unequip failed';

      throw new BadRequestException(message);
    }
  }
}