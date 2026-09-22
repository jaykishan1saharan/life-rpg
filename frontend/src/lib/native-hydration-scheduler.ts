import { Capacitor, registerPlugin } from '@capacitor/core';

type ReminderMode =
  | 'SMART'
  | 'INTERVAL'
  | 'CUSTOM'
  | 'HYBRID';

export type NativeHydrationSettings = {
  dailyGoalMl: number;
  reminderMode: ReminderMode;
  intervalMinutes?: number;
  customReminderTimes?: string[];
  wakeTime: string;
  sleepTime: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  snoozeMinutes?: number;
};

type NativeAlarm = {
  id: number;
  at: number;
  title: string;
  body: string;
  snoozeMinutes: number;
  soundEnabled: boolean;
};

type NativeHydrationAlarmPlugin = {
  schedule(options: {
    alarms: NativeAlarm[];
  }): Promise<{
    scheduled: number;
    exact: boolean;
  }>;

  cancelAll(): Promise<void>;

  canScheduleExactAlarms(): Promise<{
    allowed: boolean;
  }>;

  openExactAlarmSettings(): Promise<void>;

  getPendingAction(): Promise<{
    action: 'DRANK' | 'SNOOZE';
    amountMl: number;
    alarmId: number;
    triggerAt: number;
    snoozeMinutes: number;
  } | undefined>;
};

const NativeHydrationAlarm =
  registerPlugin<NativeHydrationAlarmPlugin>(
    'NativeHydrationAlarm',
  );

const ALARM_ID_START = 920000;

const SCHEDULE_DAYS = 7;

