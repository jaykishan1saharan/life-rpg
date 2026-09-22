import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

import { HydrationService } from './hydration.service.js';

@Controller('hydration')
@UseGuards(FirebaseAuthGuard)
export class HydrationController {
  constructor(
    private readonly hydrationService: HydrationService,
    private readonly usersService: UsersService,
  ) { }

  @Get()
  async getHydration(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.getHydration(
      userId,
    );
  }

  @Post('setup')
  async setup(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.setup(
      userId,
      body,
    );
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: any,
    @Body() body: Record<string, unknown>,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.updateSettings(
      userId,
      body,
    );
  }

  @Post('log')
  async logWater(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.logWater(
      userId,
      Number(body.amountMl),
      body.source ?? 'MANUAL',
      body.loggedAt,
    );
  }

  @Post('reminder/:eventId/drank')
  async markReminderDrank(
    @CurrentUser() user: any,
    @Param('eventId') eventId: string,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.markReminderDrank(
      userId,
      eventId,
      Number(body.amountMl ?? 250),
    );
  }

  @Post('reminder/:eventId/snooze')
  async snoozeReminder(
    @CurrentUser() user: any,
    @Param('eventId') eventId: string,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.snoozeReminder(
      userId,
      eventId,
      Number(body.snoozeMinutes ?? 15),
    );
  }

  @Post('native-reminder-action')
  async nativeReminderAction(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {

    const userId =
      await this.usersService
        .getInternalUserId(
          user.uid,
        );

    return this.hydrationService
      .processNativeReminderAction(
        userId,

        body.action,

        Number(
          body.amountMl ??
          250,
        ),

        Number(
          body.alarmId ??
          0,
        ),

        Number(
          body.triggerAt ??
          0,
        ),

        Number(
          body.snoozeMinutes ??
          15,
        ),
      );
  }

  @Post('push/register')
  async registerPushDevice(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.registerPushDevice(
      userId,
      body.fcmToken,
    );
  }

  @Delete('push/register')
  async unregisterPushDevice(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.unregisterPushDevice(
      userId,
      body.fcmToken,
    );
  }

  @Get('today')
  async getToday(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.getToday(
      userId,
    );
  }

  @Get('next-reminder')
  async getNextReminder(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.getNextReminder(
      userId,
    );
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: any,
  ) {
    const userId =
      await this.usersService.getInternalUserId(
        user.uid,
      );

    return this.hydrationService.getHistory(
      userId,
    );
  }
}