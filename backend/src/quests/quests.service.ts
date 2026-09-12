import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { CreateQuestDto } from './dto/create-quest.dto.js';
import { UpdateQuestDto } from './dto/update-quest.dto.js';
import { QuestsRepository } from './quests.repository.js';

import { DatabaseService } from '../database/database.service.js';
import { RpgEngine } from '../rpg/rpg.engine.js';
import { CharactersRepository } from '../characters/characters.repository.js';

@Injectable()
export class QuestsService {
    constructor(
        private readonly questsRepository: QuestsRepository,
        private readonly database: DatabaseService,
        private readonly rpgEngine: RpgEngine,
        private readonly charactersRepository: CharactersRepository,
    ) { }

    async create(
        userId: string,
        dto: CreateQuestDto,
    ) {
        return this.questsRepository.create(
            userId,
            dto,
        );
    }

    async findAll(userId: string) {
        return this.questsRepository.findAllByUserId(
            userId,
        );
    }

    async findOne(
        userId: string,
        questId: string,
    ) {
        const quest =
            await this.questsRepository.findById(
                questId,
                userId,
            );

        if (!quest) {
            throw new NotFoundException(
                'Quest not found',
            );
        }

        return quest;
    }

    async update(
        userId: string,
        questId: string,
        dto: UpdateQuestDto,
    ) {
        const quest =
            await this.questsRepository.update(
                questId,
                userId,
                dto,
            );

        if (!quest) {
            throw new NotFoundException(
                'Quest not found',
            );
        }

        return quest;
    }

    async remove(
        userId: string,
        questId: string,
    ) {
        const quest =
            await this.questsRepository.delete(
                questId,
                userId,
            );

        if (!quest) {
            throw new NotFoundException(
                'Quest not found',
            );
        }

        return {
            message: 'Quest deleted successfully',
        };
    }

    async complete(
        userId: string,
        questId: string,
    ) {
        return this.database.transaction(
            async (client) => {
                const questResult = await client.query(
                    `
        SELECT *
        FROM quests
        WHERE id = $1
          AND user_id = $2
          AND is_active = TRUE
        FOR UPDATE
        `,
                    [questId, userId],
                );

                const quest = questResult.rows[0];

                if (!quest) {
                    throw new NotFoundException(
                        'Quest not found',
                    );
                }

                const alreadyCompleted =
                    await this.questsRepository.hasCompletedToday(
                        client,
                        questId,
                        userId,
                    );

                if (alreadyCompleted) {
                    throw new ConflictException(
                        'Quest already completed today',
                    );
                }

                const reward =
                    this.rpgEngine.getDifficultyReward(
                        quest.difficulty,
                    );

                const xpEarned = reward.xp;
                const goldEarned = reward.gold;

                const characterResult =
                    await client.query(
                        `
          SELECT *
          FROM characters
          WHERE user_id = $1
          FOR UPDATE
          `,
                        [userId],
                    );

                const character =
                    characterResult.rows[0];

                if (!character) {
                    throw new NotFoundException(
                        'Character not found',
                    );
                }

                const newTotalXp =
                    character.total_xp + xpEarned;

                const newGold =
                    character.gold + goldEarned;

                const levelResult =
                    this.rpgEngine.calculateLevel(
                        newTotalXp,
                        character.level,
                    );

                const today =
                    new Date()
                        .toISOString()
                        .split('T')[0];

                let currentStreak =
                    character.current_streak;

                let longestStreak =
                    character.longest_streak;

                if (
                    character.last_activity_date
                ) {
                    const lastDate =
                        new Date(
                            character.last_activity_date,
                        );

                    const todayDate =
                        new Date(today);

                    const diff =
                        Math.floor(
                            (
                                todayDate.getTime() -
                                lastDate.getTime()
                            ) /
                            (1000 * 60 * 60 * 24),
                        );

                    if (diff === 1) {
                        currentStreak++;
                    } else if (diff > 1) {
                        currentStreak = 1;
                    }
                } else {
                    currentStreak = 1;
                }

                longestStreak =
                    Math.max(
                        longestStreak,
                        currentStreak,
                    );

                await this.charactersRepository.updateProgress(
                    client,
                    userId,
                    {
                        level: levelResult.level,
                        totalXp: newTotalXp,
                        gold: newGold,
                        attribute: quest.attribute,
                        attributePoints:
                            quest.attribute_reward,
                        currentStreak,
                        longestStreak,
                        lastActivityDate: today,
                    },
                );

                const completion =
                    await this.questsRepository.createCompletion(
                        client,
                        {
                            questId,
                            userId,
                            xpEarned,
                            goldEarned,
                            attribute: quest.attribute,
                            attributePoints:
                                quest.attribute_reward,
                        },
                    );

                await this.questsRepository.createActivityLog(
                    client,
                    {
                        userId,
                        type: 'QUEST_COMPLETED',
                        title: `Quest completed: ${quest.title}`,
                        description:
                            'Quest completed successfully.',
                        xpChange: xpEarned,
                        goldChange: goldEarned,
                        metadata: {
                            questId,
                            difficulty: quest.difficulty,
                            attribute: quest.attribute,
                        },
                    },
                );

                if (levelResult.leveledUp) {
                    await this.questsRepository.createActivityLog(
                        client,
                        {
                            userId,
                            type: 'LEVEL_UP',
                            title: `Level ${levelResult.level} reached!`,
                            description:
                                'Your character leveled up.',
                            metadata: {
                                level: levelResult.level,
                            },
                        },
                    );
                }

                const updatedCharacter =
                    await client.query(
                        `
          SELECT *
          FROM characters
          WHERE user_id = $1
          `,
                        [userId],
                    );

                return {
                    quest: completion,
                    character:
                        updatedCharacter.rows[0],
                    rewards: {
                        xp: xpEarned,
                        gold: goldEarned,
                        attribute:
                            quest.attribute,
                        attributePoints:
                            quest.attribute_reward,
                    },
                    levelUp:
                        levelResult.leveledUp,
                    level:
                        levelResult.level,
                    streak: currentStreak,
                };
            },
        );
    }
}