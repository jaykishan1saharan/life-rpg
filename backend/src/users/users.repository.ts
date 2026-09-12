import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class UsersRepository {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  async findById(id: string) {
    const result = await this.database.query(
      `
      SELECT
        id,
        firebase_uid,
        email,
        display_name,
        avatar_url,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByFirebaseUid(firebaseUid: string) {
    const result = await this.database.query(
      `
      SELECT
        id,
        firebase_uid,
        email,
        display_name,
        avatar_url,
        created_at,
        updated_at
      FROM users
      WHERE firebase_uid = $1
      `,
      [firebaseUid],
    );

    return result.rows[0] ?? null;
  }

  async upsert(
    firebaseUid: string,
    email: string,
    displayName: string | null,
    avatarUrl: string | null,
  ) {
    const result = await this.database.query(
      `
      INSERT INTO users (
        firebase_uid,
        email,
        display_name,
        avatar_url
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (firebase_uid)
      DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING *
      `,
      [
        firebaseUid,
        email,
        displayName,
        avatarUrl,
      ],
    );

    return result.rows[0];
  }
}