import { Module } from '@nestjs/common';

import { HydrationController } from './hydration.controller.js';
import { HydrationService } from './hydration.service.js';
import { HydrationRepository } from './hydration.repository.js';
import { HydrationScheduler } from './hydration.scheduler.js';
import { HydrationScheduleEngine } from './hydration.schedule-engine.js';

import { UsersModule } from '../users/users.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    NotificationsModule,
  ],

  controllers: [
    HydrationController,
  ],

  providers: [
    HydrationService,
    HydrationRepository,
    HydrationScheduler,
    HydrationScheduleEngine,
  ],

  exports: [
    HydrationService,
    HydrationRepository,
  ],
})
export class HydrationModule {}