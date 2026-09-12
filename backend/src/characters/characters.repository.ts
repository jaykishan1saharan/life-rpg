import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class CharactersRepository {
  constructor(
    private readonly database: DatabaseService,
  ) {}

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
}