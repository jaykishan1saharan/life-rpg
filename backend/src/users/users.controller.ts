import {
  Controller,
  Delete,
  Get,
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

  @Delete('me')
  @UseGuards(FirebaseAuthGuard)
  async deleteMe(@CurrentUser() user: any) {
    return this.usersService.deleteByFirebaseUid(
      user.uid,
    );
  }
}