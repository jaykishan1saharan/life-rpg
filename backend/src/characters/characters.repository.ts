import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class CharactersRepository {
  constructor(
    private readonly database: DatabaseService,
  ) { }

  async findByUserId(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        id,
        user_id,
        level,
        total_xp,
        gold,
        strength,
        intellect,
        discipline,
        creativity,
        current_streak,
        longest_streak,
        last_activity_date,
        created_at,
        updated_at
      FROM characters
      WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async create(userId: string) {
    const result = await this.database.query(
      `
      INSERT INTO characters (
        user_id
      )
      VALUES ($1)
      RETURNING *
      `,
      [userId],
    );

    return result.rows[0];
  }

  async findOrCreate(userId: string) {
    const existingCharacter = await this.findByUserId(userId);

    if (existingCharacter) {
      return existingCharacter;
    }

    return this.create(userId);
  }

  async updateProgress(
    client: import('pg').PoolClient,
    userId: string,
    data: {
      level: number;
      totalXp: number;
      gold: number;
      attribute: string;
      attributePoints: number;
      currentStreak: number;
      longestStreak: number;
      lastActivityDate: string;
    },
  ) {
    const attributeColumnMap: Record<
      string,
      string
    > = {
      STRENGTH: 'strength',
      INTELLECT: 'intellect',
      DISCIPLINE: 'discipline',
      CREATIVITY: 'creativity',
    };

    const attributeColumn =
      attributeColumnMap[data.attribute];

    if (!attributeColumn) {
      throw new Error('Invalid attribute');
    }

    const query = `
    UPDATE characters
    SET
      level = $2,
      total_xp = $3,
      gold = $4,
      ${attributeColumn} =
        ${attributeColumn} + $5,
      current_streak = $6,
      longest_streak = $7,
      last_activity_date = $8,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;

    const result = await client.query(
      query,
      [
        userId,
        data.level,
        data.totalXp,
        data.gold,
        data.attributePoints,
        data.currentStreak,
        data.longestStreak,
        data.lastActivityDate,
      ],
    );

    return result.rows[0] ?? null;
  }
}