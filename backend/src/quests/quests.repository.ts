import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class QuestsRepository {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async create(
        userId: string,
        data: {
            title: string;
            description?: string;
            category: string;
            difficulty: string;
            attribute: string;
            xpReward: number;
            goldReward: number;
            attributeReward?: number;
        },
    ) {
        const result = await this.database.query(
            `
      INSERT INTO quests (
        user_id,
        title,
        description,
        category,
        difficulty,
        attribute,
        xp_reward,
        gold_reward,
        attribute_reward
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )
      RETURNING *
      `,
            [
                userId,
                data.title,
                data.description ?? null,
                data.category,
                data.difficulty,
                data.attribute,
                data.xpReward,
                data.goldReward,
                data.attributeReward ?? 1,
            ],
        );

        return result.rows[0];
    }

    // Only return quests that have NEVER been completed.
    async findAll(userId: string) {
        const result = await this.database.query(
            `
      SELECT
        q.id,
        q.title,
        q.description,
        q.category,
        q.difficulty,
        q.attribute,
        q.xp_reward,
        q.gold_reward,
        q.attribute_reward,
        q.is_active,
        q.created_at,
        q.updated_at

      FROM quests q

      WHERE q.user_id = $1
        AND q.is_active = TRUE

        AND NOT EXISTS (
          SELECT 1
          FROM quest_completions qc
          WHERE qc.quest_id = q.id
            AND qc.user_id = $1
        )

      ORDER BY q.created_at DESC
      `,
            [userId],
        );

        return result.rows;
    }

    async findById(
        id: string,
        userId: string,
    ) {
        const result = await this.database.query(
            `
      SELECT *
      FROM quests
      WHERE id = $1
        AND user_id = $2
      `,
            [id, userId],
        );

        return result.rows[0] ?? null;
    }

    async update(
        id: string,
        userId: string,
        data: {
            title?: string;
            description?: string;
            category?: string;
            difficulty?: string;
            attribute?: string;
            xpReward?: number;
            goldReward?: number;
            attributeReward?: number;
            isActive?: boolean;
        },
    ) {
        const result = await this.database.query(
            `
      UPDATE quests
      SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        category = COALESCE($5, category),
        difficulty = COALESCE($6, difficulty),
        attribute = COALESCE($7, attribute),
        xp_reward = COALESCE($8, xp_reward),
        gold_reward = COALESCE($9, gold_reward),
        attribute_reward = COALESCE($10, attribute_reward),
        is_active = COALESCE($11, is_active),
        updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
      RETURNING *
      `,
            [
                id,
                userId,
                data.title ?? null,
                data.description ?? null,
                data.category ?? null,
                data.difficulty ?? null,
                data.attribute ?? null,
                data.xpReward ?? null,
                data.goldReward ?? null,
                data.attributeReward ?? null,
                data.isActive ?? null,
            ],
        );

        return result.rows[0] ?? null;
    }

    async delete(
        id: string,
        userId: string,
    ) {
        const result = await this.database.query(
            `
      DELETE FROM quests
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
            [id, userId],
        );

        return result.rows[0] ?? null;
    }

    // Check whether this quest has EVER been completed.
    async hasCompleted(
        client: import('pg').PoolClient,
        questId: string,
        userId: string,
    ) {
        const result = await client.query(
            `
      SELECT id
      FROM quest_completions
      WHERE quest_id = $1
        AND user_id = $2
      LIMIT 1
      `,
            [questId, userId],
        );

        return result.rows.length > 0;
    }

    async createCompletion(
        client: import('pg').PoolClient,
        data: {
            questId: string;
            userId: string;
            xpEarned: number;
            goldEarned: number;
            attribute: string;
            attributePoints: number;
        },
    ) {
        const result = await client.query(
            `
      INSERT INTO quest_completions (
        quest_id,
        user_id,
        xp_earned,
        gold_earned,
        attribute,
        attribute_points
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
            [
                data.questId,
                data.userId,
                data.xpEarned,
                data.goldEarned,
                data.attribute,
                data.attributePoints,
            ],
        );

        return result.rows[0];
    }

    // Return completed quest history.
    async findHistory(userId: string) {
        const result = await this.database.query(
            `
      SELECT
        qc.id AS completion_id,
        qc.quest_id,
        qc.xp_earned,
        qc.gold_earned,
        qc.attribute,
        qc.attribute_points,
        qc.completed_at,

        q.title,
        q.description,
        q.category,
        q.difficulty

      FROM quest_completions qc

      INNER JOIN quests q
        ON q.id = qc.quest_id

      WHERE qc.user_id = $1

      ORDER BY qc.completed_at DESC
      `,
            [userId],
        );

        return result.rows;
    }

    async createActivityLog(
        client: import('pg').PoolClient,
        data: {
            userId: string;
            type: string;
            title: string;
            description?: string;
            xpChange?: number;
            goldChange?: number;
            metadata?: Record<string, unknown>;
        },
    ) {
        const result = await client.query(
            `
      INSERT INTO activity_logs (
        user_id,
        type,
        title,
        description,
        xp_change,
        gold_change,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
            [
                data.userId,
                data.type,
                data.title,
                data.description ?? null,
                data.xpChange ?? 0,
                data.goldChange ?? 0,
                data.metadata
                    ? JSON.stringify(data.metadata)
                    : null,
            ],
        );

        return result.rows[0];
    }
}