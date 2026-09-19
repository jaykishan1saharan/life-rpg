export type HydrationReminderSource =
  | 'SMART'
  | 'INTERVAL'
  | 'CUSTOM'
  | 'HYBRID';

export type HydrationReminder = {
  key: string;
  time: string;
  source: HydrationReminderSource;
};

export type HydrationNextReminder = {
  key: string;
  time: string;
  source: HydrationReminderSource;
  countdownSeconds: number;
  minutesLeft: number;
  secondsLeft: number;
  isToday: boolean;
};

type CustomReminder = {
  reminder_time: string;
};

export class HydrationScheduleEngine {
  /*
   * ========================================================
   * GET DUE REMINDERS
   * ========================================================
   *
   * This is the SAME calculation used by the scheduler.
   *
   * It supports:
   *
   * SMART
   * INTERVAL
   * CUSTOM
   * HYBRID
   *
   * HYBRID reminders occurring at the same minute
   * are merged into one reminder.
   */
  getDueReminders(
    settings: any,
    currentTime: string,
    customTimes: CustomReminder[] = [],
  ): HydrationReminder[] {
    const mode = String(
      settings.reminder_mode ?? 'SMART',
    );

    const reminders: HydrationReminder[] = [];

    /*
     * --------------------------------------------------------
     * INTERVAL
     * --------------------------------------------------------
     */
    if (
      mode === 'INTERVAL' ||
      mode === 'HYBRID'
    ) {
      const intervalReminder =
        this.getIntervalReminder(
          settings,
          currentTime,
        );

      if (intervalReminder) {
        reminders.push(
          intervalReminder,
        );
      }
    }

    /*
     * --------------------------------------------------------
     * CUSTOM
     * --------------------------------------------------------
     */
    if (
      mode === 'CUSTOM' ||
      mode === 'HYBRID'
    ) {
      for (
        const reminder of customTimes
      ) {
        const reminderTime =
          this.normalizeTime(
            reminder.reminder_time,
          );

        if (
          reminderTime ===
          currentTime
        ) {
          reminders.push({
            key:
              `custom-${reminderTime}`,
            time: reminderTime,
            source: 'CUSTOM',
          });
        }
      }
    }

    /*
     * --------------------------------------------------------
     * SMART
     * --------------------------------------------------------
     */
    if (mode === 'SMART') {
      const smartReminder =
        this.getSmartReminder(
          settings,
          currentTime,
        );

      if (smartReminder) {
        reminders.push(
          smartReminder,
        );
      }
    }

    /*
     * --------------------------------------------------------
     * HYBRID DEDUPLICATION
     * --------------------------------------------------------
     */
    const byTime =
      new Map<
        string,
        HydrationReminder
      >();

    for (
      const reminder of reminders
    ) {
      const existing =
        byTime.get(
          reminder.time,
        );

      if (!existing) {
        byTime.set(
          reminder.time,
          reminder,
        );

        continue;
      }

      byTime.set(
        reminder.time,
        {
          key:
            `hybrid-${reminder.time}`,
          time:
            reminder.time,
          source:
            existing.source ===
            reminder.source
              ? existing.source
              : 'HYBRID',
        },
      );
    }

    return Array.from(
      byTime.values(),
    );
  }

