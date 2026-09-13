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

import { CreateQuestDto } from './dto/create-quest.dto.js';
import { UpdateQuestDto } from './dto/update-quest.dto.js';
import { QuestsService } from './quests.service.js';

@Controller('quests')
@UseGuards(FirebaseAuthGuard)
export class QuestsController {
    constructor(
        private readonly questsService: QuestsService,
        private readonly usersService: UsersService,
    ) { }

    @Post()
    async create(
        @CurrentUser() user: any,
        @Body() dto: CreateQuestDto,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.create(
            userId,
            dto,
        );
    }

    @Get()
    async findAll(
        @CurrentUser() user: any,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.findAll(
            userId,
        );
    }

    @Get('history')
    async history(
        @CurrentUser() user: any,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.history(
            userId,
        );
    }

    @Post(':id/complete')
    async complete(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.complete(
            userId,
            id,
        );
    }

    @Get(':id')
    async findOne(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.findOne(
            userId,
            id,
        );
    }

    @Patch(':id')
    async update(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateQuestDto,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.update(
            userId,
            id,
            dto,
        );
    }

    @Delete(':id')
    async remove(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        const userId =
            await this.usersService.getInternalUserId(
                user.uid,
            );

        return this.questsService.remove(
            userId,
            id,
        );
    }
}