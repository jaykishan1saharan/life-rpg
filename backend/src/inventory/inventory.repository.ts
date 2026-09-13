import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class InventoryRepository {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  // Get all items owned by the user
  async getInventory(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        i.id,
        i.user_id,
        i.item_id,
        i.is_equipped,
        i.purchased_at,

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

  // Equip an owned item
  async equip(
    userId: string,
    itemId: string,
  ) {
    return this.database.transaction(
      async (client) => {

        // 1. Check reward exists
        const itemResult = await client.query(
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
          throw new Error('Reward not found');
        }

        // 2. Check ownership
        const ownedResult = await client.query(
          `
          SELECT *
          FROM inventory
          WHERE user_id = $1
            AND item_id = $2
          FOR UPDATE
          `,
          [userId, itemId],
        );

        const ownedItem = ownedResult.rows[0];

        if (!ownedItem) {
          throw new Error(
            'You do not own this reward',
          );
        }

        // 3. BADGE
        // Multiple badges can be equipped.
        if (item.type === 'BADGE') {
          const result = await client.query(
            `
            UPDATE inventory
            SET is_equipped = NOT is_equipped
            WHERE id = $1
            RETURNING *
            `,
            [ownedItem.id],
          );

          return {
            message: result.rows[0].is_equipped
              ? 'Badge equipped'
              : 'Badge unequipped',

            item,
            inventory: result.rows[0],
          };
        }

        // 4. ITEM / THEME
        // Only one of the same type
        // can be equipped at a time.
        await client.query(
          `
          UPDATE inventory i
          SET is_equipped = FALSE
          FROM shop_items s
          WHERE i.item_id = s.id
            AND i.user_id = $1
            AND s.type = $2
            AND i.is_equipped = TRUE
          `,
          [userId, item.type],
        );

        // 5. Equip selected item
        const result = await client.query(
          `
          UPDATE inventory
          SET is_equipped = TRUE
          WHERE id = $1
          RETURNING *
          `,
          [ownedItem.id],
        );

        return {
          message: `${item.type} equipped`,
          item,
          inventory: result.rows[0],
        };
      },
    );
  }

  // Unequip an item
  async unequip(
    userId: string,
    itemId: string,
  ) {
    const result = await this.database.query(
      `
      UPDATE inventory
      SET is_equipped = FALSE
      WHERE user_id = $1
        AND item_id = $2
      RETURNING *
      `,
      [userId, itemId],
    );

    if (result.rows.length === 0) {
      throw new Error(
        'You do not own this reward',
      );
    }

    return {
      message: 'Item unequipped',
      inventory: result.rows[0],
    };
  }
}