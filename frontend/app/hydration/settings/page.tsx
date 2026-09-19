'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getIdToken,
  onAuthStateChanged,
} from 'firebase/auth';

import { auth } from '../../../src/lib/firebase';

import AppShell from '../../../src/components/layout/AppShell';

const WATER_GOALS = [
  { liters: 2, ml: 2000 },
  { liters: 3, ml: 3000 },
  { liters: 4, ml: 4000 },
  { liters: 5, ml: 5000 },
  { liters: 6, ml: 6000 },
  { liters: 8, ml: 8000 },
  { liters: 10, ml: 10000 },
];

type ReminderMode =
  | 'SMART'
  | 'INTERVAL'
  | 'CUSTOM'
  | 'HYBRID';

const REMINDER_MODES = [
  {
    id: 'SMART' as ReminderMode,
    title: 'SMART',
    description: 'Automatically distribute reminders',
    icon: '✦',
  },
  {
    id: 'INTERVAL' as ReminderMode,
    title: 'INTERVAL',
    description: 'Remind me every X hours',
    icon: '◷',
  },
  {
    id: 'CUSTOM' as ReminderMode,
    title: 'CUSTOM',
    description: 'Choose exact reminder times',
    icon: '⌖',
  },
  {
    id: 'HYBRID' as ReminderMode,
    title: 'HYBRID',
    description: 'Interval + custom reminders',
    icon: '◇',
  },
];

const INTERVAL_OPTIONS = [1, 2, 3, 4];

const SNOOZE_OPTIONS = [10, 15, 20, 30];

