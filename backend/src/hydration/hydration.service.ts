import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HydrationRepository } from './hydration.repository.js';
import { PushNotificationService } from '../notifications/push-notification.service.js';
import { HydrationScheduleEngine, } from './hydration.schedule-engine.js';

type HydrationSetupData = {
  dailyGoalMl: number;
  reminderMode: string;
  intervalMinutes?: number;
  customReminderTimes?: string[];
  wakeTime?: string;
  sleepTime?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  inAppEnabled?: boolean;
  snoozeMinutes?: number;
};

@Injectable()
export class HydrationService {
  constructor(
    private readonly repository:
      HydrationRepository,
    private readonly pushNotification:
      PushNotificationService,
    private readonly scheduleEngine:
      HydrationScheduleEngine,
  ) { }

  async getHydration(userId: string) {
    const [settings, today, reminderTimes] =
      await Promise.all([
        this.repository.findSettings(userId),
        this.repository.getTodayTotal(userId),
        this.repository.getReminderTimes(userId),
      ]);

    const goalMl = Number(
      settings?.daily_goal_ml ?? 0,
    );

    const totalMl = Number(
      today?.total_ml ?? 0,
    );

    return {
      settings,
      reminderTimes: reminderTimes.map(
        (item: any) =>
          String(item.reminder_time).slice(0, 5),
      ),
      today: {
        totalMl,
        goalMl,
        remainingMl: Math.max(
          goalMl - totalMl,
          0,
        ),
        progressPercent:
          goalMl > 0
            ? Math.min(
              Math.round(
                (totalMl / goalMl) * 100,
              ),
              100,
            )
            : 0,
      },
    };
  }

  async setup(
    userId: string,
    data: HydrationSetupData,
  ) {
    const existing =
      await this.repository.findSettings(userId);

    if (existing) {
      throw new BadRequestException(
        'Hydration settings already exist',
      );
    }

    this.validateSettings(data);

    const settings =
      await this.repository.createSettings(
        userId,
        data,
      );

    let reminderTimes: any[] = [];

    if (
      data.reminderMode === 'CUSTOM' ||
      data.reminderMode === 'HYBRID'
    ) {
      reminderTimes =
        await this.repository.replaceReminderTimes(
          userId,
          data.customReminderTimes ?? [],
        );
    }

    return {
      settings,
      reminderTimes: reminderTimes.map(
        (item: any) =>
          String(item.reminder_time).slice(0, 5),
      ),
    };
  }

  async updateSettings(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const existing =
      await this.repository.findSettings(userId);

    if (!existing) {
      throw new NotFoundException(
        'Hydration settings not found',
      );
    }

    const normalized =
      this.normalizeSettings(data);

    this.validateSettings({
      dailyGoalMl:
        Number(
          normalized.daily_goal_ml ??
          existing.daily_goal_ml,
        ),
      reminderMode:
        String(
          normalized.reminder_mode ??
          existing.reminder_mode,
        ),
      intervalMinutes:
        normalized.interval_minutes === undefined
          ? Number(
            existing.interval_minutes ??
            0,
          )
          : Number(
            normalized.interval_minutes ??
            0,
          ),
      customReminderTimes:
        Array.isArray(
          data.customReminderTimes,
        )
          ? (data.customReminderTimes as string[])
          : [],
      wakeTime:
        String(
          normalized.wake_time ??
          existing.wake_time,
        ).slice(0, 5),
      sleepTime:
        String(
          normalized.sleep_time ??
          existing.sleep_time,
        ).slice(0, 5),
      timezone:
        String(
          normalized.timezone ??
          existing.timezone,
        ),
      notificationsEnabled:
        Boolean(
          normalized.notifications_enabled ??
          existing.notifications_enabled,
        ),
      soundEnabled:
        Boolean(
          normalized.sound_enabled ??
          existing.sound_enabled,
        ),
      inAppEnabled:
        Boolean(
          normalized.in_app_enabled ??
          existing.in_app_enabled,
        ),
      snoozeMinutes:
        Number(
          normalized.snooze_minutes ??
          existing.snooze_minutes,
        ),
    });

    const settingsData = {
      ...normalized,
    };

    delete settingsData.customReminderTimes;

    const settings =
      await this.repository.updateSettings(
        userId,
        settingsData,
      );

    const reminderMode =
      String(
        settings?.reminder_mode ??
        normalized.reminder_mode ??
        existing.reminder_mode,
      );

    let reminderTimes: any[] = [];

    if (
      reminderMode === 'CUSTOM' ||
      reminderMode === 'HYBRID'
    ) {
      const customTimes =
        Array.isArray(
          data.customReminderTimes,
        )
          ? (data.customReminderTimes as string[])
          : await this.getExistingReminderTimes(
            userId,
          );

      reminderTimes =
        await this.repository.replaceReminderTimes(
          userId,
          customTimes,
        );
    } else {
      await this.repository.deactivateReminderTimes(
        userId,
      );
    }

    return {
      settings,
      reminderTimes: reminderTimes.map(
        (item: any) =>
          String(item.reminder_time).slice(0, 5),
      ),
    };
  }

