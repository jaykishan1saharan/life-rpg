import {
    Injectable,
    Logger,
} from '@nestjs/common';

import {
    Cron,
    CronExpression,
} from '@nestjs/schedule';

import { HydrationRepository } from './hydration.repository.js';

import {
    PushNotificationService,
} from '../notifications/push-notification.service.js';

import {
    HydrationScheduleEngine,
} from './hydration.schedule-engine.js';

@Injectable()
export class HydrationScheduler {
    private readonly logger =
        new Logger(HydrationScheduler.name);

    constructor(
        private readonly repository:
            HydrationRepository,

        private readonly pushNotificationService:
            PushNotificationService,

        private readonly scheduleEngine:
            HydrationScheduleEngine,
    ) { }

    /*
     * ========================================================
     * MAIN HYDRATION REMINDER ENGINE
     * ========================================================
     *
     * Runs every minute.
     *
     * Flow:
     *
     * Cron
     *   ↓
     * Check active window
     *   ↓
     * Determine all due reminders
     *   ↓
     * Merge duplicate same-minute reminders
     *   ↓
     * Create reminder event
     *   ↓
     * Get active FCM devices
     *   ↓
     * Firebase FCM
     *   ↓
     * Browser Service Worker
     *   ↓
     * Notification
     */

    @Cron(CronExpression.EVERY_MINUTE)
    async processHydrationReminders() {
        try {
            await this.processSnoozedReminders();
            this.logger.debug(
                '[Hydration Scheduler] Checking reminders...',
            );

            const settings =
                await this.repository.getActiveReminderSettings();

            if (!settings.length) {
                return;
            }

            for (const userSettings of settings) {
                await this.processUserReminder(
                    userSettings,
                );
            }
        } catch (error) {
            this.logger.error(
                '[Hydration Scheduler] Failed to process reminders',
                error instanceof Error
                    ? error.stack
                    : String(error),
            );
        }
    }

    /*
     * ========================================================
     * PROCESS ONE USER
     * ========================================================
     */

    private async processUserReminder(
        settings: any,
    ) {
        try {
            if (!settings.is_active) {
                return;
            }

            if (!settings.notifications_enabled) {
                return;
            }

            const timezone =
                settings.timezone ||
                'Asia/Kolkata';

            const now =
                this.getCurrentTimeInTimezone(
                    timezone,
                );

            const currentTime =
                this.formatTime(now);

            const wakeTime =
                this.normalizeTime(
                    settings.wake_time,
                );

            const sleepTime =
                this.normalizeTime(
                    settings.sleep_time,
                );

            /*
             * Don't send notifications
             * while sleeping.
             */
            if (
                !this.isWithinActiveWindow(
                    currentTime,
                    wakeTime,
                    sleepTime,
                )
            ) {
                return;
            }

            /*
             * Find all reminders due right now.
             *
             * HYBRID may have both an interval and
             * custom reminder at the same minute.
             *
             * We merge those into one notification
             * to prevent double alerts.
             */
            const reminders =
                await this.getDueReminders(
                    settings,
                    currentTime,
                );

            if (!reminders.length) {
                return;
            }

            /*
             * Get active push devices FIRST.
             *
             * We don't create a reminder event if
             * there is no active device to notify.
             */
            const devices =
                await this.repository
                    .getActivePushDevices(
                        settings.user_id,
                    );

            if (!devices.length) {
                this.logger.warn(
                    `[Hydration Scheduler] No active push devices for user ${settings.user_id}`,
                );

                return;
            }

            const reminderDate =
                this.getDateInTimezone(
                    timezone,
                );

            /*
             * Process each unique due reminder.
             */
            for (const reminder of reminders) {
                await this.sendReminder(
                    settings,
                    devices,
                    reminderDate,
                    reminder,
                );
            }
        } catch (error) {
            this.logger.error(
                `[Hydration Scheduler] Failed for user ${settings.user_id}`,
                error instanceof Error
                    ? error.stack
                    : String(error),
            );
        }
    }