  /*
   * ========================================================
   * GET NEXT REMINDER
   * ========================================================
   *
   * Used by the dashboard.
   *
   * IMPORTANT:
   * It uses the exact same interval,
   * SMART and CUSTOM calculations as
   * getDueReminders().
   */
  getNextReminder(
    settings: any,
    currentTime: string,
    currentSeconds: number,
    customTimes: CustomReminder[] = [],
  ): HydrationNextReminder | null {
    const mode = String(
      settings.reminder_mode ?? 'SMART',
    );

    const currentMinutes =
      this.timeToMinutes(
        currentTime,
      );

    const candidates: HydrationReminder[] =
      [];

    /*
     * --------------------------------------------------------
     * INTERVAL
     * --------------------------------------------------------
     */
    if (
      mode === 'INTERVAL' ||
      mode === 'HYBRID'
    ) {
      const candidate =
        this.getNextIntervalReminder(
          settings,
          currentMinutes,
        );

      if (candidate) {
        candidates.push(
          candidate,
        );
      }
    }

    /*
     * --------------------------------------------------------
     * CUSTOM
     * --------------------------------------------------------
     */
    if (
      mode === 'CUSTOM' ||
      mode === 'HYBRID'
    ) {
      const candidate =
        this.getNextCustomReminder(
          settings,
          currentMinutes,
          customTimes,
        );

      if (candidate) {
        candidates.push(
          candidate,
        );
      }
    }

    /*
     * --------------------------------------------------------
     * SMART
     * --------------------------------------------------------
     */
    if (mode === 'SMART') {
      const candidate =
        this.getNextSmartReminder(
          settings,
          currentMinutes,
        );

      if (candidate) {
        candidates.push(
          candidate,
        );
      }
    }

    if (!candidates.length) {
      return null;
    }

    /*
     * Find the closest reminder.
     */
    let best =
      candidates[0];

    let bestDelta =
      this.getForwardMinutes(
        currentMinutes,
        this.timeToMinutes(
          best.time,
        ),
      );

    for (
      const candidate of
      candidates.slice(1)
    ) {
      const delta =
        this.getForwardMinutes(
          currentMinutes,
          this.timeToMinutes(
            candidate.time,
          ),
        );

      if (delta < bestDelta) {
        best =
          candidate;

        bestDelta =
          delta;
      }
    }

    /*
     * If the reminder is exactly at
     * the current minute, it should not
     * become the "next" reminder.
     *
     * Move it to the next occurrence.
     */
    if (bestDelta === 0) {
      const replacement =
        candidates
          .map((candidate) => ({
            candidate,
            delta:
              this.getForwardMinutesStrict(
                currentMinutes,
                this.timeToMinutes(
                  candidate.time,
                ),
              ),
          }))
          .sort(
            (a, b) =>
              a.delta -
              b.delta,
          )[0];

      if (replacement) {
        best =
          replacement.candidate;

        bestDelta =
          replacement.delta;
      }
    }

    /*
     * Calculate seconds precisely enough
     * for the dashboard countdown.
     */
    let countdownSeconds =
      bestDelta * 60 -
      Math.max(
        0,
        Math.min(
          currentSeconds,
          59,
        ),
      );

    if (
      countdownSeconds <= 0
    ) {
      countdownSeconds =
        60 * 60 * 24;
    }

    const candidateMinutes =
      this.timeToMinutes(
        best.time,
      );

    const isToday =
      candidateMinutes >
      currentMinutes;

    /*
     * Same minute cannot normally happen,
     * but keep this safe.
     */
    const safeIsToday =
      bestDelta < 1440
        ? isToday
        : false;

    return {
      key:
        best.key,

      time:
        best.time,

      source:
        best.source,

      countdownSeconds,

      minutesLeft:
        Math.floor(
          countdownSeconds / 60,
        ),

      secondsLeft:
        countdownSeconds % 60,

      isToday:
        safeIsToday,
    };
  }

  /*
   * ========================================================
   * INTERVAL REMINDER
   * ========================================================
   */
  private getIntervalReminder(
    settings: any,
    currentTime: string,
  ): HydrationReminder | null {
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

    if (
      elapsed > 0 &&
      elapsed %
        intervalMinutes ===
        0
    ) {
      return {
        key:
          `interval-${intervalMinutes}-${currentMinutes}`,

        time:
          currentTime,

        source:
          'INTERVAL',
      };
    }

    return null;
  }

  /*
   * ========================================================
   * NEXT INTERVAL
   * ========================================================
   */
  private getNextIntervalReminder(
    settings: any,
    currentMinutes: number,
  ): HydrationReminder | null {
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

    const activeMinutes =
      this.getActiveWindowMinutes(
        wakeTime,
        sleepTime,
      );

    const isActive =
      this.isWithinActiveWindow(
        currentMinutes,
        wakeTime,
        sleepTime,
      );

    let reminderOffset: number;

    if (isActive) {
      const elapsed =
        this.getElapsedActiveMinutes(
          wakeTime,
          currentMinutes,
        );

      const nextIndex =
        Math.floor(
          elapsed /
            intervalMinutes,
        ) + 1;

      reminderOffset =
        nextIndex *
        intervalMinutes;
    } else {
      /*
       * Outside the active window.
       *
       * Start from the first interval
       * after the next wake.
       */
      reminderOffset =
        intervalMinutes;
    }

    if (
      reminderOffset >
      activeMinutes
    ) {
      return null;
    }

    const reminderMinutes =
      (
        wakeTime +
        reminderOffset
      ) % 1440;

    const time =
      this.minutesToTime(
        reminderMinutes,
      );

    return {
      key:
        `interval-${intervalMinutes}-${reminderMinutes}`,

      time,

      source:
        'INTERVAL',
    };
  }

  /*
   * ========================================================
   * SMART REMINDER
   * ========================================================
   *
   * SAME algorithm as the scheduler:
   *
   * 500ml per reminder
   * minimum 4
   * maximum 12
   * distributed across active window
   */
  private getSmartReminder(
    settings: any,
    currentTime: string,
  ): HydrationReminder | null {
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

    const smartInterval =
      this.getSmartInterval(
        settings,
        activeMinutes,
      );

    if (
      elapsed %
        smartInterval ===
      0
    ) {
      return {
        key:
          `smart-${smartInterval}-${currentMinutes}`,

        time:
          currentTime,

        source:
          'SMART',
      };
    }

    return null;
  }