  async logWater(
    userId: string,
    amountMl: number,
    source = 'MANUAL',
    loggedAt?: string,
  ) {
    if (amountMl <= 0) {
      throw new BadRequestException(
        'Water amount must be greater than zero',
      );
    }

    const allowedSources = [
      'MANUAL',
      'REMINDER',
      'QUICK_ADD',
    ];

    if (!allowedSources.includes(source)) {
      throw new BadRequestException(
        'Invalid hydration source',
      );
    }

    return this.repository.logWater(
      userId,
      amountMl,
      source,
      loggedAt,
    );
  }

  async markReminderDrank(
    userId: string,
    eventId: string,
    amountMl = 250,
  ) {
    if (!eventId) {
      throw new BadRequestException(
        'Reminder event ID is required',
      );
    }

    if (
      !Number.isInteger(amountMl) ||
      amountMl <= 0
    ) {
      throw new BadRequestException(
        'Water amount must be greater than zero',
      );
    }

    const allowedReminderAmounts = [
      100,
      250,
      500,
      750,
    ];

    if (
      !allowedReminderAmounts.includes(amountMl)
    ) {
      throw new BadRequestException(
        'Invalid reminder water amount',
      );
    }

    const result =
      await this.repository.markReminderDrank(
        userId,
        eventId,
        amountMl,
      );

    if (!result) {
      throw new BadRequestException(
        'Reminder already completed or is not available',
      );
    }

    return {
      success: true,
      message: 'Water logged successfully',
      eventId,
      amountMl,
      source: 'REMINDER',
      log: result,
    };
  }

  async snoozeReminder(
    userId: string,
    eventId: string,
    snoozeMinutes = 15,
  ) {
    if (!eventId) {
      throw new BadRequestException(
        'Reminder event ID is required',
      );
    }

    const allowedSnoozeMinutes = [
      10,
      15,
      20,
      30,
    ];

    if (
      !allowedSnoozeMinutes.includes(
        snoozeMinutes,
      )
    ) {
      throw new BadRequestException(
        'Invalid snooze duration',
      );
    }

    const result =
      await this.repository.snoozeReminder(
        userId,
        eventId,
        snoozeMinutes,
      );

    if (!result) {
      throw new BadRequestException(
        'Reminder already completed or is not available',
      );
    }

    return {
      success: true,
      message: `Reminder snoozed for ${snoozeMinutes} minutes`,
      eventId,
      snoozeMinutes,
      snoozedUntil: result.snoozed_until,
      status: 'SNOOZED',
    };
  }

  async processNativeReminderAction(
    userId: string,
    action: 'DRANK' | 'SNOOZE',
    amountMl = 250,
    alarmId = 0,
    triggerAt = 0,
    snoozeMinutes = 15,
  ) {

    if (
      action !== 'DRANK' &&
      action !== 'SNOOZE'
    ) {
      throw new BadRequestException(
        'Invalid native hydration action',
      );
    }

    if (
      !Number.isInteger(amountMl) ||
      amountMl <= 0
    ) {
      throw new BadRequestException(
        'Invalid water amount',
      );
    }

    if (
      !Number.isInteger(snoozeMinutes) ||
      ![
        10,
        15,
        20,
        30,
      ].includes(snoozeMinutes)
    ) {
      throw new BadRequestException(
        'Invalid snooze duration',
      );
    }

    if (
      !Number.isFinite(triggerAt) ||
      triggerAt <= 0
    ) {
      throw new BadRequestException(
        'Native alarm trigger time is required',
      );
    }

    const settings =
      await this.repository.findSettings(
        userId,
      );

    if (!settings) {
      throw new NotFoundException(
        'Hydration settings not found',
      );
    }

    const timezone =
      settings.timezone ||
      'Asia/Kolkata';

    const localParts =
      this.getDateTimeInTimezone(
        triggerAt,
        timezone,
      );

    const reminderDate =
      localParts.date;

    const reminderTime =
      localParts.time;

    const reminderKey =
      await this.resolveNativeReminderKey(
        settings,
        userId,
        reminderTime,
      );

    if (!reminderKey) {
      throw new BadRequestException(
        `No hydration reminder matches ${reminderDate} ${reminderTime}`,
      );
    }

    let event =
      await this.repository
        .getOrCreateNativeReminderEvent(
          userId,
          reminderKey,
          reminderDate,
          reminderTime,
        );

    if (!event) {
      throw new BadRequestException(
        'Unable to resolve hydration reminder event',
      );
    }

    /*
     * Native Android alarms don't use FCM.
     *
     * Make the reminder actionable as SENT
     * before reusing the existing action logic.
     */
    if (
      event.status === 'PENDING'
    ) {

      event =
        await this.repository
          .markReminderSent(
            event.id,
          );
    }

    if (!event) {
      throw new BadRequestException(
        'Unable to activate hydration reminder event',
      );
    }

    if (
      action === 'DRANK'
    ) {

      return this.markReminderDrank(
        userId,
        event.id,
        amountMl,
      );
    }

    return this.snoozeReminder(
      userId,
      event.id,
      snoozeMinutes,
    );
  }

