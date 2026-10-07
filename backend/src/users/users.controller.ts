import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return this.usersService.syncUser(user);
  }

  @Delete('internal/firebase/:firebaseUid')
  async deleteFirebaseUser(
    @Param('firebaseUid') firebaseUid: string,
    @Headers('x-internal-secret') internalSecret?: string,
  ) {
    const expectedSecret =
      process.env.INTERNAL_CLEANUP_SECRET;

    if (
      !expectedSecret ||
      internalSecret !== expectedSecret
    ) {
      throw new UnauthorizedException(
        'Invalid internal cleanup secret',
      );
    }

    const deletedUser =
      await this.usersService.deleteByFirebaseUid(
        firebaseUid,
      );

    return {
      success: true,
      deleted: Boolean(deletedUser),
      firebaseUid,
    };
  }
}