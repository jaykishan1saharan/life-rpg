import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class HydrationRepository {
  constructor(
    private readonly database: DatabaseService,
  ) { }

  async findSettings(userId: string) {
    const result = await this.database.query(
      `
      SELECT *
      FROM hydration_settings
      WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async createSettings(
    userId: string,
    data: {
      dailyGoalMl: number;
      reminderMode: string;
      intervalMinutes?: number;
      wakeTime?: string;
      sleepTime?: string;
      timezone?: string;
      notificationsEnabled?: boolean;
      soundEnabled?: boolean;
      inAppEnabled?: boolean;
      snoozeMinutes?: number;
    },
  ) {
    const result = await this.database.query(
      `
      INSERT INTO hydration_settings (
        user_id,
        daily_goal_ml,
        reminder_mode,
        interval_minutes,
        wake_time,
        sleep_time,
        timezone,
        notifications_enabled,
        sound_enabled,
        in_app_enabled,
        snooze_minutes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        userId,
        data.dailyGoalMl,
        data.reminderMode,
        data.intervalMinutes ?? null,
        data.wakeTime ?? '08:00',
        data.sleepTime ?? '23:00',
        data.timezone ?? 'Asia/Kolkata',
        data.notificationsEnabled ?? true,
        data.soundEnabled ?? true,
        data.inAppEnabled ?? true,
        data.snoozeMinutes ?? 15,
      ],
    );

    return result.rows[0];
  }

  async updateSettings(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedFields = [
      'daily_goal_ml',
      'reminder_mode',
      'interval_minutes',
      'wake_time',
      'sleep_time',
      'timezone',
      'notifications_enabled',
      'sound_enabled',
      'in_app_enabled',
      'snooze_minutes',
      'is_active',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        values.push(data[field]);
        fields.push(
          `${field} = $${values.length}`,
        );
      }
    }

    if (fields.length === 0) {
      return this.findSettings(userId);
    }

    values.push(userId);

    const result = await this.database.query(
      `
      UPDATE hydration_settings
      SET
        ${fields.join(', ')},
        updated_at = NOW()
      WHERE user_id = $${values.length}
      RETURNING *
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async logWater(
    userId: string,
    amountMl: number,
    source: string,
    loggedAt?: string,
  ) {
    const result = await this.database.query(
      `
      INSERT INTO hydration_logs (
        user_id,
        amount_ml,
        source,
        logged_at
      )
      VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
      RETURNING *
      `,
      [
        userId,
        amountMl,
        source,
        loggedAt ?? null,
      ],
    );

    return result.rows[0];
  }

  async getTodayTotal(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        COALESCE(SUM(amount_ml), 0)::INTEGER AS total_ml
      FROM hydration_logs
      WHERE user_id = $1
        AND logged_at >= CURRENT_DATE
        AND logged_at < CURRENT_DATE + INTERVAL '1 day'
      `,
      [userId],
    );

    return result.rows[0];
  }

  async getTodayLogs(userId: string) {
    const result = await this.database.query(
      `
      SELECT *
      FROM hydration_logs
      WHERE user_id = $1
        AND logged_at >= CURRENT_DATE
        AND logged_at < CURRENT_DATE + INTERVAL '1 day'
      ORDER BY logged_at DESC
      `,
      [userId],
    );

    return result.rows;
  }

  async getHistory(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        DATE(logged_at) AS date,
        COALESCE(SUM(amount_ml), 0)::INTEGER AS total_ml
      FROM hydration_logs
      WHERE user_id = $1
      GROUP BY DATE(logged_at)
      ORDER BY date DESC
    `,
      [userId],
    );

    return result.rows;
  }

  async getHydrationStreakData(userId: string) {
    const result = await this.database.query(
      `
      SELECT
        DATE(logged_at) AS date,
        COALESCE(SUM(amount_ml), 0)::INTEGER AS total_ml
      FROM hydration_logs
      WHERE user_id = $1
      GROUP BY DATE(logged_at)
      ORDER BY date DESC
    `,
      [userId],
    );

    return result.rows;
  }

  async getActiveReminderSettings() {
    const result =
      await this.database.query(
        `
        SELECT *
        FROM hydration_settings
        WHERE is_active = TRUE
          AND notifications_enabled = TRUE
        `,
      );

    return result.rows;
  }

  async getReminderTimes(
    userId: string,
  ) {
    const result =
      await this.database.query(
        `
      SELECT reminder_time
      FROM hydration_reminder_times
      WHERE user_id=$1
      AND is_active=true
      ORDER BY reminder_time ASC
      `,
        [userId],
      );

    return result.rows;
  }

  async replaceReminderTimes(
    userId: string,
    reminderTimes: string[],
  ) {
    await this.database.query(
      `
      UPDATE hydration_reminder_times
      SET is_active = FALSE
      WHERE user_id = $1
        AND is_active = TRUE
      `,
      [userId],
    );

    for (const reminderTime of reminderTimes) {
      await this.database.query(
        `
        INSERT INTO hydration_reminder_times (
          user_id,
          reminder_time,
          is_active
        )
        VALUES ($1, $2, TRUE)
        ON CONFLICT (
          user_id,
          reminder_time
        )
        DO UPDATE SET
          is_active = TRUE
        `,
        [userId, reminderTime],
      );
    }

    return this.getReminderTimes(userId);
  }

  async deactivateReminderTimes(
    userId: string,
  ) {
    const result =
      await this.database.query(
        `
        UPDATE hydration_reminder_times
        SET is_active = FALSE
        WHERE user_id = $1
          AND is_active = TRUE
        RETURNING *
        `,
        [userId],
      );

    return result.rows;
  }

  async createReminderEvent(
    userId: string,
    reminderKey: string,
    reminderDate: string,
    reminderTime: string,
  ) {
    const result =
      await this.database.query(
        `
        INSERT INTO hydration_reminder_events (
          user_id,
          reminder_key,
          reminder_date,
          reminder_time,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'PENDING'
        )
        ON CONFLICT (
          user_id,
          reminder_key,
          reminder_date
        )
        DO NOTHING
        RETURNING *
        `,
        [
          userId,
          reminderKey,
          reminderDate,
          reminderTime,
        ],
      );

    return result.rows[0] ?? null;
  }

  async findReminderEvent(
    userId: string,
    reminderDate: string,
    reminderTime: string,
  ) {
    const result =
      await this.database.query(
        `
      SELECT *
      FROM hydration_reminder_events
      WHERE user_id = $1
        AND reminder_date = $2
        AND reminder_time = $3
      ORDER BY created_at DESC
      LIMIT 1
      `,
        [
          userId,
          reminderDate,
          reminderTime,
        ],
      );

    return result.rows[0] ?? null;
  }

  async getOrCreateNativeReminderEvent(
    userId: string,
    reminderKey: string,
    reminderDate: string,
    reminderTime: string,
  ) {

    const existing =
      await this.findReminderEvent(
        userId,
        reminderDate,
        reminderTime,
      );

    if (existing) {
      return existing;
    }

    const created =
      await this.createReminderEvent(
        userId,
        reminderKey,
        reminderDate,
        reminderTime,
      );

    if (created) {
      return created;
    }

    return this.findReminderEvent(
      userId,
      reminderDate,
      reminderTime,
    );
  }

  async markReminderSent(
    eventId: string,
  ) {
    const result =
      await this.database.query(
        `
        UPDATE hydration_reminder_events
        SET
          status = 'SENT',
          sent_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [eventId],
      );

    return result.rows[0] ?? null;
  }

  async getDueSnoozedReminders() {
    const result = await this.database.query(
      `
    SELECT
      hydration_reminder_events.*,
      hydration_settings.snooze_minutes
    FROM hydration_reminder_events
    INNER JOIN hydration_settings
      ON hydration_settings.user_id =
         hydration_reminder_events.user_id
    WHERE hydration_reminder_events.status = 'SNOOZED'
      AND hydration_reminder_events.snoozed_until IS NOT NULL
      AND hydration_reminder_events.snoozed_until <= NOW()
      AND hydration_settings.is_active = TRUE
    ORDER BY hydration_reminder_events.snoozed_until ASC
    `,
    );

    return result.rows;
  }

  async getNextSnoozedReminder(
    userId: string,
  ) {
    const result =
      await this.database.query(
        `
            SELECT
                *
            FROM hydration_reminder_events
            WHERE user_id = $1
              AND status = 'SNOOZED'
              AND snoozed_until IS NOT NULL
            ORDER BY snoozed_until ASC
            LIMIT 1
            `,
        [userId],
      );

    return (
      result.rows[0] ??
      null
    );
  }

  async markReminderDrank(
    userId: string,
    eventId: string,
    amountMl: number,
  ) {
    const result = await this.database.query(
      `
    WITH updated_event AS (
      UPDATE hydration_reminder_events
      SET
        status = 'DRANK',
        completed_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND status = 'SENT'
      RETURNING id
    )
    INSERT INTO hydration_logs (
      user_id,
      amount_ml,
      source,
      logged_at
    )
    SELECT
      $2,
      $3,
      'REMINDER',
      NOW()
    FROM updated_event
    RETURNING *
    `,
      [
        eventId,
        userId,
        amountMl,
      ],
    );

    return result.rows[0] ?? null;
  }

  async snoozeReminder(
    userId: string,
    eventId: string,
    snoozeMinutes: number,
  ) {
    const result = await this.database.query(
      `
    UPDATE hydration_reminder_events
    SET
      status = 'SNOOZED',
      snoozed_until = NOW() + ($3 * INTERVAL '1 minute')
    WHERE id = $1
      AND user_id = $2
      AND status = 'SENT'
    RETURNING *
    `,
      [
        eventId,
        userId,
        snoozeMinutes,
      ],
    );

    return result.rows[0] ?? null;
  }

  async savePushDevice(
    userId: string,
    fcmToken: string,
  ) {
    const result =
      await this.database.query(
        `
        INSERT INTO hydration_push_devices (
          user_id,
          fcm_token,
          device_type,
          is_active
        )
        VALUES (
          $1,
          $2,
          'WEB',
          TRUE
        )
        ON CONFLICT (
          user_id,
          fcm_token
        )
        DO UPDATE SET
          is_active = TRUE,
          updated_at = NOW()
        RETURNING *
        `,
        [userId, fcmToken],
      );

    return result.rows[0];
  }

  async deactivatePushDevice(
    userId: string,
    fcmToken: string,
  ) {
    const result =
      await this.database.query(
        `
        UPDATE hydration_push_devices
        SET
          is_active = FALSE,
          updated_at = NOW()
        WHERE user_id = $1
          AND fcm_token = $2
        RETURNING *
        `,
        [userId, fcmToken],
      );

    return result.rows[0] ?? null;
  }

  async getActivePushDevices(
    userId: string,
  ) {
    const result =
      await this.database.query(
        `
        SELECT *
        FROM hydration_push_devices
        WHERE user_id = $1
          AND is_active = TRUE
        ORDER BY created_at DESC
        `,
        [userId],
      );

    return result.rows;
  }
}