function timeToMinutes(
  time: string,
): number {

  const [
    hours,
    minutes,
  ] = time
    .slice(0, 5)
    .split(':')
    .map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function getWindowDuration(
  wakeTime: string,
  sleepTime: string,
): number {

  const wake =
    timeToMinutes(
      wakeTime,
    );

  const sleep =
    timeToMinutes(
      sleepTime,
    );

  let duration =
    sleep - wake;

  if (duration <= 0) {
    duration += 1440;
  }

  return duration;
}

function getSmartReminderOffsets(
  dailyGoalMl: number,
  wakeTime: string,
  sleepTime: string,
): number[] {

  const duration =
    getWindowDuration(
      wakeTime,
      sleepTime,
    );

  const reminderCount =
    Math.min(
      Math.max(
        Math.ceil(
          dailyGoalMl / 500,
        ),
        4,
      ),
      12,
    );

  const interval =
    Math.max(
      30,
      Math.round(
        duration /
        reminderCount,
      ),
    );

  const offsets: number[] =
    [];

  for (
    let index = 1;
    index <= reminderCount;
    index++
  ) {

    const offset =
      Math.round(
        interval * index,
      );

    if (
      offset > 0 &&
      offset <= duration
    ) {
      offsets.push(offset);
    }
  }

  return offsets;
}

function getIntervalReminderOffsets(
  wakeTime: string,
  sleepTime: string,
  intervalMinutes: number,
): number[] {

  const duration =
    getWindowDuration(
      wakeTime,
      sleepTime,
    );

  if (
    !Number.isFinite(
      intervalMinutes,
    ) ||
    intervalMinutes <= 0
  ) {
    return [];
  }

  const offsets: number[] =
    [];

  for (
    let offset = intervalMinutes;
    offset <= duration;
    offset += intervalMinutes
  ) {

    offsets.push(offset);
  }

  return offsets;
}

function normalizeCustomTimes(
  times: string[],
): number[] {

  return times
    .filter(
      (time) =>
        /^\d{2}:\d{2}$/.test(
          time,
        ),
    )
    .map(
      timeToMinutes,
    )
    .filter(
      (minutes) =>
        minutes >= 0 &&
        minutes < 1440,
    );
}

function createDateFromWakeOffset(
  wakeDate: Date,
  wakeTime: string,
  offsetMinutes: number,
): Date {

  const wakeMinutes =
    timeToMinutes(
      wakeTime,
    );

  const absoluteMinutes =
    wakeMinutes +
    offsetMinutes;

  const dayShift =
    Math.floor(
      absoluteMinutes / 1440,
    );

  const minutesInDay =
    absoluteMinutes % 1440;

  const date =
    new Date(wakeDate);

  date.setDate(
    date.getDate() +
    dayShift,
  );

  date.setHours(
    0,
    0,
    0,
    0,
  );

  date.setMinutes(
    minutesInDay,
  );

  return date;
}

function buildReminderDatesForDay(
  wakeDate: Date,
  settings: NativeHydrationSettings,
): Date[] {

  const wakeMinutes =
    timeToMinutes(
      settings.wakeTime,
    );

  const duration =
    getWindowDuration(
      settings.wakeTime,
      settings.sleepTime,
    );

  const reminderDates: Date[] =
    [];

  if (
    settings.reminderMode ===
    'SMART'
  ) {

    const offsets =
      getSmartReminderOffsets(
        settings.dailyGoalMl,
        settings.wakeTime,
        settings.sleepTime,
      );

    for (
      const offset of offsets
    ) {

      reminderDates.push(
        createDateFromWakeOffset(
          wakeDate,
          settings.wakeTime,
          offset,
        ),
      );
    }
  }

  if (
    settings.reminderMode ===
    'INTERVAL' ||
    settings.reminderMode ===
    'HYBRID'
  ) {

    const offsets =
      getIntervalReminderOffsets(
        settings.wakeTime,
        settings.sleepTime,
        Number(
          settings.intervalMinutes ??
          0,
        ),
      );

    for (
      const offset of offsets
    ) {

      reminderDates.push(
        createDateFromWakeOffset(
          wakeDate,
          settings.wakeTime,
          offset,
        ),
      );
    }
  }

  if (
    settings.reminderMode ===
    'CUSTOM' ||
    settings.reminderMode ===
    'HYBRID'
  ) {

    const customTimes =
      normalizeCustomTimes(
        settings.customReminderTimes ??
        [],
      );

    for (
      const customMinutes of
      customTimes
    ) {

      let offset =
        customMinutes -
        wakeMinutes;

      if (offset < 0) {
        offset += 1440;
      }

      if (
        offset >= 0 &&
        offset <= duration
      ) {

        reminderDates.push(
          createDateFromWakeOffset(
            wakeDate,
            settings.wakeTime,
            offset,
          ),
        );
      }
    }
  }

  const unique =
    new Map<number, Date>();

  for (
    const date of reminderDates
  ) {

    unique.set(
      date.getTime(),
      date,
    );
  }

  return Array.from(
    unique.values(),
  ).sort(
    (a, b) =>
      a.getTime() -
      b.getTime(),
  );
}

export async function scheduleNativeHydrationReminders(
  settings: NativeHydrationSettings,
) {

  if (
    !Capacitor.isNativePlatform()
  ) {

    console.log(
      '[Native Alarm] Web detected. Skipping.',
    );

    return;
  }

  console.log(
    '[Native Alarm] Scheduling hydration alarms...',
  );

  await NativeHydrationAlarm.cancelAll();

  if (
    !settings.notificationsEnabled
  ) {

    console.log(
      '[Native Alarm] Notifications disabled.',
    );

    return;
  }

  const exactStatus =
    await NativeHydrationAlarm
      .canScheduleExactAlarms();

  if (!exactStatus.allowed) {

    await NativeHydrationAlarm
      .openExactAlarmSettings();

    throw new Error(
      'Please allow "Alarms & reminders" for Life Easy TODO, then save Hydration again.',
    );
  }

  const now =
    new Date();

  const scheduledDates: Date[] =
    [];

  for (
    let day = 0;
    day < SCHEDULE_DAYS;
    day++
  ) {

    const wakeDate =
      new Date(now);

    wakeDate.setDate(
      now.getDate() +
      day,
    );

    wakeDate.setHours(
      0,
      0,
      0,
      0,
    );

    const dates =
      buildReminderDatesForDay(
        wakeDate,
        settings,
      );

    for (
      const date of dates
    ) {

      if (
        date.getTime() >
        now.getTime()
      ) {

        scheduledDates.push(
          date,
        );
      }
    }
  }

  const uniqueDates =
    Array.from(
      new Map(
        scheduledDates.map(
          (date) => [
            date.getTime(),
            date,
          ],
        ),
      ).values(),
    ).sort(
      (a, b) =>
        a.getTime() -
        b.getTime(),
    );

  if (
    uniqueDates.length === 0
  ) {

    console.log(
      '[Native Alarm] No future reminders.',
    );

    return;
  }

  const alarms: NativeAlarm[] = uniqueDates.map(
    (date, index) => ({
      id: ALARM_ID_START + index,

      at: date.getTime(),

      title: '💧 TIME TO HYDRATE',

      body:
        'Your body is waiting for its next water refill.',

      snoozeMinutes:
        settings.snoozeMinutes ?? 15,

      soundEnabled:
        settings.soundEnabled,
    }),
  );

  const result =
    await NativeHydrationAlarm.schedule({
      alarms,
    });

  console.log(
    '========================================',
  );

  console.log(
    '[Native Alarm] SUCCESS',
  );

  console.log(
    '[Native Alarm] Mode:',
    settings.reminderMode,
  );

  console.log(
    '[Native Alarm] Total:',
    result.scheduled,
  );

  console.log(
    '[Native Alarm] First:',
    new Date(
      alarms[0].at,
    ).toString(),
  );

  console.log(
    '[Native Alarm] Last:',
    new Date(
      alarms[
        alarms.length - 1
      ].at,
    ).toString(),
  );

  console.log(
    '========================================',
  );
}

export async function clearNativeHydrationReminders() {

  if (
    !Capacitor.isNativePlatform()
  ) {
    return;
  }

  await NativeHydrationAlarm.cancelAll();

  console.log(
    '[Native Alarm] All hydration alarms cancelled.',
  );
}

export async function getNativeHydrationPendingAction() {
  if (!Capacitor.isNativePlatform()) {
    return undefined;
  }

  return NativeHydrationAlarm.getPendingAction();
}