  private getDateTimeInTimezone(
    timestamp: number,
    timezone: string,
  ) {

    const formatter =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(timestamp),
      );

    const values: Record<
      string,
      string
    > = {};

    for (const part of parts) {

      if (
        part.type !== 'literal'
      ) {
        values[part.type] =
          part.value;
      }
    }

    return {
      date:
        `${values.year}-${values.month}-${values.day}`,

      time:
        `${values.hour}:${values.minute}`,
    };
  }

  private async resolveNativeReminderKey(
    settings: any,
    userId: string,
    reminderTime: string,
  ) {

    const mode =
      String(
        settings.reminder_mode,
      );

    const wake =
      this.timeToMinutes(
        String(
          settings.wake_time,
        ).slice(0, 5),
      );

    const current =
      this.timeToMinutes(
        reminderTime,
      );

    const intervalMinutes =
      Number(
        settings.interval_minutes ??
        0,
      );

    let intervalMatch = false;
    let customMatch = false;
    let smartMatch = false;

    let intervalKey = '';

    /*
     * INTERVAL
     */
    if (
      (
        mode === 'INTERVAL' ||
        mode === 'HYBRID'
      ) &&
      intervalMinutes > 0
    ) {

      const elapsed =
        this.getElapsedActiveMinutesForNative(
          wake,
          current,
        );

      if (
        elapsed > 0 &&
        elapsed % intervalMinutes === 0
      ) {
        intervalMatch = true;

        intervalKey =
          `interval-${intervalMinutes}-${current}`;
      }
    }

    /*
     * CUSTOM
     */
    if (
      mode === 'CUSTOM' ||
      mode === 'HYBRID'
    ) {

      const customTimes =
        await this.repository
          .getReminderTimes(
            userId,
          );

      customMatch =
        customTimes.some(
          (item: any) =>
            String(
              item.reminder_time,
            ).slice(0, 5) ===
            reminderTime,
        );
    }

    /*
     * SMART
     */
    if (
      mode === 'SMART'
    ) {

      const sleep =
        this.timeToMinutes(
          String(
            settings.sleep_time,
          ).slice(0, 5),
        );

      const activeMinutes =
        this.getActiveWindowMinutesForNative(
          wake,
          sleep,
        );

      const elapsed =
        this.getElapsedActiveMinutesForNative(
          wake,
          current,
        );

      const dailyGoal =
        Number(
          settings.daily_goal_ml,
        );

      if (
        dailyGoal > 0 &&
        elapsed > 0 &&
        elapsed <= activeMinutes
      ) {

        const reminderCount =
          Math.min(
            12,
            Math.max(
              4,
              Math.ceil(
                dailyGoal / 500,
              ),
            ),
          );

        const smartInterval =
          Math.max(
            30,
            Math.round(
              activeMinutes /
              reminderCount,
            ),
          );

        if (
          elapsed %
          smartInterval ===
          0
        ) {
          smartMatch = true;
        }
      }
    }

    if (
      mode === 'CUSTOM'
    ) {
      return customMatch
        ? `custom-${reminderTime}`
        : null;
    }

    if (
      mode === 'INTERVAL'
    ) {
      return intervalMatch
        ? intervalKey
        : null;
    }

    if (
      mode === 'SMART'
    ) {
      return smartMatch
        ? `smart-${this.getSmartIntervalForNative(
          settings,
        )}-${current}`
        : null;
    }

    /*
     * HYBRID
     */
    if (
      mode === 'HYBRID'
    ) {

      if (
        intervalMatch &&
        customMatch
      ) {
        return `hybrid-${reminderTime}`;
      }

      if (intervalMatch) {
        return intervalKey;
      }

      if (customMatch) {
        return `custom-${reminderTime}`;
      }
    }

    return null;
  }

  private timeToMinutes(
    value: string,
  ) {

    const [
      hours,
      minutes,
    ] = value
      .split(':')
      .map(Number);

    return (
      hours * 60 +
      minutes
    );
  }

  private getActiveWindowMinutesForNative(
    wake: number,
    sleep: number,
  ) {

    let duration =
      sleep - wake;

    if (duration < 0) {
      duration += 1440;
    }

    return duration;
  }

  private getElapsedActiveMinutesForNative(
    wake: number,
    current: number,
  ) {

    let elapsed =
      current - wake;

    if (elapsed < 0) {
      elapsed += 1440;
    }

    return elapsed;
  }

  private getSmartIntervalForNative(
    settings: any,
  ) {

    const wake =
      this.timeToMinutes(
        String(
          settings.wake_time,
        ).slice(0, 5),
      );

    const sleep =
      this.timeToMinutes(
        String(
          settings.sleep_time,
        ).slice(0, 5),
      );

    const activeMinutes =
      this.getActiveWindowMinutesForNative(
        wake,
        sleep,
      );

    const dailyGoal =
      Number(
        settings.daily_goal_ml,
      );

    const reminderCount =
      Math.min(
        12,
        Math.max(
          4,
          Math.ceil(
            dailyGoal / 500,
          ),
        ),
      );

    return Math.max(
      30,
      Math.round(
        activeMinutes /
        reminderCount,
      ),
    );
  }

  async getStreak(userId: string) {
    const [settings, history] =
      await Promise.all([
        this.repository.findSettings(userId),
        this.repository.getHydrationStreakData(userId),
      ]);

    const goalMl = Number(
      settings?.daily_goal_ml ?? 0,
    );

    if (goalMl <= 0 || history.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        goalMl,
      };
    }

    /*
     * Convert history into:
     *
     * YYYY-MM-DD -> total water
     */
    const completedDays = new Map<
      string,
      number
    >();

    for (const row of history) {
      const date = String(row.date);
      const totalMl = Number(
        row.total_ml ?? 0,
      );

      if (totalMl >= goalMl) {
        completedDays.set(
          date,
          totalMl,
        );
      }
    }

    if (completedDays.size === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        goalMl,
      };
    }

    const dates = Array.from(
      completedDays.keys(),
    ).sort((a, b) =>
      b.localeCompare(a),
    );

    const toDate = (dateString: string) => {
      const date = new Date(
        `${dateString}T00:00:00Z`,
      );

      date.setUTCHours(0, 0, 0, 0);

      return date;
    };

    const isPreviousDay = (
      current: string,
      previous: string,
    ) => {
      const currentDate = toDate(current);
      const previousDate = toDate(previous);

      const difference =
        currentDate.getTime() -
        previousDate.getTime();

      return (
        difference ===
        24 * 60 * 60 * 1000
      );
    };

    /*
     * Current streak
     *
     * It must include today.
     */
    const today = new Date();

    const todayString =
      `${today.getUTCFullYear()}-${String(
        today.getUTCMonth() + 1,
      ).padStart(2, '0')}-${String(
        today.getUTCDate(),
      ).padStart(2, '0')}`;

    let currentStreak = 0;

    if (completedDays.has(todayString)) {
      currentStreak = 1;

      let currentDate =
        todayString;

      for (let i = 1; i < dates.length; i++) {
        const candidate =
          dates[i];

        if (
          isPreviousDay(
            currentDate,
            candidate,
          )
        ) {
          currentStreak++;
          currentDate = candidate;
        } else {
          break;
        }
      }
    }

    /*
     * Best streak across all history.
     */
    let bestStreak = 0;
    let runningStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        runningStreak = 1;
      } else if (
        isPreviousDay(
          dates[i - 1],
          dates[i],
        )
      ) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }

      bestStreak = Math.max(
        bestStreak,
        runningStreak,
      );
    }

    return {
      currentStreak,
      bestStreak,
      goalMl,
    };
  }

  async getToday(userId: string) {
    const [
      settings,
      total,
      logs,
    ] = await Promise.all([
      this.repository.findSettings(userId),
      this.repository.getTodayTotal(userId),
      this.repository.getTodayLogs(userId),
    ]);

    const totalMl =
      Number(total?.total_ml ?? 0);

    const goalMl =
      Number(settings?.daily_goal_ml ?? 0);

    const streak =
      await this.getStreak(userId);

    return {
      date: new Date()
        .toISOString()
        .split('T')[0],
      goalMl,
      totalMl,
      remainingMl: Math.max(
        goalMl - totalMl,
        0,
      ),
      progressPercent:
        goalMl > 0
          ? Math.min(
            Math.round(
              (totalMl / goalMl) * 100,
            ),
            100,
          )
          : 0,
      logs,
      streak,
    };
  }

  async getHistory(userId: string) {
    return this.repository.getHistory(userId);
  }

  async registerPushDevice(
    userId: string,
    fcmToken: string,
  ) {
    if (!fcmToken) {
      throw new BadRequestException(
        'FCM token is required',
      );
    }

    return this.repository.savePushDevice(
      userId,
      fcmToken,
    );
  }

  async unregisterPushDevice(
    userId: string,
    fcmToken: string,
  ) {
    if (!fcmToken) {
      throw new BadRequestException(
        'FCM token is required',
      );
    }

    return this.repository.deactivatePushDevice(
      userId,
      fcmToken,
    );
  }

  async sendTestPush(userId: string) {
    const devices =
      await this.repository.getActivePushDevices(
        userId,
      );

    if (devices.length === 0) {
      throw new NotFoundException(
        'No active hydration push devices found',
      );
    }

    const results = [];

    for (const device of devices) {
      try {
        const response =
          await this.pushNotification.sendToToken(
            device.fcm_token,
            '💧 TIME TO HYDRATE',
            'Life RPG hydration system is working. Drink some water!',
            {
              type: 'HYDRATION_TEST',
              url: '/hydration',
            },
          );

        results.push({
          token: device.fcm_token,
          success: true,
          response,
        });
      } catch (error) {
        results.push({
          token: device.fcm_token,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    const successful =
      results.filter(
        (item) => item.success,
      ).length;

    return {
      success: successful > 0,
      devices: devices.length,
      successful,
      failed:
        devices.length - successful,
      results,
    };
  }

  private normalizeSettings(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const map: Record<
      string,
      string
    > = {
      dailyGoalMl: 'daily_goal_ml',
      reminderMode: 'reminder_mode',
      intervalMinutes: 'interval_minutes',
      wakeTime: 'wake_time',
      sleepTime: 'sleep_time',
      timezone: 'timezone',
      notificationsEnabled:
        'notifications_enabled',
      soundEnabled: 'sound_enabled',
      inAppEnabled: 'in_app_enabled',
      snoozeMinutes: 'snooze_minutes',
      isActive: 'is_active',
    };

    const normalized: Record<
      string,
      unknown
    > = {};

    for (const [key, value] of Object.entries(
      data,
    )) {
      if (key === 'customReminderTimes') {
        normalized[key] = value;
        continue;
      }

      const target =
        map[key] ?? key;

      normalized[target] = value;
    }

    return normalized;
  }

  private validateSettings(
    data: HydrationSetupData,
  ) {
    const allowedModes = [
      'SMART',
      'INTERVAL',
      'CUSTOM',
      'HYBRID',
    ];

    if (
      !allowedModes.includes(
        data.reminderMode,
      )
    ) {
      throw new BadRequestException(
        'Invalid hydration reminder mode',
      );
    }

    if (
      !Number.isFinite(
        Number(data.dailyGoalMl),
      ) ||
      Number(data.dailyGoalMl) < 500
    ) {
      throw new BadRequestException(
        'Daily water goal must be at least 500 ml',
      );
    }

    const wake =
      String(
        data.wakeTime ?? '08:00',
      ).slice(0, 5);

    const sleep =
      String(
        data.sleepTime ?? '23:00',
      ).slice(0, 5);

    const customTimes =
      data.customReminderTimes ?? [];

    if (
      data.reminderMode === 'CUSTOM' ||
      data.reminderMode === 'HYBRID'
    ) {
      if (customTimes.length === 0) {
        throw new BadRequestException(
          'At least one custom reminder is required',
        );
      }

      const uniqueTimes =
        new Set(customTimes);

      if (
        uniqueTimes.size !==
        customTimes.length
      ) {
        throw new BadRequestException(
          'Duplicate custom reminder times are not allowed',
        );
      }

      for (const time of customTimes) {
        if (
          !/^\d{2}:\d{2}$/.test(time)
        ) {
          throw new BadRequestException(
            `Invalid reminder time: ${time}`,
          );
        }

        const [
          hours,
          minutes,
        ] = time
          .split(':')
          .map(Number);

        if (
          hours > 23 ||
          minutes > 59
        ) {
          throw new BadRequestException(
            `Invalid reminder time: ${time}`,
          );
        }

        if (
          !this.isTimeInsideWindow(
            time,
            wake,
            sleep,
          )
        ) {
          throw new BadRequestException(
            `Reminder ${time} is outside the hydration window`,
          );
        }
      }
    }
  }

  private async getExistingReminderTimes(
    userId: string,
  ) {
    const rows =
      await this.repository.getReminderTimes(
        userId,
      );

    return rows.map(
      (item: any) =>
        String(item.reminder_time).slice(0, 5),
    );
  }

  private isTimeInsideWindow(
    time: string,
    wake: string,
    sleep: string,
  ) {
    const toMinutes = (value: string) => {
      const [
        hours,
        minutes,
      ] = value
        .split(':')
        .map(Number);

      return hours * 60 + minutes;
    };

    const current = toMinutes(time);
    const wakeMinutes = toMinutes(wake);
    const sleepMinutes = toMinutes(sleep);

    if (wakeMinutes === sleepMinutes) {
      return true;
    }

    if (wakeMinutes < sleepMinutes) {
      return (
        current >= wakeMinutes &&
        current <= sleepMinutes
      );
    }

    return (
      current >= wakeMinutes ||
      current <= sleepMinutes
    );
  }

  async getNextReminder(
    userId: string,
  ) {
    const settings =
      await this.repository.findSettings(
        userId,
      );

    if (!settings) {
      return null;
    }

    if (!settings.is_active) {
      return null;
    }

    const timezone =
      settings.timezone ||
      'Asia/Kolkata';

    const now =
      this.getCurrentTimeInTimezone(
        timezone,
      );

    const currentTime =
      `${String(
        now.hour,
      ).padStart(
        2,
        '0',
      )}:${String(
        now.minute,
      ).padStart(
        2,
        '0',
      )}`;

    /*
     * ======================================================
     * NORMAL SCHEDULED REMINDER
     * ======================================================
     */

    const customTimes =
      await this.repository.getReminderTimes(
        userId,
      );

    const normalizedCustomTimes =
      customTimes.map(
        (item: any) => ({
          reminder_time:
            String(
              item.reminder_time,
            ),
        }),
      );

    const scheduled =
      this.scheduleEngine.getNextReminder(
        settings,
        currentTime,
        now.second,
        normalizedCustomTimes,
      );

    /*
     * ======================================================
     * SNOOZED REMINDER
     * ======================================================
     */

    const snoozed =
      await this.repository.getNextSnoozedReminder(
        userId,
      );

    /*
     * No scheduled and no snoozed
     */
    if (
      !scheduled &&
      !snoozed
    ) {
      return null;
    }

    /*
     * If there is no scheduled reminder,
     * show snoozed reminder.
     */
    if (
      snoozed &&
      !scheduled
    ) {
      return this.formatSnoozedNextReminder(
        snoozed,
        timezone,
      );
    }

    /*
     * If there is no snoozed reminder,
     * use normal schedule.
     */
    if (
      !snoozed &&
      scheduled
    ) {
      return {
        reminderTime:
          scheduled.time,

        reminderMode:
          settings.reminder_mode,

        countdownSeconds:
          scheduled.countdownSeconds,

        minutesLeft:
          scheduled.minutesLeft,

        secondsLeft:
          scheduled.secondsLeft,

        isToday:
          scheduled.isToday,

        source:
          scheduled.source,

        reminderKey:
          scheduled.key,
      };
    }

    /*
     * ======================================================
     * COMPARE BOTH
     * ======================================================
     */

    const snoozedCountdown =
      Math.max(
        0,
        Math.ceil(
          (
            new Date(
              snoozed.snoozed_until,
            ).getTime() -
            Date.now()
          ) / 1000,
        ),
      );

    /*
 * If there is a snoozed reminder,
 * compare it with the normal scheduled reminder.
 */
    if (snoozed) {
      const snoozedCountdown =
        Math.max(
          0,
          Math.ceil(
            (
              new Date(
                snoozed.snoozed_until,
              ).getTime() -
              Date.now()
            ) / 1000,
          ),
        );

      /*
       * If there is NO normal scheduled reminder,
       * snoozed reminder automatically wins.
       */
      if (!scheduled) {
        return this.formatSnoozedNextReminder(
          snoozed,
          timezone,
        );
      }

      /*
       * Snoozed reminder comes first
       * if it happens earlier.
       */
      if (
        snoozedCountdown <=
        scheduled.countdownSeconds
      ) {
        return this.formatSnoozedNextReminder(
          snoozed,
          timezone,
        );
      }
    }

    /*
     * No scheduled reminder available.
     */
    if (!scheduled) {
      return null;
    }

    /*
     * Normal scheduled reminder
     * comes first.
     */
    return {
      reminderTime:
        scheduled.time,

      reminderMode:
        settings.reminder_mode,

      countdownSeconds:
        scheduled.countdownSeconds,

      minutesLeft:
        scheduled.minutesLeft,

      secondsLeft:
        scheduled.secondsLeft,

      isToday:
        scheduled.isToday,

      source:
        scheduled.source,

      reminderKey:
        scheduled.key,
    };
  }

  private formatSnoozedNextReminder(
    reminder: any,
    timezone: string,
  ) {
    const snoozedUntil =
      new Date(
        reminder.snoozed_until,
      );

    const countdownSeconds =
      Math.max(
        0,
        Math.ceil(
          (
            snoozedUntil.getTime() -
            Date.now()
          ) / 1000,
        ),
      );

    const formatter =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone:
            timezone,

          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            false,
        },
      );

    const reminderTime =
      formatter.format(
        snoozedUntil,
      );

    return {
      reminderTime,

      reminderMode:
        'SNOOZED',

      countdownSeconds,

      minutesLeft:
        Math.floor(
          countdownSeconds /
          60,
        ),

      secondsLeft:
        countdownSeconds %
        60,

      isToday: true,

      source:
        'SNOOZED',

      reminderKey:
        reminder.reminder_key,
    };
  }

  private getCurrentTimeInTimezone(
    timezone: string,
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone:
            timezone,

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hour12:
            false,
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(),
      );

    const values:
      Record<
        string,
        string
      > = {};

    for (
      const part of parts
    ) {
      if (
        part.type !==
        'literal'
      ) {
        values[
          part.type
        ] = part.value;
      }
    }

    return {
      year:
        Number(
          values.year,
        ),

      month:
        Number(
          values.month,
        ),

      day:
        Number(
          values.day,
        ),

      hour:
        Number(
          values.hour,
        ),

      minute:
        Number(
          values.minute,
        ),

      second:
        Number(
          values.second,
        ),
    };
  }

  private normalizeHydrationTime(
    value: unknown,
  ): string {
    if (!value) {
      return '00:00';
    }

    return String(value)
      .slice(0, 5);
  }

  private hydrationTimeToMinutes(
    value: string,
  ): number {
    const [
      hours,
      minutes,
    ] = value
      .split(':')
      .map(Number);

    return (
      hours * 60 +
      minutes
    );
  }

  private getHydrationNow(
    timezone: string,
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(),
      );

    const values: Record<
      string,
      string
    > = {};

    for (
      const part of parts
    ) {
      if (
        part.type !==
        'literal'
      ) {
        values[part.type] =
          part.value;
      }
    }

    return {
      year: Number(
        values.year,
      ),
      month: Number(
        values.month,
      ),
      day: Number(
        values.day,
      ),
      hour: Number(
        values.hour,
      ),
      minute: Number(
        values.minute,
      ),
      seconds: Number(
        values.second,
      ),
    };
  }

  private getActiveWindowDuration(
    wakeMinutes: number,
    sleepMinutes: number,
  ): number {
    if (
      wakeMinutes ===
      sleepMinutes
    ) {
      return 24 * 60;
    }

    if (
      sleepMinutes >
      wakeMinutes
    ) {
      return (
        sleepMinutes -
        wakeMinutes
      );
    }

    return (
      24 * 60 -
      wakeMinutes +
      sleepMinutes
    );
  }

  private isMinuteInsideHydrationWindow(
    minute: number,
    wakeMinutes: number,
    sleepMinutes: number,
  ): boolean {
    if (
      wakeMinutes ===
      sleepMinutes
    ) {
      return true;
    }

    if (
      wakeMinutes <
      sleepMinutes
    ) {
      return (
        minute >= wakeMinutes &&
        minute <= sleepMinutes
      );
    }

    /*
     * Overnight window.
     *
     * Example:
     * 22:00 → 06:00
     */

    return (
      minute >= wakeMinutes ||
      minute <= sleepMinutes
    );
  }

  private getFutureDayOffset(
    wakeMinutes: number,
    sleepMinutes: number,
    currentMinutes: number,
    reminderMinutes: number,
  ): number | null {
    /*
     * Normal daytime window.
     */

    if (
      wakeMinutes <
      sleepMinutes
    ) {
      if (
        reminderMinutes >
        currentMinutes &&
        reminderMinutes >=
        wakeMinutes &&
        reminderMinutes <=
        sleepMinutes
      ) {
        return 0;
      }

      if (
        currentMinutes >=
        sleepMinutes ||
        currentMinutes <
        wakeMinutes
      ) {
        if (
          reminderMinutes >=
          wakeMinutes
        ) {
          return 1;
        }
      }

      return null;
    }

    /*
     * Overnight window.
     *
     * Example:
     * 22:00 → 06:00
     */

    const currentInside =
      this.isMinuteInsideHydrationWindow(
        currentMinutes,
        wakeMinutes,
        sleepMinutes,
      );

    if (
      currentInside
    ) {
      if (
        currentMinutes >=
        wakeMinutes
      ) {
        /*
         * Same night.
         */
        if (
          reminderMinutes >
          currentMinutes &&
          reminderMinutes >=
          wakeMinutes
        ) {
          return 0;
        }

        /*
         * After midnight portion
         * belongs to next calendar day.
         */
        if (
          reminderMinutes <=
          sleepMinutes
        ) {
          return 1;
        }
      } else {
        /*
         * We are after midnight.
         */
        if (
          reminderMinutes >
          currentMinutes &&
          reminderMinutes <=
          sleepMinutes
        ) {
          return 0;
        }

        if (
          reminderMinutes >=
          wakeMinutes
        ) {
          return 0;
        }
      }
    }

    /*
     * Outside active window.
     */

    if (
      currentMinutes >
      sleepMinutes &&
      currentMinutes <
      wakeMinutes
    ) {
      if (
        reminderMinutes >=
        wakeMinutes
      ) {
        return 0;
      }

      if (
        reminderMinutes <=
        sleepMinutes
      ) {
        return 1;
      }
    }

    return null;
  }

  private getNextIntervalReminder(
    wakeMinutes: number,
    sleepMinutes: number,
    currentMinutes: number,
    intervalMinutes: number,
  ) {
    const duration =
      this.getActiveWindowDuration(
        wakeMinutes,
        sleepMinutes,
      );

    /*
     * Generate interval slots
     * from wake time.
     */

    for (
      let offset = intervalMinutes;
      offset <= duration;
      offset += intervalMinutes
    ) {
      const absolute =
        wakeMinutes +
        offset;

      const normalized =
        absolute %
        (24 * 60);

      if (
        wakeMinutes <
        sleepMinutes
      ) {
        if (
          normalized >
          currentMinutes &&
          normalized <=
          sleepMinutes
        ) {
          return {
            time:
              this.minutesToHydrationTime(
                normalized,
              ),
            dayOffset: 0,
          };
        }
      } else {
        /*
         * Overnight window.
         */

        const elapsedFromWake =
          this.getForwardDistance(
            wakeMinutes,
            normalized,
          );

        const currentElapsed =
          this.getForwardDistance(
            wakeMinutes,
            currentMinutes,
          );

        if (
          elapsedFromWake >
          currentElapsed &&
          elapsedFromWake <=
          duration
        ) {
          return {
            time:
              this.minutesToHydrationTime(
                normalized,
              ),
            dayOffset:
              normalized <
                wakeMinutes
                ? 1
                : 0,
          };
        }
      }
    }

    /*
     * No remaining slot today.
     * Next occurrence is tomorrow.
     */

    return {
      time:
        this.minutesToHydrationTime(
          wakeMinutes +
          intervalMinutes,
        ),
      dayOffset: 1,
    };
  }

  private getNextSmartReminder(
    settings: any,
    currentMinutes: number,
    wakeMinutes: number,
    sleepMinutes: number,
  ) {
    const duration =
      this.getActiveWindowDuration(
        wakeMinutes,
        sleepMinutes,
      );

    const goalMl =
      Number(
        settings.daily_goal_ml ?? 3000,
      );

    /*
     * Smart engine:
     *
     * Approximately one reminder
     * for every 500 ml of the daily goal.
     *
     * Minimum: 4 reminders
     * Maximum: 12 reminders
     */

    const reminderCount =
      Math.min(
        Math.max(
          Math.ceil(
            goalMl / 500,
          ),
          4,
        ),
        12,
      );

    /*
     * Distribute reminders
     * evenly across active hours.
     */

    const smartInterval =
      Math.max(
        60,
        Math.round(
          duration /
          reminderCount,
        ),
      );

    const firstOffset =
      smartInterval;

    for (
      let index = 0;
      index < reminderCount;
      index++
    ) {
      const offset =
        firstOffset +
        index *
        smartInterval;

      if (
        offset >
        duration
      ) {
        break;
      }

      const absolute =
        wakeMinutes +
        offset;

      const normalized =
        absolute %
        (24 * 60);

      const dayOffset =
        normalized <
          wakeMinutes
          ? 1
          : 0;

      const isFuture =
        dayOffset > 0 ||
        this.getForwardDistance(
          currentMinutes,
          normalized,
        ) > 0;

      if (!isFuture) {
        continue;
      }

      return {
        time:
          this.minutesToHydrationTime(
            normalized,
          ),
        source: 'SMART',
        dayOffset,
      };
    }

    /*
     * Tomorrow's first smart reminder.
     */

    const tomorrowAbsolute =
      wakeMinutes +
      firstOffset;

    const tomorrowNormalized =
      tomorrowAbsolute %
      (24 * 60);

    return {
      time:
        this.minutesToHydrationTime(
          tomorrowNormalized,
        ),
      source: 'SMART',
      dayOffset: 1,
    };
  }

  private getForwardDistance(
    fromMinutes: number,
    toMinutes: number,
  ): number {
    const total =
      24 * 60;

    return (
      (
        toMinutes -
        fromMinutes +
        total
      ) % total
    );
  }

  private minutesUntilTime(
    currentMinutes: number,
    targetMinutes: number,
  ): number {
    if (
      targetMinutes >
      currentMinutes
    ) {
      return (
        targetMinutes -
        currentMinutes
      );
    }

    return 0;
  }

  private minutesUntilNextDayTime(
    currentMinutes: number,
    targetMinutes: number,
  ): number {
    const total =
      24 * 60;

    return (
      total -
      currentMinutes +
      targetMinutes
    );
  }

  private minutesToHydrationTime(
    minutes: number,
  ): string {
    const normalized =
      (
        minutes %
        (24 * 60) +
        24 * 60
      ) %
      (24 * 60);

    const hours =
      Math.floor(
        normalized / 60,
      );

    const mins =
      normalized % 60;

    return `${String(
      hours,
    ).padStart(2, '0')}:${String(
      mins,
    ).padStart(2, '0')}`;
  }
}
