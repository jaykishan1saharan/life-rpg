import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { RpgModule } from './rpg/rpg.module.js';
import { RewardsModule } from './rewards/rewards.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { HydrationModule } from './hydration/hydration.module.js';

import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ScheduleModule.forRoot(),

    DatabaseModule,
    AuthModule,
    UsersModule,
    QuestsModule,
    RpgModule,
    RewardsModule,
    InventoryModule,
    HydrationModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}