export default function HydrationPage() {
  const [step, setStep] = useState(1);

  // -----------------------------------------
  // STEP 1
  // -----------------------------------------

  const [selectedGoal, setSelectedGoal] =
    useState(3000);

  const [customGoal, setCustomGoal] =
    useState('');

  // -----------------------------------------
  // STEP 2
  // -----------------------------------------

  const [reminderMode, setReminderMode] =
    useState<ReminderMode>('SMART');

  const [intervalHours, setIntervalHours] =
    useState(2);

  const [customReminders, setCustomReminders] =
    useState<string[]>([
      '10:00',
      '14:00',
      '17:00',
    ]);

  const [newReminderTime, setNewReminderTime] =
    useState('09:00');

  // -----------------------------------------
  // STEP 3
  // -----------------------------------------

  const [wakeTime, setWakeTime] =
    useState('07:00');

  const [sleepTime, setSleepTime] =
    useState('23:00');

  // -----------------------------------------
  // STEP 4
  // -----------------------------------------

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [inAppEnabled, setInAppEnabled] =
    useState(true);

  const [soundEnabled, setSoundEnabled] =
    useState(true);

  const [snoozeMinutes, setSnoozeMinutes] =
    useState(15);

  // -----------------------------------------
  // ACTIVATION STATE
  // -----------------------------------------

  const [isActivating, setIsActivating] =
    useState(false);

  const [activationError, setActivationError] =
    useState('');

  const [activationSuccess, setActivationSuccess] =
    useState(false);

  // -----------------------------------------
  // HYDRATION REMINDER ACTION
  // -----------------------------------------

  const [hydrationActionMessage, setHydrationActionMessage] =
    useState('');

  const processedReminderEvents =
    useRef<Set<string>>(new Set());

  const pendingDrankAction =
    useRef<{
      eventId: string;
      amountMl: number;
    } | null>(null);

  // -----------------------------------------
  // EXISTING SETTINGS
  // -----------------------------------------

  const [hasExistingSettings, setHasExistingSettings] =
    useState(false);

  const [isLoadingSettings, setIsLoadingSettings] =
    useState(true);

  // -----------------------------------------
  // PROCESS REMINDER DRANK ACTION
  // -----------------------------------------

  const processDrankAction = async (
    eventId: string,
    amountMl = 250,
  ) => {
    if (!eventId) {
      return;
    }

    if (processedReminderEvents.current.has(eventId)) {
      return;
    }

    const currentUser = auth.currentUser;

    /*
     * The Service Worker does not have the Firebase
     * authentication token. If the user session is not
     * ready yet, keep the action pending and process it
     * when Firebase authentication becomes available.
     */

    if (!currentUser) {
      pendingDrankAction.current = {
        eventId,
        amountMl,
      };

      return;
    }

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error(
          'NEXT_PUBLIC_API_URL is not configured.',
        );
      }

      const idToken =
        await getIdToken(currentUser);

      const response =
        await fetch(
          `${apiUrl}/hydration/reminder/${encodeURIComponent(
            eventId,
          )}/drank`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              amountMl,
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
          'Failed to log reminder water.',
        );
      }

      processedReminderEvents.current.add(
        eventId,
      );

      pendingDrankAction.current = null;

      setHydrationActionMessage(
        `✓ ${amountMl} ML WATER LOGGED`,
      );

      console.log(
        '[Hydration] Reminder marked as drank:',
        {
          eventId,
          amountMl,
          data,
        },
      );
    } catch (error) {
      console.error(
        '[Hydration] Failed to process DRANK WATER action:',
        error,
      );

      setHydrationActionMessage(
        error instanceof Error
          ? error.message
          : 'Failed to log reminder water.',
      );
    }
  };

  const processSnoozeAction = async (
    eventId: string,
    snoozeMinutes = 15,
  ) => {
    if (!eventId) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error(
          'NEXT_PUBLIC_API_URL is not configured.',
        );
      }

      const idToken =
        await getIdToken(currentUser);

      const response =
        await fetch(
          `${apiUrl}/hydration/reminder/${encodeURIComponent(
            eventId,
          )}/snooze`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Authorization:
                `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              snoozeMinutes,
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
          'Failed to snooze reminder.',
        );
      }

      setHydrationActionMessage(
        `✓ REMINDER SNOOZED FOR ${snoozeMinutes} MIN`,
      );

      console.log(
        '[Hydration] Reminder snoozed:',
        {
          eventId,
          snoozeMinutes,
          data,
        },
      );
    } catch (error) {
      console.error(
        '[Hydration] Failed to process SNOOZE action:',
        error,
      );

      setHydrationActionMessage(
        error instanceof Error
          ? error.message
          : 'Failed to snooze reminder.',
      );
    }
  };

  // -----------------------------------------
  // HYDRATION SERVICE WORKER ACTIONS
  // -----------------------------------------

  useEffect(() => {
    const handleServiceWorkerMessage = (
      event: MessageEvent,
    ) => {
      const message =
        event.data;

      if (
        !message ||
        (
          message.type !== 'HYDRATION_DRANK' &&
          message.type !== 'HYDRATION_SNOOZE'
        )
      ) {
        return;
      }

      if (
        message.type === 'HYDRATION_SNOOZE'
      ) {
        processSnoozeAction(
          String(message.eventId || ''),
          Number(
            message.snoozeMinutes || 15,
          ),
        );

        return;
      }

      processDrankAction(
        String(message.eventId || ''),
        Number(
          message.amountMl || 250,
        ),
      );
    };

    if (
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.addEventListener(
        'message',
        handleServiceWorkerMessage,
      );
    }

    /*
     * If the Service Worker had to open the
     * Hydration page, it passes the action through
     * query parameters.
     */

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const hydrationAction =
      params.get(
        'hydrationAction',
      );

    if (
      hydrationAction === 'drank'
    ) {
      const eventId =
        params.get('eventId') || '';

      const amountMl =
        Number(
          params.get('amountMl') ||
          250,
        );

      processDrankAction(
        eventId,
        Number.isInteger(amountMl) &&
          amountMl > 0
          ? amountMl
          : 250,
      );

      /*
       * Remove the action parameters so a browser
       * refresh cannot trigger the same action again.
       */

      window.history.replaceState(
        {},
        '',
        '/hydration',
      );
    }

    if (
      hydrationAction === 'snooze'
    ) {
      const eventId =
        params.get('eventId') || '';

      const snoozeMinutes =
        Number(
          params.get('snoozeMinutes') || 15,
        );

      processSnoozeAction(
        eventId,
        Number.isInteger(snoozeMinutes) &&
          snoozeMinutes > 0
          ? snoozeMinutes
          : 15,
      );

      window.history.replaceState(
        {},
        '',
        '/hydration',
      );
    }

    return () => {
      if (
        'serviceWorker' in
        navigator
      ) {
        navigator.serviceWorker.removeEventListener(
          'message',
          handleServiceWorkerMessage,
        );
      }
    };
  }, []);

  // -----------------------------------------
  // LOAD SAVED HYDRATION SETTINGS
  // -----------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setHasExistingSettings(false);
          setIsLoadingSettings(false);
          return;
        }

        try {
          setIsLoadingSettings(true);
          setActivationError('');

          const idToken =
            await getIdToken(currentUser);

          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL;

          if (!apiUrl) {
            throw new Error(
              'NEXT_PUBLIC_API_URL is not configured.',
            );
          }

          const response = await fetch(
            `${apiUrl}/hydration`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            },
          );

          const data = await response
            .json()
            .catch(() => null);

          if (!response.ok) {
            throw new Error(
              data?.message ||
              'Failed to load hydration settings.',
            );
          }

          const settings = data?.settings;

          if (!settings) {
            setHasExistingSettings(false);
            return;
          }

          setHasExistingSettings(true);

          // Daily goal
          const savedGoal = Number(
            settings.daily_goal_ml,
          );

          const presetGoal = WATER_GOALS.find(
            (goal) => goal.ml === savedGoal,
          );

          if (presetGoal) {
            setSelectedGoal(savedGoal);
            setCustomGoal('');
          } else {
            setSelectedGoal(0);
            setCustomGoal(String(savedGoal));
          }

          // Reminder mode
          const savedReminderMode =
            settings.reminder_mode as ReminderMode;

          if (
            ['SMART', 'INTERVAL', 'CUSTOM', 'HYBRID'].includes(
              savedReminderMode,
            )
          ) {
            setReminderMode(savedReminderMode);
          }

          // Interval
          if (settings.interval_minutes) {
            setIntervalHours(
              Number(settings.interval_minutes) / 60,
            );
          }

          // Active window
          if (settings.wake_time) {
            setWakeTime(
              String(settings.wake_time).slice(0, 5),
            );
          }

          if (settings.sleep_time) {
            setSleepTime(
              String(settings.sleep_time).slice(0, 5),
            );
          }

          // Alerts
          setNotificationsEnabled(
            Boolean(settings.notifications_enabled),
          );

          setInAppEnabled(
            Boolean(settings.in_app_enabled),
          );

          setSoundEnabled(
            Boolean(settings.sound_enabled),
          );

          // Snooze
          if (settings.snooze_minutes) {
            setSnoozeMinutes(
              Number(settings.snooze_minutes),
            );
          }

          // Custom / hybrid reminder times
          if (Array.isArray(data?.reminderTimes)) {
            setCustomReminders(
              data.reminderTimes.map(
                (time: unknown) =>
                  String(time).slice(0, 5),
              ),
            );
          }

          /*
           * A notification may have opened this page
           * before Firebase authentication finished loading.
           * Process that queued action now.
           */

          if (
            pendingDrankAction.current
          ) {
            const pending =
              pendingDrankAction.current;

            pendingDrankAction.current =
              null;

            await processDrankAction(
              pending.eventId,
              pending.amountMl,
            );
          }
        } catch (error) {
          console.error(
            '[Hydration] Failed to load settings:',
            error,
          );

          setHasExistingSettings(false);
          setActivationError(
            error instanceof Error
              ? error.message
              : 'Failed to load hydration settings.',
          );
        } finally {
          setIsLoadingSettings(false);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  // -----------------------------------------
  // GOAL
  // -----------------------------------------

  const activeGoal =
    selectedGoal === 0
      ? Number(customGoal || 0)
      : selectedGoal;

  const goalLiters =
    activeGoal > 0
      ? activeGoal / 1000
      : 0;

  // -----------------------------------------
  // TIME HELPERS
  // -----------------------------------------

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time
      .split(':')
      .map(Number);

    return hours * 60 + minutes;
  };

  const formatTime = (time: string) => {
    const [hoursString, minutes] =
      time.split(':');

    const hours = Number(hoursString);

    const suffix =
      hours >= 12
        ? 'PM'
        : 'AM';

    const displayHour =
      hours % 12 || 12;

    return `${displayHour}:${minutes} ${suffix}`;
  };

  const isTimeInsideWindow = (
    time: string,
    wake: string = wakeTime,
    sleep: string = sleepTime,
  ) => {
    const current =
      timeToMinutes(time);

    const wakeMinutes =
      timeToMinutes(wake);

    const sleepMinutes =
      timeToMinutes(sleep);

    if (
      wakeMinutes === sleepMinutes
    ) {
      return true;
    }

    if (
      wakeMinutes < sleepMinutes
    ) {
      return (
        current >= wakeMinutes &&
        current <= sleepMinutes
      );
    }

    return (
      current >= wakeMinutes ||
      current <= sleepMinutes
    );
  };

  const getWindowDuration = (
    wake: string,
    sleep: string,
  ) => {
    const wakeMinutes =
      timeToMinutes(wake);

    const sleepMinutes =
      timeToMinutes(sleep);

    let duration =
      sleepMinutes -
      wakeMinutes;

    if (duration <= 0) {
      duration += 24 * 60;
    }

    return duration;
  };

  const windowDurationMinutes =
    getWindowDuration(
      wakeTime,
      sleepTime,
    );

  const windowHours =
    Math.floor(
      windowDurationMinutes / 60,
    );

  const windowMinutes =
    windowDurationMinutes % 60;

  const windowDurationText =
    windowMinutes === 0
      ? `${windowHours}h`
      : `${windowHours}h ${windowMinutes}m`;

  // -----------------------------------------
  // CUSTOM REMINDERS
  // -----------------------------------------

  const sortedCustomReminders =
    useMemo(() => {
      return [...customReminders].sort(
        (a, b) =>
          timeToMinutes(a) -
          timeToMinutes(b),
      );
    }, [customReminders]);

  const addCustomReminder = () => {
    if (!newReminderTime) {
      return;
    }

    if (
      !isTimeInsideWindow(
        newReminderTime,
      )
    ) {
      alert(
        `Reminder must be inside your hydration window (${formatTime(
          wakeTime,
        )} - ${formatTime(
          sleepTime,
        )}).`,
      );

      return;
    }

    if (
      customReminders.includes(
        newReminderTime,
      )
    ) {
      alert(
        'This reminder time already exists.',
      );

      return;
    }

    setCustomReminders(
      (current) =>
        [
          ...current,
          newReminderTime,
        ].sort(
          (a, b) =>
            timeToMinutes(a) -
            timeToMinutes(b),
        ),
    );

    setNewReminderTime('09:00');
  };

  const removeCustomReminder = (
    time: string,
  ) => {
    setCustomReminders(
      (current) =>
        current.filter(
          (item) =>
            item !== time,
        ),
    );
  };

  const invalidCustomReminders =
    customReminders.filter(
      (time) =>
        !isTimeInsideWindow(
          time,
          wakeTime,
          sleepTime,
        ),
    );

  const hasInvalidCustomReminders =
    invalidCustomReminders.length >
    0;

  // -----------------------------------------
  // VALIDATION
  // -----------------------------------------

  const canContinueFromStep1 =
    activeGoal >= 500;

  const canContinueFromStep2 =
    reminderMode === 'SMART' ||
    reminderMode === 'INTERVAL' ||
    customReminders.length > 0;

  const canContinueFromStep3 =
    !hasInvalidCustomReminders;

  // -----------------------------------------
  // NAVIGATION
  // -----------------------------------------

  const goNext = () => {
    if (
      step === 1 &&
      !canContinueFromStep1
    ) {
      alert(
        'Please select a valid daily water goal.',
      );

      return;
    }

    if (
      step === 2 &&
      !canContinueFromStep2
    ) {
      alert(
        'Please add at least one custom reminder.',
      );

      return;
    }

    if (
      step === 3 &&
      !canContinueFromStep3
    ) {
      alert(
        'Some custom reminders are outside your active hydration window.',
      );

      return;
    }

    setStep(
      (current) =>
        Math.min(
          current + 1,
          5,
        ),
    );
  };

  const goBack = () => {
    setStep(
      (current) =>
        Math.max(
          current - 1,
          1,
        ),
    );
  };

  // -----------------------------------------
  // ACTIVATE HYDRATION
  // -----------------------------------------

  const activateHydration =
    async () => {
      setActivationError('');
      setActivationSuccess(false);

      if (!auth.currentUser) {
        setActivationError(
          'You are not signed in. Please sign in again.',
        );

        return;
      }

      if (activeGoal <= 0) {
        setActivationError(
          'Please select a valid daily water goal.',
        );

        return;
      }

      if (
        hasInvalidCustomReminders
      ) {
        setActivationError(
          'Some custom reminders are outside your active hydration window.',
        );

        return;
      }

      try {
        setIsActivating(true);

        const idToken =
          await getIdToken(
            auth.currentUser,
          );

        const apiUrl =
          process.env
            .NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error(
            'NEXT_PUBLIC_API_URL is not configured.',
          );
        }

        const payload = {
          dailyGoalMl:
            activeGoal,

          reminderMode,

          intervalMinutes:
            reminderMode ===
              'INTERVAL' ||
              reminderMode ===
              'HYBRID'
              ? intervalHours *
              60
              : undefined,

          customReminderTimes:
            reminderMode ===
              'CUSTOM' ||
              reminderMode ===
              'HYBRID'
              ? customReminders
              : [],

          wakeTime,

          sleepTime,

          timezone:
            Intl.DateTimeFormat().resolvedOptions()
              .timeZone ||
            'Asia/Kolkata',

          notificationsEnabled,

          soundEnabled,

          inAppEnabled,

          snoozeMinutes,
        };

        const endpoint = hasExistingSettings
          ? `${apiUrl}/hydration/settings`
          : `${apiUrl}/hydration/setup`;

        const method = hasExistingSettings
          ? 'PATCH'
          : 'POST';

        const response =
          await fetch(
            endpoint,
            {
              method,

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${idToken}`,
              },

              body: JSON.stringify(
                payload,
              ),
            },
          );

        const data =
          await response
            .json()
            .catch(
              () => null,
            );

        if (!response.ok) {
          throw new Error(
            data?.message ||
            'Failed to activate hydration system.',
          );
        }

        console.log(
          'Hydration activated:',
          data,
        );

        setHasExistingSettings(true);

        setActivationSuccess(
          true,
        );
      } catch (error) {
        console.error(
          'Hydration activation error:',
          error,
        );

        setActivationError(
          error instanceof Error
            ? error.message
            : 'Something went wrong while activating hydration.',
        );
      } finally {
        setIsActivating(false);
      }
    };

  // -----------------------------------------
  // STEP INDICATOR
  // -----------------------------------------

  const stepLabels = [
    'GOAL',
    'REMINDERS',
    'SCHEDULE',
    'ALERTS',
    'REVIEW',
  ];

  const renderStepIndicator = () => (
    <div className="mb-10 flex items-center justify-center gap-2 overflow-x-auto pb-2">
      {stepLabels.map(
        (
          label,
          index,
        ) => {
          const stepNumber =
            index + 1;

          return (
            <div
              key={label}
              className="flex items-center"
            >
              <div className="flex min-w-[72px] flex-col items-center gap-2">
                <div
                  className={`
                    flex h-9 w-9
                    items-center
                    justify-center
                    rounded-full
                    border text-xs
                    font-bold
                    transition-all
                    duration-300
                    ${stepNumber ===
                      step
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : stepNumber <
                        step
                        ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
                        : 'border-white/10 bg-white/[0.03] text-white/30'
                    }
                  `}
                >
                  {stepNumber <
                    step
                    ? '✓'
                    : `0${stepNumber}`}
                </div>

                <span
                  className={`
                    text-[9px]
                    font-bold
                    tracking-[0.2em]
                    ${stepNumber ===
                      step
                      ? 'text-cyan-300'
                      : 'text-white/30'
                    }
                  `}
                >
                  {label}
                </span>
              </div>

              {stepNumber <
                5 && (
                  <div
                    className={`
                    mx-1 h-px w-8
                    sm:w-12
                    ${stepNumber <
                        step
                        ? 'bg-emerald-400/40'
                        : 'bg-white/10'
                      }
                  `}
                  />
                )}
            </div>
          );
        },
      )}
    </div>
  );

  // -----------------------------------------
  // STEP 1
  // -----------------------------------------

  const renderGoalStep =
    () => (
      <div className="space-y-8">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-400">
            STEP 01 / DAILY TARGET
          </p>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            How much water do you want to drink?
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Set your daily hydration
            target. You can change this
            later from your hydration
            settings.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WATER_GOALS.map(
            (goal) => {
              const active =
                selectedGoal ===
                goal.ml;

              return (
                <button
                  key={goal.ml}
                  type="button"
                  onClick={() =>
                    setSelectedGoal(
                      goal.ml,
                    )
                  }
                  className={`
                    group relative
                    overflow-hidden
                    rounded-2xl
                    border p-5
                    text-left
                    transition-all
                    ${active
                      ? 'border-cyan-400/60 bg-cyan-400/[0.08] shadow-[0_0_30px_rgba(34,211,238,0.12)]'
                      : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]'
                    }
                  `}
                >
                  <div className="text-2xl font-black text-white">
                    {goal.liters}L
                  </div>

                  <div className="mt-1 text-[10px] font-bold tracking-[0.15em] text-white/35">
                    {goal.ml} ML / DAY
                  </div>

                  {active && (
                    <div className="absolute right-3 top-3 text-cyan-300">
                      ✓
                    </div>
                  )}
                </button>
              );
            },
          )}
        </div>

        <div
          className={`
            rounded-2xl
            border p-5
            ${selectedGoal ===
              0
              ? 'border-cyan-400/50 bg-cyan-400/[0.05]'
              : 'border-white/10 bg-white/[0.02]'
            }
          `}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedGoal(
                0,
              );

              if (
                !customGoal
              ) {
                setCustomGoal(
                  '3500',
                );
              }
            }}
            className="mb-4 flex items-center gap-3 text-left"
          >
            <div
              className={`
                flex h-5 w-5
                items-center
                justify-center
                rounded-full
                border
                ${selectedGoal ===
                  0
                  ? 'border-cyan-400 bg-cyan-400'
                  : 'border-white/20'
                }
              `}
            >
              {selectedGoal ===
                0 && (
                  <div className="h-2 w-2 rounded-full bg-black" />
                )}
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                CUSTOM GOAL
              </div>

              <div className="text-[10px] text-white/35">
                Set your own daily
                target
              </div>
            </div>
          </button>

          {selectedGoal ===
            0 && (
              <div className="relative">
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={
                    customGoal
                  }
                  onChange={(
                    event,
                  ) =>
                    setCustomGoal(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Enter amount in ml"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">
                  ML
                </span>
              </div>
            )}
        </div>

        <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.18em] text-white/35">
              SELECTED DAILY TARGET
            </span>

            <span className="text-lg font-black text-cyan-300">
              {goalLiters ||
                0}
              L
            </span>
          </div>
        </div>
      </div>
    );

  // -----------------------------------------
  // CUSTOM REMINDER EDITOR
  // -----------------------------------------

  const renderReminderEditor =
    () => {
      if (
        reminderMode !==
        'CUSTOM' &&
        reminderMode !==
        'HYBRID'
      ) {
        return null;
      }

      return (
        <div className="mt-8 space-y-5 rounded-2xl border border-cyan-400/10 bg-black/20 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-black tracking-wide text-white">
                CUSTOM REMINDER TIMES
              </div>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Choose the exact
                times when you
                want your hydration
                reminders.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold tracking-wider text-white/40">
              {
                customReminders.length
              }{' '}
              REMINDER
              {customReminders.length !==
                1
                ? 'S'
                : ''}
            </div>
          </div>

          <div className="space-y-2">
            {sortedCustomReminders.map(
              (time) => {
                const outsideWindow =
                  !isTimeInsideWindow(
                    time,
                  );

                return (
                  <div
                    key={time}
                    className={`
                      flex items-center
                      justify-between
                      gap-3 rounded-xl
                      border px-4 py-3
                      ${outsideWindow
                        ? 'border-red-400/30 bg-red-400/[0.04]'
                        : 'border-white/10 bg-white/[0.025]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-sm text-cyan-300">
                        ◷
                      </div>

                      <div>
                        <div className="text-sm font-bold text-white">
                          {formatTime(
                            time,
                          )}
                        </div>

                        {outsideWindow && (
                          <div className="mt-0.5 text-[9px] font-bold tracking-wider text-red-300">
                            OUTSIDE ACTIVE WINDOW
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeCustomReminder(
                          time,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/10 text-red-300/60 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                );
              },
            )}

            {customReminders.length ===
              0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                  <div className="text-2xl text-white/15">
                    ◷
                  </div>

                  <p className="mt-2 text-xs font-bold text-white/30">
                    NO CUSTOM REMINDERS
                  </p>

                  <p className="mt-1 text-[10px] text-white/20">
                    Add your first
                    reminder below.
                  </p>
                </div>
              )}
          </div>

          <div className="border-t border-white/5 pt-5">
            <div className="mb-2 text-[9px] font-bold tracking-[0.18em] text-white/30">
              ADD REMINDER
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="time"
                value={
                  newReminderTime
                }
                onChange={(
                  event,
                ) =>
                  setNewReminderTime(
                    event
                      .target
                      .value,
                  )
                }
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-400/50"
              />

              <button
                type="button"
                onClick={
                  addCustomReminder
                }
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-xs font-black tracking-[0.12em] text-cyan-300 transition hover:bg-cyan-400/15"
              >
                + ADD TIME
              </button>
            </div>

            <p className="mt-3 text-[10px] leading-5 text-white/25">
              Current hydration
              window:{' '}
              <span className="text-white/45">
                {formatTime(
                  wakeTime,
                )}
              </span>{' '}
              →{' '}
              <span className="text-white/45">
                {formatTime(
                  sleepTime,
                )}
              </span>
            </p>
          </div>

          {hasInvalidCustomReminders && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.04] p-4">
              <div className="text-[10px] font-black tracking-[0.15em] text-red-300">
                ⚠ WINDOW CONFLICT
              </div>

              <p className="mt-1 text-xs leading-5 text-red-200/60">
                Some reminder
                times are outside
                your active
                hydration window.
              </p>
            </div>
          )}
        </div>
      );
    };

  // -----------------------------------------
  // STEP 2
  // -----------------------------------------

  const renderReminderStep =
    () => (
      <div className="space-y-8">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-400">
            STEP 02 / REMINDER ENGINE
          </p>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            How should we remind you?
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Choose how your hydration
            reminders should be generated.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {REMINDER_MODES.map(
            (mode) => {
              const active =
                reminderMode ===
                mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    setReminderMode(
                      mode.id,
                    )
                  }
                  className={`
                    relative overflow-hidden
                    rounded-2xl border
                    p-5 text-left
                    transition-all
                    ${active
                      ? 'border-cyan-400/50 bg-cyan-400/[0.06] shadow-[0_0_25px_rgba(34,211,238,0.08)]'
                      : 'border-white/10 bg-white/[0.025] hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg text-cyan-300">
                      {mode.icon}
                    </div>

                    {active && (
                      <span className="text-xs text-cyan-300">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="mt-5 text-sm font-black tracking-[0.12em] text-white">
                    {mode.title}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-white/35">
                    {
                      mode.description
                    }
                  </div>
                </button>
              );
            },
          )}
        </div>

        {(reminderMode ===
          'INTERVAL' ||
          reminderMode ===
          'HYBRID') && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="mb-4">
                <div className="text-sm font-black text-white">
                  REMINDER INTERVAL
                </div>

                <p className="mt-1 text-xs text-white/35">
                  We will remind you
                  every selected
                  number of hours.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {INTERVAL_OPTIONS.map(
                  (hours) => {
                    const active =
                      intervalHours ===
                      hours;

                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() =>
                          setIntervalHours(
                            hours,
                          )
                        }
                        className={`
                        rounded-xl border
                        px-4 py-4
                        text-center
                        transition
                        ${active
                            ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                            : 'border-white/10 bg-black/20 text-white/50 hover:border-white/20'
                          }
                      `}
                      >
                        <div className="text-lg font-black">
                          {hours}h
                        </div>

                        <div className="mt-1 text-[9px] font-bold tracking-wider">
                          EVERY
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}

        {renderReminderEditor()}

        {reminderMode ===
          'SMART' && (
            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                  ✦
                </div>

                <div>
                  <div className="text-sm font-black text-white">
                    SMART DISTRIBUTION
                  </div>

                  <p className="mt-1 text-xs leading-6 text-white/35">
                    Your reminders will
                    be automatically
                    distributed across
                    your active hydration
                    window based on your
                    daily goal.
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    );

  // -----------------------------------------
  // STEP 3
  // -----------------------------------------

  const renderScheduleStep =
    () => (
      <div className="space-y-8">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-400">
            STEP 03 / ACTIVE WINDOW
          </p>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            When are you awake?
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Reminders will only be
            scheduled inside this
            hydration window.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <label className="mb-3 block text-[10px] font-bold tracking-[0.18em] text-white/35">
              WAKE TIME
            </label>

            <input
              type="time"
              value={wakeTime}
              onChange={(
                event,
              ) =>
                setWakeTime(
                  event
                    .target
                    .value,
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-lg font-black text-white outline-none transition focus:border-cyan-400/50"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <label className="mb-3 block text-[10px] font-bold tracking-[0.18em] text-white/35">
              SLEEP TIME
            </label>

            <input
              type="time"
              value={sleepTime}
              onChange={(
                event,
              ) =>
                setSleepTime(
                  event
                    .target
                    .value,
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-lg font-black text-white outline-none transition focus:border-cyan-400/50"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-white/30">
                HYDRATION WINDOW
              </div>

              <div className="mt-2 text-xl font-black text-white">
                {formatTime(
                  wakeTime,
                )}

                <span className="mx-3 text-cyan-400/40">
                  →
                </span>

                {formatTime(
                  sleepTime,
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-[10px] font-bold tracking-[0.2em] text-white/30">
                ACTIVE DURATION
              </div>

              <div className="mt-2 text-xl font-black text-cyan-300">
                {
                  windowDurationText
                }
              </div>
            </div>
          </div>
        </div>

        {hasInvalidCustomReminders && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5">
            <div className="flex gap-3">
              <div className="text-red-300">
                ⚠
              </div>

              <div>
                <div className="text-xs font-black tracking-wider text-red-300">
                  CUSTOM REMINDER CONFLICT
                </div>

                <p className="mt-1 text-xs leading-5 text-red-200/60">
                  These reminders
                  are outside your
                  newly selected
                  hydration window:
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {invalidCustomReminders.map(
                    (time) => (
                      <span
                        key={time}
                        className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-[10px] font-bold text-red-300"
                      >
                        {formatTime(
                          time,
                        )}
                      </span>
                    ),
                  )}
                </div>

                <p className="mt-3 text-[10px] text-red-200/40">
                  Go back to Step 2
                  and remove or
                  change these
                  reminder times.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  // -----------------------------------------
  // STEP 4
  // -----------------------------------------

  const renderAlertsStep =
    () => (
      <div className="space-y-8">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-400">
            STEP 04 / ALERT SYSTEM
          </p>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            How should we alert you?
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Configure how hydration
            reminders should reach you.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              setNotificationsEnabled(
                !notificationsEnabled,
              )
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
                ◉
              </div>

              <div>
                <div className="text-sm font-black text-white">
                  PUSH NOTIFICATIONS
                </div>

                <div className="mt-1 text-xs text-white/35">
                  System-level
                  hydration alerts
                </div>
              </div>
            </div>

            <div
              className={`
                relative h-6 w-11
                rounded-full
                transition
                ${notificationsEnabled
                  ? 'bg-cyan-400'
                  : 'bg-white/10'
                }
              `}
            >
              <div
                className={`
                  absolute top-1
                  h-4 w-4
                  rounded-full
                  bg-white
                  transition
                  ${notificationsEnabled
                    ? 'left-6'
                    : 'left-1'
                  }
                `}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setInAppEnabled(
                !inAppEnabled,
              )
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/[0.06] text-purple-300">
                ▣
              </div>

              <div>
                <div className="text-sm font-black text-white">
                  IN-APP ALERTS
                </div>

                <div className="mt-1 text-xs text-white/35">
                  Show reminders inside
                  Life RPG
                </div>
              </div>
            </div>

            <div
              className={`
                relative h-6 w-11
                rounded-full
                transition
                ${inAppEnabled
                  ? 'bg-purple-400'
                  : 'bg-white/10'
                }
              `}
            >
              <div
                className={`
                  absolute top-1
                  h-4 w-4
                  rounded-full
                  bg-white
                  transition
                  ${inAppEnabled
                    ? 'left-6'
                    : 'left-1'
                  }
                `}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSoundEnabled(
                !soundEnabled,
              )
            }
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.06] text-amber-300">
                ♫
              </div>

              <div>
                <div className="text-sm font-black text-white">
                  REMINDER SOUND
                </div>

                <div className="mt-1 text-xs text-white/35">
                  Play a sound when a
                  reminder fires
                </div>
              </div>
            </div>

            <div
              className={`
                relative h-6 w-11
                rounded-full
                transition
                ${soundEnabled
                  ? 'bg-amber-400'
                  : 'bg-white/10'
                }
              `}
            >
              <div
                className={`
                  absolute top-1
                  h-4 w-4
                  rounded-full
                  bg-white
                  transition
                  ${soundEnabled
                    ? 'left-6'
                    : 'left-1'
                  }
                `}
              />
            </div>
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <div className="mb-4">
            <div className="text-sm font-black text-white">
              SNOOZE DURATION
            </div>

            <p className="mt-1 text-xs text-white/35">
              If you are busy,
              postpone the reminder.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SNOOZE_OPTIONS.map(
              (minutes) => {
                const active =
                  snoozeMinutes ===
                  minutes;

                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() =>
                      setSnoozeMinutes(
                        minutes,
                      )
                    }
                    className={`
                      rounded-xl
                      border px-4 py-4
                      transition
                      ${active
                        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300'
                        : 'border-white/10 bg-black/20 text-white/45 hover:border-white/20'
                      }
                    `}
                  >
                    <div className="text-lg font-black">
                      {minutes}
                    </div>

                    <div className="mt-1 text-[9px] font-bold tracking-wider">
                      MIN
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
          <div className="text-[9px] font-bold tracking-[0.2em] text-cyan-400/70">
            REMINDER PREVIEW
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
              💧
            </div>

            <div>
              <div className="text-sm font-black text-white">
                TIME TO HYDRATE
              </div>

              <div className="mt-1 text-xs text-white/35">
                Your body is waiting for
                its next water refill.
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  // -----------------------------------------
  // STEP 5
  // -----------------------------------------

  const renderReviewStep =
    () => (
      <div className="space-y-8">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-cyan-400">
            STEP 05 / FINAL CHECK
          </p>

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Your hydration system is ready.
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
            Review your configuration before
            activating the system.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/30">
              DAILY GOAL
            </div>

            <div className="mt-2 text-2xl font-black text-cyan-300">
              {goalLiters}L
            </div>

            <div className="mt-1 text-[10px] text-white/30">
              {activeGoal} ML / DAY
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/30">
              REMINDER MODE
            </div>

            <div className="mt-2 text-2xl font-black text-white">
              {reminderMode}
            </div>

            {(reminderMode ===
              'INTERVAL' ||
              reminderMode ===
              'HYBRID') && (
                <div className="mt-1 text-[10px] text-white/30">
                  Every{' '}
                  {
                    intervalHours
                  }{' '}
                  hour
                  {intervalHours !==
                    1
                    ? 's'
                    : ''}
                </div>
              )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/30">
              ACTIVE WINDOW
            </div>

            <div className="mt-2 text-lg font-black text-white">
              {formatTime(
                wakeTime,
              )}

              <span className="mx-2 text-cyan-400/40">
                →
              </span>

              {formatTime(
                sleepTime,
              )}
            </div>

            <div className="mt-1 text-[10px] text-white/30">
              {
                windowDurationText
              }{' '}
              active
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/30">
              ALERTS
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {notificationsEnabled && (
                <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-[9px] font-bold text-cyan-300">
                  PUSH
                </span>
              )}

              {inAppEnabled && (
                <span className="rounded-lg border border-purple-400/20 bg-purple-400/10 px-2.5 py-1.5 text-[9px] font-bold text-purple-300">
                  IN-APP
                </span>
              )}

              {soundEnabled && (
                <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[9px] font-bold text-amber-300">
                  SOUND
                </span>
              )}
            </div>
          </div>
        </div>

        {(reminderMode ===
          'CUSTOM' ||
          reminderMode ===
          'HYBRID') && (
            <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
              <div className="text-[9px] font-bold tracking-[0.2em] text-cyan-400/70">
                CUSTOM REMINDER SCHEDULE
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {sortedCustomReminders.map(
                  (time) => (
                    <span
                      key={time}
                      className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300"
                    >
                      {formatTime(
                        time,
                      )}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.18em] text-white/30">
              SNOOZE
            </span>

            <span className="text-sm font-black text-white">
              {snoozeMinutes}{' '}
              MIN
            </span>
          </div>
        </div>

        {activationError && (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/[0.05] p-5">
            <div className="text-[10px] font-black tracking-[0.15em] text-red-300">
              ⚠ SAVE FAILED
            </div>

            <p className="mt-2 text-xs leading-5 text-red-200/70">
              {
                activationError
              }
            </p>
          </div>
        )}

        {activationSuccess && (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                ✓
              </div>

              <div>
                <div className="text-sm font-black tracking-wide text-emerald-300">
                  HYDRATION SETTINGS SAVED
                </div>

                <p className="mt-1 text-xs text-emerald-200/50">
                  Your hydration settings
                  have been saved
                  successfully.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={
            activateHydration
          }
          disabled={
            isActivating
          }
          className={`
              group relative w-full
              overflow-hidden
              rounded-2xl
              border px-6 py-5
              transition
              ${isActivating
              ? 'cursor-wait border-cyan-400/20 bg-cyan-400/[0.05]'
              : 'border-cyan-400/40 bg-cyan-400/10 hover:border-cyan-300/60 hover:bg-cyan-400/15'
            }
            `}
        >
          <div className="relative z-10 flex items-center justify-center gap-3">
            <span className="text-sm font-black tracking-[0.2em] text-cyan-300">
              {isActivating
                ? hasExistingSettings
                  ? 'UPDATING...'
                  : 'ACTIVATING...'
                : hasExistingSettings
                  ? 'UPDATE HYDRATION'
                  : 'ACTIVATE HYDRATION'}
            </span>

            {!isActivating && (
              <span className="text-lg text-cyan-300 transition group-hover:translate-x-1">
                →
              </span>
            )}
          </div>

          {!isActivating && (
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-300/[0.06] to-transparent transition duration-700 group-hover:translate-x-full" />
          )}
        </button>
      </div>
    );

  // -----------------------------------------
  // MAIN
  // -----------------------------------------

  return (
    <AppShell
      gold={0}
      streak={0}
    >
      <main className="min-h-screen bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* HEADER */}

          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-xl">
                💧
              </div>

              <div>
                <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-400">
                  LIFE RPG / SYSTEM MODULE
                </div>

                <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
                  HYDRATION PROTOCOL
                </h1>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-6 text-white/40">
              Build your personalized
              hydration system. Set your
              goal, configure reminders and
              define when Life RPG should
              keep you hydrated.
            </p>
          </div>

          {renderStepIndicator()}

          {hydrationActionMessage && (
            <div
              className={`
                mb-6 rounded-2xl border p-4
                ${hydrationActionMessage.startsWith('✓')
                  ? 'border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-300'
                  : 'border-red-400/25 bg-red-400/[0.05] text-red-300'
                }
              `}
            >
              <div className="text-[10px] font-black tracking-[0.15em]">
                {hydrationActionMessage.startsWith('✓')
                  ? 'HYDRATION ACTION'
                  : 'HYDRATION ACTION FAILED'}
              </div>

              <div className="mt-1 text-xs font-bold">
                {hydrationActionMessage}
              </div>
            </div>
          )}

          {/* MAIN PANEL */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
            {isLoadingSettings ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="text-[10px] font-black tracking-[0.25em] text-cyan-400">
                    HYDRATION SYSTEM
                  </div>
                  <div className="mt-3 text-sm font-bold text-white/50">
                    LOADING SAVED CONFIGURATION...
                  </div>
                </div>
              </div>
            ) : (
              <>
                {step === 1 &&
                  renderGoalStep()}

                {step === 2 &&
                  renderReminderStep()}

                {step === 3 &&
                  renderScheduleStep()}

                {step === 4 &&
                  renderAlertsStep()}

                {step === 5 &&
                  renderReviewStep()}
              </>
            )}
          </div>

          {/* NAVIGATION */}

          {!isLoadingSettings && step < 5 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={
                  goBack
                }
                disabled={
                  step === 1
                }
                className={`
                rounded-xl border
                px-5 py-3
                text-xs font-black
                tracking-[0.15em]
                transition
                ${step === 1
                    ? 'cursor-not-allowed border-white/5 text-white/10'
                    : 'border-white/10 text-white/45 hover:border-white/20 hover:text-white'
                  }
              `}
              >
                ← BACK
              </button>

              <div className="text-[9px] font-bold tracking-[0.2em] text-white/20">
                {String(
                  step,
                ).padStart(
                  2,
                  '0',
                )}
                {' / '}
                05
              </div>

              <button
                type="button"
                onClick={
                  goNext
                }
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3 text-xs font-black tracking-[0.15em] text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-400/15"
              >
                CONTINUE →
              </button>
            </div>
          )}

          {!isLoadingSettings && step === 5 && (
            <div className="mt-6 flex justify-start">
              <button
                type="button"
                onClick={
                  goBack
                }
                disabled={
                  isActivating
                }
                className="rounded-xl border border-white/10 px-5 py-3 text-xs font-black tracking-[0.15em] text-white/45 transition hover:border-white/20 hover:text-white"
              >
                ← EDIT SETTINGS
              </button>
            </div>
          )}

          <div className="mt-8 text-center text-[9px] font-bold tracking-[0.2em] text-white/15">
            HYDRATION SYSTEM // LIFE RPG
          </div>
        </div>
      </main>
    </AppShell>
  );
}