import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

import { InventoryService } from './inventory.service.js';

@Controller('inventory')
@UseGuards(FirebaseAuthGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly usersService: UsersService,
  ) {}

  // GET /inventory
  @Get()
  async getInventory(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.inventoryService.getInventory(
      userId,
    );
  }

  // POST /inventory/:itemId/equip
  @Post(':itemId/equip')
  async equip(
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.inventoryService.equip(
      userId,
      itemId,
    );
  }

  // DELETE /inventory/:itemId/equip
  @Delete(':itemId/equip')
  async unequip(
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.inventoryService.unequip(
      userId,
      itemId,
    );
  }
}