  /*
   * ========================================================
   * NEXT SMART
   * ========================================================
   */
  private getNextSmartReminder(
    settings: any,
    currentMinutes: number,
  ): HydrationReminder | null {
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

    const activeMinutes =
      this.getActiveWindowMinutes(
        wakeTime,
        sleepTime,
      );

    const smartInterval =
      this.getSmartInterval(
        settings,
        activeMinutes,
      );

    const isActive =
      this.isWithinActiveWindow(
        currentMinutes,
        wakeTime,
        sleepTime,
      );

    let reminderOffset: number;

    if (isActive) {
      const elapsed =
        this.getElapsedActiveMinutes(
          wakeTime,
          currentMinutes,
        );

      const nextIndex =
        Math.floor(
          elapsed /
            smartInterval,
        ) + 1;

      reminderOffset =
        nextIndex *
        smartInterval;
    } else {
      reminderOffset =
        smartInterval;
    }

    if (
      reminderOffset >
      activeMinutes
    ) {
      return null;
    }

    const reminderMinutes =
      (
        wakeTime +
        reminderOffset
      ) % 1440;

    const time =
      this.minutesToTime(
        reminderMinutes,
      );

    return {
      key:
        `smart-${smartInterval}-${reminderMinutes}`,

      time,

      source:
        'SMART',
    };
  }

  /*
   * ========================================================
   * CUSTOM
   * ========================================================
   */
  private getNextCustomReminder(
    settings: any,
    currentMinutes: number,
    customTimes: CustomReminder[],
  ): HydrationReminder | null {
    if (!customTimes.length) {
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

    const validTimes =
      customTimes
        .map((item) =>
          this.normalizeTime(
            item.reminder_time,
          ),
        )
        .filter((time) =>
          this.isWithinActiveWindow(
            this.timeToMinutes(
              time,
            ),
            wakeTime,
            sleepTime,
          ),
        );

    if (!validTimes.length) {
      return null;
    }

    let bestTime:
      string | null = null;

    let bestDelta =
      Number.POSITIVE_INFINITY;

    for (
      const time of validTimes
    ) {
      const reminderMinutes =
        this.timeToMinutes(
          time,
        );

      const delta =
        this.getForwardMinutesStrict(
          currentMinutes,
          reminderMinutes,
        );

      if (
        delta <
        bestDelta
      ) {
        bestDelta =
          delta;

        bestTime =
          time;
      }
    }

    if (!bestTime) {
      return null;
    }

    return {
      key:
        `custom-${bestTime}`,

      time:
        bestTime,

      source:
        'CUSTOM',
    };
  }

  /*
   * ========================================================
   * SMART INTERVAL
   * ========================================================
   */
  private getSmartInterval(
    settings: any,
    activeMinutes: number,
  ) {
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
      return 120;
    }

    const reminderCount =
      Math.min(
        12,
        Math.max(
          4,
          Math.ceil(
            dailyGoalMl /
              500,
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

  /*
   * ========================================================
   * ACTIVE WINDOW
   * ========================================================
   */
  private isWithinActiveWindow(
    currentMinutes: number,
    wakeTime: number,
    sleepTime: number,
  ) {
    if (
      wakeTime ===
      sleepTime
    ) {
      return true;
    }

    if (
      wakeTime <
      sleepTime
    ) {
      return (
        currentMinutes >=
          wakeTime &&
        currentMinutes <=
          sleepTime
      );
    }

    return (
      currentMinutes >=
        wakeTime ||
      currentMinutes <=
        sleepTime
    );
  }

  private getActiveWindowMinutes(
    wakeTime: number,
    sleepTime: number,
  ) {
    if (
      wakeTime ===
      sleepTime
    ) {
      return 1440;
    }

    if (
      sleepTime >
      wakeTime
    ) {
      return (
        sleepTime -
        wakeTime
      );
    }

    return (
      1440 -
      wakeTime +
      sleepTime
    );
  }

  private getElapsedActiveMinutes(
    wakeTime: number,
    currentTime: number,
  ) {
    if (
      currentTime >=
      wakeTime
    ) {
      return (
        currentTime -
        wakeTime
      );
    }

    return (
      1440 -
      wakeTime +
      currentTime
    );
  }

  /*
   * ========================================================
   * FORWARD TIME
   * ========================================================
   */
  private getForwardMinutes(
    currentMinutes: number,
    targetMinutes: number,
  ) {
    let delta =
      targetMinutes -
      currentMinutes;

    if (delta < 0) {
      delta += 1440;
    }

    return delta;
  }

  private getForwardMinutesStrict(
    currentMinutes: number,
    targetMinutes: number,
  ) {
    let delta =
      targetMinutes -
      currentMinutes;

    if (delta <= 0) {
      delta += 1440;
    }

    return delta;
  }

  /*
   * ========================================================
   * TIME HELPERS
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

  private minutesToTime(
    totalMinutes: number,
  ) {
    const normalized =
      (
        totalMinutes %
          1440 +
        1440
      ) % 1440;

    const hours =
      Math.floor(
        normalized / 60,
      );

    const minutes =
      normalized % 60;

    return `${String(
      hours,
    ).padStart(
      2,
      '0',
    )}:${String(
      minutes,
    ).padStart(
      2,
      '0',
    )}`;
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