    /*
     * ========================================================
     * SEND ONE REMINDER
     * ========================================================
     */

    private async sendReminder(
        settings: any,
        devices: any[],
        reminderDate: string,
        reminder: {
            key: string;
            time: string;
            source: string;
        },
    ) {
        const reminderKey =
            reminder.key;

        const event =
            await this.repository
                .createReminderEvent(
                    settings.user_id,
                    reminderKey,
                    reminderDate,
                    reminder.time,
                );

        /*
         * Event already exists.
         *
         * This protects against duplicate sends
         * when the scheduler checks the same minute
         * more than once.
         */
        if (!event) {
            return;
        }

        this.logger.log(
            `[Hydration Scheduler] Reminder due for user ${settings.user_id} at ${reminder.time} | source=${reminder.source}`,
        );

        let successful = 0;
        let failed = 0;

        for (const device of devices) {
            try {
                await this.pushNotificationService
                    .sendToToken(
                        device.fcm_token,

                        '💧 TIME TO HYDRATE',

                        'Your body is waiting for its next water refill.',

                        {
                            type: 'hydration-reminder',
                            url: '/hydration',
                            eventId: event.id,
                            reminderKey: reminderKey,
                            reminderTime: reminder.time,
                            reminderSource: reminder.source ?? 'HYDRATION',
                            snoozeMinutes: String(
                                settings.snooze_minutes ?? 15,
                            ),
                        }
                    );

                successful++;

                this.logger.log(
                    `[Hydration Scheduler] Push sent to device ${device.id}`,
                );
            } catch (error) {
                failed++;

                this.logger.error(
                    `[Hydration Scheduler] Push failed for device ${device.id}`,
                    error instanceof Error
                        ? error.stack
                        : String(error),
                );
            }
        }

        /*
         * Mark reminder SENT only when at least
         * one device accepted the push.
         */
        if (successful > 0) {
            await this.repository
                .markReminderSent(
                    event.id,
                );

            this.logger.log(
                `[Hydration Scheduler] Reminder marked SENT: ${event.id} | successful=${successful} failed=${failed}`,
            );
        } else {
            /*
             * No device accepted the push.
             *
             * Keep the event pending so we don't
             * falsely report a successful reminder.
             */
            this.logger.warn(
                `[Hydration Scheduler] No successful push for reminder ${event.id} | failed=${failed}`,
            );
        }
    }

    /*
     * ========================================================
     * DETERMINE ALL DUE REMINDERS
     * ========================================================
     */

    private async getDueReminders(
        settings: any,
        currentTime: string,
    ) {
        const customTimes =
            await this.repository.getReminderTimes(
                settings.user_id,
            );

        const normalizedCustomTimes =
            customTimes.map((item: any) => ({
                reminder_time:
                    String(item.reminder_time),
            }));

        return this.scheduleEngine.getDueReminders(
            settings,
            currentTime,
            normalizedCustomTimes,
        );
    }

    /*
     * ========================================================
     * INTERVAL REMINDER
     * ========================================================
     *
     * Supports both:
     *
     * 07:00 → 23:00
     *
     * and:
     *
     * 22:00 → 06:00
     */

    private getIntervalReminder(
        settings: any,
        currentTime: string,
    ) {
        const intervalMinutes =
            Number(
                settings.interval_minutes,
            );

        if (
            !Number.isFinite(
                intervalMinutes,
            ) ||
            intervalMinutes <= 0
        ) {
            return null;
        }

        const wakeTime =
            this.timeToMinutes(
                this.normalizeTime(
                    settings.wake_time,
                ),
            );

        const sleepTime =
            this.timeToMinutes(
                this.normalizeTime(
                    settings.sleep_time,
                ),
            );

        const currentMinutes =
            this.timeToMinutes(
                currentTime,
            );

        const activeMinutes =
            this.getActiveWindowMinutes(
                wakeTime,
                sleepTime,
            );

        const elapsed =
            this.getElapsedActiveMinutes(
                wakeTime,
                currentMinutes,
            );

        if (
            elapsed < 0 ||
            elapsed > activeMinutes
        ) {
            return null;
        }

        /*
         * Reminder at wake + interval,
         * interval*2, interval*3, ...
         *
         * We intentionally don't send at the
         * exact wake time.
         */
        if (
            elapsed > 0 &&
            elapsed %
            intervalMinutes === 0
        ) {
            return {
                key:
                    `interval-${intervalMinutes}-${currentMinutes}`,
                time: currentTime,
                source: 'INTERVAL',
            };
        }

        return null;
    }

