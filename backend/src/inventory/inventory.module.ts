import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';

import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { InventoryRepository } from './inventory.repository.js';

import { UsersModule } from '../users/users.module.js';

@Module({
    imports: [
        UsersModule,
        AuthModule,
    ],

    controllers: [
        InventoryController,
    ],

    providers: [
        InventoryService,
        InventoryRepository,
    ],

    exports: [
        InventoryService,
        InventoryRepository,
    ],
})
export class InventoryModule { }