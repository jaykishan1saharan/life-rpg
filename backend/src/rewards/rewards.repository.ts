import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class RewardsRepository {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  async findAll() {
    const result = await this.database.query(`
      SELECT
        id,
        name,
        description,
        type,
        price,
        image_url,
        metadata,
        is_active,
        created_at
      FROM shop_items
      WHERE is_active = TRUE
      ORDER BY price ASC
    `);

    return result.rows;
  }

  async findById(id: string) {
    const result = await this.database.query(
      `
      SELECT *
      FROM shop_items
      WHERE id = $1
        AND is_active = TRUE
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findOwned(
    userId: string,
    itemId: string,
  ) {
    const result = await this.database.query(
      `
      SELECT *
      FROM inventory
      WHERE user_id = $1
        AND item_id = $2
      `,
      [userId, itemId],
    );

    return result.rows[0] ?? null;
  }

  async getInventory(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        i.id,
        i.purchased_at,
        s.id AS item_id,
        s.name,
        s.description,
        s.type,
        s.price,
        s.image_url,
        s.metadata
      FROM inventory i
      INNER JOIN shop_items s
        ON s.id = i.item_id
      WHERE i.user_id = $1
      ORDER BY i.purchased_at DESC
      `,
      [userId],
    );

    return result.rows;
  }

  async purchase(
    userId: string,
    itemId: string,
  ) {
    return this.database.transaction(
      async (client) => {
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
          throw new Error(
            'Character not found',
          );
        }

        const itemResult =
          await client.query(
            `
            SELECT *
            FROM shop_items
            WHERE id = $1
              AND is_active = TRUE
            `,
            [itemId],
          );

        const item = itemResult.rows[0];

        if (!item) {
          throw new Error(
            'Reward not found',
          );
        }

        const ownedResult =
          await client.query(
            `
            SELECT id
            FROM inventory
            WHERE user_id = $1
              AND item_id = $2
            `,
            [userId, itemId],
          );

        if (ownedResult.rows.length > 0) {
          throw new Error(
            'Reward already owned',
          );
        }

        if (character.gold < item.price) {
          throw new Error(
            'Not enough gold',
          );
        }

        await client.query(
          `
          UPDATE characters
          SET
            gold = gold - $1,
            updated_at = NOW()
          WHERE user_id = $2
          `,
          [item.price, userId],
        );

        const inventoryResult =
          await client.query(
            `
            INSERT INTO inventory (
              user_id,
              item_id
            )
            VALUES ($1, $2)
            RETURNING *
            `,
            [userId, itemId],
          );

        await client.query(
          `
          INSERT INTO activity_logs (
            user_id,
            type,
            title,
            description,
            gold_change,
            metadata
          )
          VALUES (
            $1,
            'ITEM_PURCHASED',
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            userId,
            `Purchased ${item.name}`,
            `Purchased ${item.name} from the Reward Shop.`,
            -item.price,
            JSON.stringify({
              itemId: item.id,
              itemType: item.type,
            }),
          ],
        );

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
          item,
          inventory:
            inventoryResult.rows[0],
          character:
            updatedCharacter.rows[0],
        };
      },
    );
  }
}