    /*
     * ========================================================
     * SMART REMINDER
     * ========================================================
     *
     * SMART is based on:
     *
     * - daily hydration goal
     * - active hydration window
     *
     * We estimate one reminder for roughly
     * every 500ml of the daily goal.
     *
     * Example:
     *
     * 3L goal → 6 reminders
     * 5L goal → 10 reminders
     * 8L goal → 16 → capped at 12
     *
     * The interval is then distributed across
     * the active window.
     *
     * This avoids the old fixed 120-minute
     * SMART behavior.
     */

    private getSmartReminder(
        settings: any,
        currentTime: string,
    ) {
        const wakeTime =
            this.timeToMinutes(
                this.normalizeTime(
                    settings.wake_time,
                ),
            );

        const sleepTime =
            this.timeToMinutes(
                this.normalizeTime(
                    settings.sleep_time,
                ),
            );

        const currentMinutes =
            this.timeToMinutes(
                currentTime,
            );

        const activeMinutes =
            this.getActiveWindowMinutes(
                wakeTime,
                sleepTime,
            );

        const elapsed =
            this.getElapsedActiveMinutes(
                wakeTime,
                currentMinutes,
            );

        if (
            elapsed <= 0 ||
            elapsed > activeMinutes
        ) {
            return null;
        }

        const dailyGoalMl =
            Number(
                settings.daily_goal_ml,
            );

        if (
            !Number.isFinite(
                dailyGoalMl,
            ) ||
            dailyGoalMl <= 0
        ) {
            return null;
        }

        /*
         * Roughly one reminder per 500ml.
         *
         * Minimum 4 reminders.
         * Maximum 12 reminders.
         *
         * This keeps SMART useful without
         * turning high goals into notification spam.
         */
        const reminderCount =
            Math.min(
                12,
                Math.max(
                    4,
                    Math.ceil(
                        dailyGoalMl / 500,
                    ),
                ),
            );

        /*
         * Distribute reminders across the
         * active window.
         *
         * Example:
         * 07:00 → 23:00 = 960 minutes
         * 6 reminders = 160 minutes
         */
        const smartInterval =
            Math.max(
                30,
                Math.round(
                    activeMinutes /
                    reminderCount,
                ),
            );

        /*
         * Cron runs every minute, so round the
         * calculated interval to a whole minute.
         */
        if (
            elapsed % smartInterval === 0
        ) {
            return {
                key:
                    `smart-${smartInterval}-${currentMinutes}`,
                time: currentTime,
                source: 'SMART',
            };
        }

        return null;
    }

    /*
     * ========================================================
     * TIMEZONE
     * ========================================================
     */

    private getCurrentTimeInTimezone(
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
                new Date(),
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
        };
    }

    private getDateInTimezone(
        timezone: string,
    ) {
        const now =
            this.getCurrentTimeInTimezone(
                timezone,
            );

        return `${now.year}-${String(
            now.month,
        ).padStart(
            2,
            '0',
        )}-${String(
            now.day,
        ).padStart(
            2,
            '0',
        )}`;
    }

    private formatTime(
        date: {
            hour: number;
            minute: number;
        },
    ) {
        return `${String(
            date.hour,
        ).padStart(
            2,
            '0',
        )}:${String(
            date.minute,
        ).padStart(
            2,
            '0',
        )}`;
    }

    /*
     * ========================================================
     * ACTIVE WINDOW
     * ========================================================
     */

    private isWithinActiveWindow(
        currentTime: string,
        wakeTime: string,
        sleepTime: string,
    ) {
        const current =
            this.timeToMinutes(
                currentTime,
            );

        const wake =
            this.timeToMinutes(
                wakeTime,
            );

        const sleep =
            this.timeToMinutes(
                sleepTime,
            );

        /*
         * Same time means a full-day window.
         */
        if (wake === sleep) {
            return true;
        }

        /*
         * Normal window:
         *
         * 07:00 → 23:00
         */
        if (wake < sleep) {
            return (
                current >= wake &&
                current <= sleep
            );
        }

        /*
         * Overnight window:
         *
         * 22:00 → 06:00
         */
        return (
            current >= wake ||
            current <= sleep
        );
    }

    /*
     * ========================================================
     * ACTIVE WINDOW CALCULATIONS
     * ========================================================
     */

    private getActiveWindowMinutes(
        wakeTime: number,
        sleepTime: number,
    ) {
        if (wakeTime === sleepTime) {
            return 24 * 60;
        }

        if (sleepTime > wakeTime) {
            return sleepTime - wakeTime;
        }

        return (
            24 * 60 -
            wakeTime +
            sleepTime
        );
    }

    private getElapsedActiveMinutes(
        wakeTime: number,
        currentTime: number,
    ) {
        if (currentTime >= wakeTime) {
            return (
                currentTime -
                wakeTime
            );
        }

        return (
            24 * 60 -
            wakeTime +
            currentTime
        );
    }

    private async processSnoozedReminders() {
        const reminders =
            await this.repository.getDueSnoozedReminders();

        if (!reminders.length) {
            return;
        }

        for (const event of reminders) {
            try {
                const devices =
                    await this.repository.getActivePushDevices(
                        event.user_id,
                    );

                if (!devices.length) {
                    this.logger.warn(
                        `[Hydration Scheduler] No active push devices for snoozed reminder ${event.id}`,
                    );

                    continue;
                }

                const title = '💧 TIME TO HYDRATE';

                const body =
                    'Your snoozed hydration reminder is back. Drink some water!';

                let successful = 0;
                let failed = 0;

                for (const device of devices) {
                    try {
                        await this.pushNotificationService.sendToToken(
                            device.fcm_token,
                            title,
                            body,
                            {
                                type: 'hydration-reminder',
                                url: '/hydration',
                                eventId: event.id,
                                reminderKey: event.reminder_key,
                                reminderTime: event.reminder_time,
                                reminderSource: 'SNOOZED',
                                snoozeMinutes: String(
                                    event.snooze_minutes ?? 15,
                                ),
                            }
                        );

                        successful++;

                        this.logger.log(
                            `[Hydration Scheduler] Snoozed push sent to device ${device.id}`,
                        );
                    } catch (error) {
                        failed++;

                        this.logger.error(
                            `[Hydration Scheduler] Snoozed push failed for device ${device.id}`,
                            error instanceof Error
                                ? error.stack
                                : String(error),
                        );
                    }
                }

                if (successful > 0) {
                    await this.repository.markReminderSent(
                        event.id,
                    );

                    this.logger.log(
                        `[Hydration Scheduler] Snoozed reminder marked SENT: ${event.id} | successful=${successful} failed=${failed}`,
                    );
                } else {
                    this.logger.warn(
                        `[Hydration Scheduler] No successful push for snoozed reminder ${event.id} | failed=${failed}`,
                    );
                }
            } catch (error) {
                this.logger.error(
                    `[Hydration Scheduler] Error processing snoozed reminder ${event.id}`,
                    error instanceof Error
                        ? error.stack
                        : String(error),
                );
            }
        }
    }

    /*
     * ========================================================
     * HELPERS
     * ========================================================
     */

    private timeToMinutes(
        time: string,
    ) {
        const [
            hours,
            minutes,
        ] = time
            .split(':')
            .map(Number);

        return (
            hours * 60 +
            minutes
        );
    }

    private normalizeTime(
        value: string,
    ) {
        if (!value) {
            return '00:00';
        }

        return value
            .toString()
            .slice(0, 5);
    }
}
