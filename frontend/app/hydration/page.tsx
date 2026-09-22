'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronRight,
    Clock3,
    Droplets,
    Plus,
    RefreshCw,
    Settings,
    Sparkles,
    Target,
    Trophy,
    Waves,
    Zap,
    X,
} from 'lucide-react';

import { auth } from '../../src/lib/firebase';
import AppShell from '../../src/components/layout/AppShell';
import { listenForHydrationMessages } from '../../src/lib/firebase-messaging';
import { onAuthStateChanged } from '@firebase/auth';

import { Capacitor } from '@capacitor/core';
import {
    FirebaseAuthentication,
} from '@capacitor-firebase/authentication';

import {
    scheduleNativeHydrationReminders,
    clearNativeHydrationReminders,
    getNativeHydrationPendingAction,
} from '../../src/lib/native-hydration-scheduler';

type HydrationLog = {
    id: string;
    amount_ml: number;
    logged_at: string;
    source: string;
    created_at?: string;
};

type HydrationStreak = {
    currentStreak: number;
    bestStreak: number;
    goalMl: number;
};

type HydrationToday = {
    date: string;
    goalMl: number;
    totalMl: number;
    remainingMl: number;
    progressPercent: number;
    logs: HydrationLog[];
    streak?: HydrationStreak;
};

type HydrationResponse = {
    date: string;
    goalMl: number;
    totalMl: number;
    remainingMl: number;
    progressPercent: number;
    logs: HydrationLog[];

    streak?: HydrationStreak;
};

type NextReminder = {
    reminderTime: string;
    reminderMode: string;
    countdownSeconds: number;
    minutesLeft: number;
    secondsLeft: number;
    isToday: boolean;
    source: string;
};

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getHydrationAuthToken(): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
        try {
            const current =
                await FirebaseAuthentication.getCurrentUser();

            if (!current.user) {
                return null;
            }

            const result =
                await FirebaseAuthentication.getIdToken();

            return result.token;
        } catch (error) {
            console.error(
                '[Hydration Auth] Native auth failed:',
                error,
            );

            return null;
        }
    }

    const user = auth.currentUser;

    if (!user) {
        return null;
    }

    return user.getIdToken();
}

const QUICK_AMOUNTS = [100, 250, 500, 750];

function formatLitres(ml: number) {
    return `${(ml / 1000).toFixed(2)} L`;
}

function formatMl(ml: number) {
    return `${ml.toLocaleString()} ml`;
}

function formatTime(value: string) {
    if (!value) return '--:--';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(value?: string) {
    if (!value) {
        return '';
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function getProgressMessage(progress: number) {
    if (progress >= 100) {
        return 'DAILY TARGET ACHIEVED';
    }

    if (progress >= 75) {
        return 'ALMOST THERE';
    }

    if (progress >= 50) {
        return 'GOOD PROGRESS';
    }

    if (progress >= 25) {
        return 'KEEP GOING';
    }

    return 'HYDRATION STARTED';
}

function getSourceLabel(source: string) {
    switch (source) {
        case 'QUICK_ADD':
            return 'Quick Add';
        case 'REMINDER':
            return 'Reminder';
        case 'MANUAL':
            return 'Manual';
        default:
            return source || 'Water';
    }
}

export default function HydrationPage() {
    const [hydration, setHydration] =
        useState<HydrationToday | null>(null);

    const [customAmount, setCustomAmount] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [nextReminder, setNextReminder] =
        useState<NextReminder | null>(null);

    const [countdown, setCountdown] =
        useState(0);

    const [
        hydrationPopup,
        setHydrationPopup,
    ] = useState<{
        eventId: string;
        title: string;
        body: string;
        reminderTime: string;
        snoozeMinutes: number;
        amountMl: number;
    } | null>(null);

    const [
        popupActionLoading,
        setPopupActionLoading,
    ] = useState(false);

    const pendingReminderAction =
        useRef<{
            action: 'DRANK' | 'SNOOZE';
            eventId: string;
            amountMl?: number;
            snoozeMinutes?: number;
        } | null>(null);

    const loadHydration = useCallback(
        async (showRefresh = false) => {
            try {
                if (showRefresh) {
                    setRefreshing(true);
                } else {
                    setIsLoading(true);
                }

                setError('');

                const token =
                    await getHydrationAuthToken();

                if (!token) {
                    setError('Please login to access hydration.');
                    return;
                }

                const response = await fetch(
                    `${API_URL}/hydration/today`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(
                        message || 'Failed to load hydration data.',
                    );
                }

                const data: HydrationResponse =
                    await response.json();

                setHydration({
                    date:
                        data.date ??
                        new Date().toISOString().split('T')[0],
                    goalMl: Number(data.goalMl ?? 0),
                    totalMl: Number(data.totalMl ?? 0),
                    remainingMl: Number(
                        data.remainingMl ?? 0,
                    ),
                    progressPercent: Number(
                        data.progressPercent ?? 0,
                    ),
                    logs: Array.isArray(data.logs)
                        ? data.logs
                        : [],
                    streak: data.streak
                        ? {
                            currentStreak: Number(
                                data.streak.currentStreak ?? 0,
                            ),
                            bestStreak: Number(
                                data.streak.bestStreak ?? 0,
                            ),
                            goalMl: Number(
                                data.streak.goalMl ?? 0,
                            ),
                        }
                        : undefined,
                });

                try {
                    const reminderResponse =
                        await fetch(
                            `${API_URL}/hydration/next-reminder`,
                            {
                                method: 'GET',
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type':
                                        'application/json',
                                },
                            },
                        );

                    if (reminderResponse.ok) {
                        const reminderData =
                            await reminderResponse.json();

                        setNextReminder({
                            reminderTime:
                                reminderData.reminderTime ?? '--:--',
                            reminderMode:
                                reminderData.reminderMode ?? 'SMART',
                            countdownSeconds: Number(
                                reminderData.countdownSeconds ?? 0,
                            ),
                            minutesLeft: Number(
                                reminderData.minutesLeft ?? 0,
                            ),
                            secondsLeft: Number(
                                reminderData.secondsLeft ?? 0,
                            ),
                            isToday:
                                reminderData.isToday ?? true,
                            source:
                                reminderData.source ?? 'SMART',
                        });

                        setCountdown(
                            Number(
                                reminderData.countdownSeconds ?? 0,
                            ),
                        );
                    } else {
                        setNextReminder(null);
                        setCountdown(0);
                    }
                } catch (reminderError) {
                    console.error(
                        '[Hydration] Failed to load next reminder:',
                        reminderError,
                    );

                    setNextReminder(null);
                    setCountdown(0);
                }
            } catch (err) {
                console.error(
                    '[Hydration] Failed to load:',
                    err,
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load hydration data.',
                );
            } finally {
                setIsLoading(false);
                setRefreshing(false);
            }
        },
        [],
    );

    const loadNextReminder = useCallback(
        async () => {
            try {
                const token =
                    await getHydrationAuthToken();

                if (!token) {
                    setNextReminder(null);
                    setCountdown(0);
                    return;
                }

                const response =
                    await fetch(
                        `${API_URL}/hydration/next-reminder`,
                        {
                            method: 'GET',
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                                'Content-Type':
                                    'application/json',
                            },
                        },
                    );

                if (!response.ok) {
                    setNextReminder(null);
                    setCountdown(0);
                    return;
                }

                const data =
                    await response.json();

                /*
                 * No upcoming reminder.
                 */
                if (!data) {
                    setNextReminder(null);
                    setCountdown(0);
                    return;
                }

                const next: NextReminder = {
                    reminderTime:
                        data.reminderTime ??
                        '--:--',

                    reminderMode:
                        data.reminderMode ??
                        'SMART',

                    countdownSeconds:
                        Number(
                            data.countdownSeconds ??
                            0,
                        ),

                    minutesLeft:
                        Number(
                            data.minutesLeft ??
                            0,
                        ),

                    secondsLeft:
                        Number(
                            data.secondsLeft ??
                            0,
                        ),

                    isToday:
                        data.isToday ??
                        true,

                    source:
                        data.source ??
                        'SMART',
                };

                setNextReminder(next);

                setCountdown(
                    Math.max(
                        next.countdownSeconds,
                        0,
                    ),
                );
            } catch (error) {
                console.error(
                    '[Hydration] Failed to load next reminder:',
                    error,
                );
            }
        },
        [],
    );

    const processHydrationReminderAction =
        useCallback(
            async ({
                action,
                eventId,
                amountMl = 250,
                snoozeMinutes = 15,
            }: {
                action:
                | 'DRANK'
                | 'SNOOZE';
                eventId: string;
                amountMl?: number;
                snoozeMinutes?: number;
            }) => {
                if (!eventId) {
                    console.warn(
                        '[Hydration Action] Missing eventId.',
                    );
                    return;
                }

                if (popupActionLoading) {
                    console.warn(
                        '[Hydration Action] Action already processing.',
                    );
                    return;
                }

                const token =
                    await getHydrationAuthToken();

                if (!token) {
                    console.log(
                        '[Hydration Action] Auth not ready. Storing pending action.',
                    );

                    pendingReminderAction.current = {
                        action,
                        eventId,
                        amountMl,
                        snoozeMinutes,
                    };

                    return;
                }

                try {
                    setPopupActionLoading(true);

                    const endpoint =
                        action === 'DRANK'
                            ? `/hydration/reminder/${encodeURIComponent(
                                eventId,
                            )}/drank`
                            : `/hydration/reminder/${encodeURIComponent(
                                eventId,
                            )}/snooze`;

                    const body =
                        action === 'DRANK'
                            ? {
                                amountMl,
                            }
                            : {
                                snoozeMinutes,
                            };

                    console.log(
                        '[Hydration Action] Sending:',
                        {
                            action,
                            eventId,
                            body,
                        },
                    );

                    const response =
                        await fetch(
                            `${API_URL}${endpoint}`,
                            {
                                method: 'POST',
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                    'Content-Type':
                                        'application/json',
                                },
                                body: JSON.stringify(
                                    body,
                                ),
                            },
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => null,
                            );

                    console.log(
                        '[Hydration Action] Response:',
                        {
                            status:
                                response.status,
                            data,
                        },
                    );

                    if (!response.ok) {
                        throw new Error(
                            data?.message ||
                            (action ===
                                'DRANK'
                                ? 'Failed to log water.'
                                : 'Failed to snooze reminder.'),
                        );
                    }

                    /*
                     * Close popup if visible.
                     */
                    setHydrationPopup(null);

                    if (
                        action ===
                        'DRANK'
                    ) {
                        setSuccess(
                            `✓ ${amountMl} ML WATER LOGGED`,
                        );
                    } else {
                        setSuccess(
                            `✓ REMINDER SNOOZED FOR ${snoozeMinutes} MIN`,
                        );
                    }

                    /*
                     * Refresh dashboard and
                     * next reminder.
                     */
                    await loadHydration(
                        true,
                    );
                } catch (error) {
                    console.error(
                        '[Hydration Action] Failed:',
                        error,
                    );

                    setError(
                        error instanceof Error
                            ? error.message
                            : 'Hydration action failed.',
                    );
                } finally {
                    setPopupActionLoading(
                        false,
                    );
                }
            },
            [
                popupActionLoading,
                loadHydration,
            ],
        );

    const handleHydrationPopupAction =
        useCallback(
            async (
                action: 'DRANK' | 'SNOOZE',
            ) => {
                if (!hydrationPopup) {
                    return;
                }

                await processHydrationReminderAction(
                    {
                        action,
                        eventId:
                            hydrationPopup.eventId,
                        amountMl:
                            hydrationPopup.amountMl,
                        snoozeMinutes:
                            hydrationPopup.snoozeMinutes,
                    },
                );
            },
            [
                hydrationPopup,
                processHydrationReminderAction,
            ],
        );

    const addWater = useCallback(
        async (amountMl: number) => {
            if (!Number.isInteger(amountMl) || amountMl <= 0) {
                setError('Enter a valid water amount.');
                return;
            }

            if (amountMl > 10000) {
                setError(
                    'Maximum single water entry is 10,000 ml.',
                );
                return;
            }

            try {
                setIsAdding(true);
                setError('');
                setSuccess('');

                const token =
                    await getHydrationAuthToken();

                if (!token) {
                    setError('Please login to add water.');
                    return;
                }

                const response = await fetch(
                    `${API_URL}/hydration/log`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            amountMl,
                            source: 'QUICK_ADD',
                        }),
                    },
                );

                if (!response.ok) {
                    const message = await response.text();

                    throw new Error(
                        message || 'Failed to log water.',
                    );
                }

                setCustomAmount('');

                setSuccess(
                    `+${amountMl.toLocaleString()} ml added`,
                );

                await loadHydration();

                window.setTimeout(() => {
                    setSuccess('');
                }, 2500);
            } catch (err) {
                console.error(
                    '[Hydration] Failed to add water:',
                    err,
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to add water.',
                );
            } finally {
                setIsAdding(false);
            }
        },
        [loadHydration],
    );

    useEffect(() => {
        let cancelled = false;

        let nativeListener:
            { remove: () => Promise<void> } | null =
            null;

        let webUnsubscribe:
            (() => void) | undefined;

        const handleAuthenticatedUser =
            async () => {
                if (cancelled) {
                    return;
                }

                try {
                    /*
                     * ==========================================
                     * LOAD HYDRATION DATA
                     * ==========================================
                     */
                    await loadHydration();

                    if (cancelled) {
                        return;
                    }

                    /*
                     * ==========================================
                     * WEB / FCM PENDING ACTION
                     * ==========================================
                     *
                     * FCM notifications already contain
                     * the backend reminder eventId.
                     */
                    const pending =
                        pendingReminderAction.current;

                    if (pending) {
                        console.log(
                            '[Hydration Action] Processing pending notification action:',
                            pending,
                        );

                        pendingReminderAction.current =
                            null;

                        await processHydrationReminderAction(
                            pending,
                        );
                    }

                    /*
                     * ==========================================
                     * NATIVE ANDROID ALARM ACTION
                     * ==========================================
                     *
                     * Native Android alarms do NOT have an
                     * eventId because they are scheduled ahead
                     * of time.
                     *
                     * The native plugin stores the action after
                     * DRANK / SNOOZE and we send that information
                     * to the backend bridge endpoint.
                     */
                    if (
                        Capacitor.isNativePlatform()
                    ) {
                        const nativePending =
                            await getNativeHydrationPendingAction();

                        if (nativePending) {
                            console.log(
                                '[Native Hydration Action] Pending action:',
                                nativePending,
                            );

                            const token =
                                await getHydrationAuthToken();

                            if (!token) {
                                console.warn(
                                    '[Native Hydration Action] Auth token not ready.',
                                );
                            } else {
                                try {
                                    const response =
                                        await fetch(
                                            `${API_URL}/hydration/native-reminder-action`,
                                            {
                                                method: 'POST',
                                                headers: {
                                                    Authorization:
                                                        `Bearer ${token}`,
                                                    'Content-Type':
                                                        'application/json',
                                                },
                                                body: JSON.stringify({
                                                    action:
                                                        nativePending.action,
                                                    amountMl:
                                                        nativePending.amountMl,
                                                    alarmId:
                                                        nativePending.alarmId,
                                                    triggerAt:
                                                        nativePending.triggerAt,
                                                    snoozeMinutes:
                                                        nativePending.snoozeMinutes,
                                                }),
                                            },
                                        );

                                    const data =
                                        await response
                                            .json()
                                            .catch(
                                                () => null,
                                            );

                                    console.log(
                                        '[Native Hydration Action] Response:',
                                        {
                                            status:
                                                response.status,
                                            data,
                                        },
                                    );

                                    if (!response.ok) {
                                        throw new Error(
                                            data?.message ??
                                            'Failed to process native hydration action.',
                                        );
                                    }

                                    /*
                                     * ==========================================
                                     * SUCCESS MESSAGE
                                     * ==========================================
                                     */
                                    if (
                                        nativePending.action ===
                                        'DRANK'
                                    ) {
                                        setSuccess(
                                            `✓ ${nativePending.amountMl} ML WATER LOGGED`,
                                        );
                                    } else {
                                        setSuccess(
                                            `✓ REMINDER SNOOZED FOR ${nativePending.snoozeMinutes} MIN`,
                                        );
                                    }

                                    /*
                                     * ==========================================
                                     * REFRESH HYDRATION DATA
                                     * ==========================================
                                     */
                                    await loadHydration(
                                        true,
                                    );
                                } catch (error) {
                                    console.error(
                                        '[Native Hydration Action] Failed:',
                                        error,
                                    );

                                    setError(
                                        error instanceof Error
                                            ? error.message
                                            : 'Native hydration action failed.',
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(
                        '[Hydration Auth] Failed:',
                        error,
                    );
                }
            };

        const setupAuth =
            async () => {
                try {
                    if (
                        Capacitor.isNativePlatform()
                    ) {
                        nativeListener =
                            await FirebaseAuthentication.addListener(
                                'authStateChange',
                                async (change) => {
                                    if (
                                        cancelled
                                    ) {
                                        return;
                                    }

                                    if (
                                        change.user
                                    ) {
                                        await handleAuthenticatedUser();
                                    } else {
                                        setIsLoading(false);
                                        setHydration(null);
                                    }
                                },
                            );

                        const current =
                            await FirebaseAuthentication.getCurrentUser();

                        if (
                            current.user
                        ) {
                            await handleAuthenticatedUser();
                        } else if (!cancelled) {
                            setIsLoading(false);
                            setHydration(null);
                        }

                        return;
                    }

                    webUnsubscribe =
                        onAuthStateChanged(
                            auth,
                            async (user) => {
                                if (
                                    cancelled
                                ) {
                                    return;
                                }

                                if (!user) {
                                    setIsLoading(false);
                                    setHydration(null);
                                    return;
                                }

                                await handleAuthenticatedUser();
                            },
                        );
                } catch (error) {
                    console.error(
                        '[Hydration Auth] Initialization failed:',
                        error,
                    );

                    if (!cancelled) {
                        setIsLoading(false);
                        setHydration(null);
                    }
                }
            };

        setupAuth();

        return () => {
            cancelled = true;

            if (webUnsubscribe) {
                webUnsubscribe();
            }

            if (nativeListener) {
                nativeListener.remove();
            }
        };
    }, [
        loadHydration,
        processHydrationReminderAction,
    ]);

    useEffect(() => {
        if (!success && !error) return;

        const timeout = window.setTimeout(() => {
            if (success) setSuccess('');
            if (error) setError('');
        }, 5000);

        return () => window.clearTimeout(timeout);
    }, [success, error]);

    useEffect(() => {
        if (countdown > 0) {
            const timer =
                window.setInterval(() => {
                    setCountdown(
                        (previous) =>
                            previous > 0
                                ? previous - 1
                                : 0,
                    );
                }, 1000);

            return () =>
                window.clearInterval(
                    timer,
                );
        }

        /*
         * Countdown reached zero.
         *
         * Ask backend for the next reminder.
         */
        if (nextReminder) {
            const timer =
                window.setTimeout(() => {
                    loadNextReminder();
                }, 1000);

            return () =>
                window.clearTimeout(
                    timer,
                );
        }
    }, [
        countdown,
        nextReminder,
        loadNextReminder,
    ]);

    useEffect(() => {
        let unsubscribe:
            | (() => void)
            | undefined;

        let cancelled = false;

        const setupListener =
            async () => {
                try {
                    console.log(
                        '[Hydration FCM] Setting up foreground listener...',
                    );
                    const cleanup =
                        await listenForHydrationMessages(
                            (payload) => {
                                if (
                                    cancelled
                                ) {
                                    return;
                                }

                                const data =
                                    payload.data ??
                                    {};

                                const type =
                                    String(
                                        data.type ??
                                        '',
                                    );

                                /*
                                 * Ignore non-hydration
                                 * Firebase messages.
                                 */
                                if (
                                    type !==
                                    'hydration-reminder' &&
                                    type !==
                                    'HYDRATION_REMINDER'
                                ) {
                                    return;
                                }

                                const eventId =
                                    String(
                                        data.eventId ??
                                        '',
                                    );

                                /*
                                 * A reminder event is required
                                 * for secure DRANK/SNOOZE actions.
                                 */
                                if (
                                    !eventId
                                ) {
                                    console.warn(
                                        '[Hydration FCM] Reminder received without eventId.',
                                    );

                                    return;
                                }

                                setHydrationPopup(
                                    {
                                        eventId,

                                        title:
                                            data.title ??
                                            '💧 TIME TO HYDRATE',

                                        body:
                                            data.body ??
                                            'Your body is waiting for its next water refill.',

                                        reminderTime:
                                            String(
                                                data.reminderTime ??
                                                '--:--',
                                            ),

                                        snoozeMinutes:
                                            Number(
                                                data.snoozeMinutes ??
                                                15,
                                            ),

                                        amountMl:
                                            250,
                                    },
                                );
                            },
                        );

                    if (
                        !cancelled
                    ) {
                        unsubscribe =
                            cleanup;
                    } else {
                        cleanup();
                    }
                } catch (error) {
                    console.error(
                        '[Hydration FCM] Listener setup failed:',
                        error,
                    );
                }
            };

        setupListener();

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            !('serviceWorker' in navigator)
        ) {
            return;
        }

        const handleServiceWorkerMessage =
            async (
                event: MessageEvent,
            ) => {
                const message =
                    event.data;

                console.log(
                    '[Hydration SW] Message received:',
                    message,
                );

                if (!message) {
                    return;
                }

                /*
                 * ==========================================
                 * FCM HYDRATION PUSH
                 * ==========================================
                 *
                 * Show the in-app hydration popup.
                 */
                if (
                    message.type ===
                    'HYDRATION_PUSH_RECEIVED'
                ) {
                    const eventId =
                        String(
                            message.eventId ??
                            '',
                        );

                    if (!eventId) {
                        console.warn(
                            '[Hydration SW] Reminder received without eventId.',
                        );
                        return;
                    }

                    setHydrationPopup({
                        eventId,
                        title: String(
                            message.title ??
                            '💧 TIME TO HYDRATE',
                        ),
                        body: String(
                            message.body ??
                            'Your body is waiting for its next water refill.',
                        ),
                        reminderTime:
                            String(
                                message.reminderTime ??
                                '--:--',
                            ),
                        snoozeMinutes:
                            Number(
                                message.snoozeMinutes ??
                                15,
                            ),
                        amountMl: 250,
                    });

                    return;
                }

                /*
                 * ==========================================
                 * SYSTEM NOTIFICATION → DRANK
                 * ==========================================
                 */
                if (
                    message.type ===
                    'HYDRATION_DRANK'
                ) {
                    const eventId =
                        String(
                            message.eventId ??
                            '',
                        );

                    if (!eventId) {
                        console.warn(
                            '[Hydration SW] DRANK action missing eventId.',
                        );
                        return;
                    }

                    await processHydrationReminderAction(
                        {
                            action:
                                'DRANK',
                            eventId,
                            amountMl:
                                Number(
                                    message.amountMl ??
                                    250,
                                ),
                        },
                    );

                    return;
                }

                /*
                 * ==========================================
                 * SYSTEM NOTIFICATION → SNOOZE
                 * ==========================================
                 */
                if (
                    message.type ===
                    'HYDRATION_SNOOZE'
                ) {
                    const eventId =
                        String(
                            message.eventId ??
                            '',
                        );

                    if (!eventId) {
                        console.warn(
                            '[Hydration SW] SNOOZE action missing eventId.',
                        );
                        return;
                    }

                    await processHydrationReminderAction(
                        {
                            action:
                                'SNOOZE',
                            eventId,
                            snoozeMinutes:
                                Number(
                                    message.snoozeMinutes ??
                                    15,
                                ),
                        },
                    );

                    return;
                }
            };

        navigator.serviceWorker.addEventListener(
            'message',
            handleServiceWorkerMessage,
        );

        console.log(
            '[Hydration SW] Page message listener attached.',
        );

        return () => {
            navigator.serviceWorker.removeEventListener(
                'message',
                handleServiceWorkerMessage,
            );
        };
    }, [
        processHydrationReminderAction,
    ]);

    useEffect(() => {
        if (
            typeof window === 'undefined'
        ) {
            return;
        }

        const params =
            new URLSearchParams(
                window.location.search,
            );

        const action =
            params.get(
                'hydrationAction',
            );

        const eventId =
            params.get('eventId');

        if (
            !action ||
            !eventId
        ) {
            return;
        }

        if (
            action !== 'drank' &&
            action !== 'snooze'
        ) {
            return;
        }

        const amountMl =
            Number(
                params.get(
                    'amountMl',
                ) ?? 250,
            );

        const snoozeMinutes =
            Number(
                params.get(
                    'snoozeMinutes',
                ) ?? 15,
            );

        const pendingAction = {
            action:
                action === 'drank'
                    ? ('DRANK' as const)
                    : ('SNOOZE' as const),
            eventId,
            amountMl,
            snoozeMinutes,
        };

        console.log(
            '[Hydration Action] URL action detected:',
            pendingAction,
        );

        /*
         * Save action first.
         */
        pendingReminderAction.current =
            pendingAction;

        /*
         * Remove query parameters immediately.
         *
         * This prevents the same action from
         * executing again after refresh.
         */
        window.history.replaceState(
            {},
            document.title,
            '/hydration',
        );

        /*
         * If Firebase auth is already ready,
         * process immediately.
         *
         * Otherwise the auth listener will
         * process the pending action.
         */
        const processIfAuthenticated =
            async () => {
                const token =
                    await getHydrationAuthToken();

                if (token) {
                    const pending =
                        pendingReminderAction.current;

                    if (pending) {
                        console.log(
                            '[Hydration Action] Auth already ready. Processing URL action.',
                            pending,
                        );

                        pendingReminderAction.current =
                            null;

                        await processHydrationReminderAction(
                            pending,
                        );
                    }
                }
            };

        void processIfAuthenticated();
    }, [
        processHydrationReminderAction,
    ]);

    const progress = useMemo(() => {
        if (!hydration || hydration.goalMl <= 0) {
            return 0;
        }

        return Math.min(
            Math.max(
                hydration.progressPercent,
                0,
            ),
            100,
        );
    }, [hydration]);

    const remaining = hydration?.remainingMl ?? 0;
    const total = hydration?.totalMl ?? 0;
    const goal = hydration?.goalMl ?? 0;

    const averagePerLog = useMemo(() => {
        if (!hydration?.logs.length) return 0;

        return Math.round(
            hydration.totalMl /
            hydration.logs.length,
        );
    }, [hydration]);

    const formattedCountdown = useMemo(() => {
        const hours = Math.floor(
            countdown / 3600,
        );

        const minutes = Math.floor(
            (countdown % 3600) / 60,
        );

        const seconds = countdown % 60;

        return `${hours
            .toString()
            .padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}:${seconds
                    .toString()
                    .padStart(2, '0')}`;
    }, [countdown]);

    return (
        <>
            <AnimatePresence>
                {hydrationPopup && (
                    <motion.div
                        initial={{
                            opacity: 0,
                        }}
                        animate={{
                            opacity: 1,
                        }}
                        exit={{
                            opacity: 0,
                        }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: 30,
                                scale: 0.95,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                            }}
                            exit={{
                                opacity: 0,
                                y: 20,
                                scale: 0.95,
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 22,
                            }}
                            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/30 bg-[#071018] shadow-[0_0_80px_rgba(34,211,238,0.18)]"
                        >
                            {/* Glow */}
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

                                <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                            </div>

                            {/* Close */}
                            <button
                                type="button"
                                onClick={() =>
                                    setHydrationPopup(
                                        null,
                                    )
                                }
                                disabled={
                                    popupActionLoading
                                }
                                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="relative p-7">
                                {/* Icon */}
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.15)]">
                                    <Droplets className="h-10 w-10 text-cyan-300" />
                                </div>

                                {/* Header */}
                                <div className="mt-6 text-center">
                                    <div className="text-[10px] font-black tracking-[0.3em] text-cyan-400">
                                        HYDRATION QUEST
                                    </div>

                                    <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                                        {hydrationPopup.title}
                                    </h2>

                                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                                        {hydrationPopup.body}
                                    </p>
                                </div>

                                {/* Reminder info */}
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
                                        <div className="text-[9px] font-bold tracking-[0.2em] text-slate-600">
                                            REMINDER
                                        </div>

                                        <div className="mt-1 text-xl font-black text-white">
                                            {
                                                hydrationPopup.reminderTime
                                            }
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-center">
                                        <div className="text-[9px] font-bold tracking-[0.2em] text-slate-600">
                                            WATER
                                        </div>

                                        <div className="mt-1 text-xl font-black text-cyan-300">
                                            {
                                                hydrationPopup.amountMl
                                            }{' '}
                                            ML
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-6 space-y-3">
                                    <button
                                        type="button"
                                        disabled={
                                            popupActionLoading
                                        }
                                        onClick={() =>
                                            handleHydrationPopupAction(
                                                'DRANK',
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 px-5 py-4 text-sm font-black tracking-widest text-cyan-200 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Check className="h-5 w-5" />

                                        {popupActionLoading
                                            ? 'PROCESSING...'
                                            : `DRANK ${hydrationPopup.amountMl} ML`}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            popupActionLoading
                                        }
                                        onClick={() =>
                                            handleHydrationPopupAction(
                                                'SNOOZE',
                                            )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold tracking-widest text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Clock3 className="h-4 w-4" />

                                        SNOOZE{' '}
                                        {
                                            hydrationPopup.snoozeMinutes
                                        }{' '}
                                        MIN
                                    </button>
                                </div>

                                <div className="mt-5 text-center text-[9px] font-bold tracking-[0.2em] text-slate-600">
                                    LIFE RPG • STAY HYDRATED
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AppShell
                gold={0}
                streak={
                    hydration?.streak?.currentStreak ?? 0
                }
            >
                <main className="min-h-screen bg-[#05070d] text-white">
                    {/* Ambient background */}
                    <div className="pointer-events-none fixed inset-0 overflow-hidden">
                        <div className="absolute left-[10%] top-[5%] h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
                        <div className="absolute right-[5%] top-[30%] h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />
                        <div className="absolute bottom-[5%] left-[30%] h-72 w-72 rounded-full bg-violet-600/10 blur-[130px]" />
                    </div>

                    <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-cyan-400">
                                    <Droplets className="h-4 w-4" />
                                    HYDRATION SYSTEM
                                </div>

                                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                                    Hydration Core
                                </h1>

                                <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                                    <CalendarDays className="h-4 w-4" />
                                    {formatDate(hydration?.date)}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => loadHydration(true)}
                                    disabled={refreshing}
                                    className="group flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300 disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${refreshing
                                            ? 'animate-spin'
                                            : 'group-hover:rotate-180'
                                            } transition-transform`}
                                    />
                                    Refresh
                                </button>

                                <Link
                                    href="/hydration/settings"
                                    className="flex h-11 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                </Link>
                            </div>
                        </div>

                        {/* Alerts */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                            >
                                {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-300"
                            >
                                <Check className="h-4 w-4" />
                                {success}
                            </motion.div>
                        )}

                        {isLoading ? (
                            <LoadingDashboard />
                        ) : !hydration ? (
                            <EmptyState />
                        ) : (
                            <>
                                {/* Next Reminder */}
                                <motion.section
                                    initial={{
                                        opacity: 0,
                                        y: 15,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    transition={{
                                        delay: 0.1,
                                    }}
                                    className="mb-6 overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.02] to-emerald-400/[0.05] p-6 shadow-2xl shadow-cyan-950/10 sm:p-7"
                                >
                                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                        {/* Left */}
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                                                <Clock3 className="h-6 w-6 text-cyan-400" />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold tracking-[0.2em] text-cyan-400">
                                                        NEXT REMINDER
                                                    </span>

                                                    {nextReminder && (
                                                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black tracking-widest text-cyan-300">
                                                            {nextReminder.source}
                                                        </span>
                                                    )}
                                                </div>

                                                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                                                    {nextReminder?.reminderTime ??
                                                        '--:--'}
                                                </h2>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {nextReminder
                                                        ? nextReminder.isToday
                                                            ? 'Your next hydration reminder'
                                                            : 'Next reminder tomorrow'
                                                        : 'No upcoming reminder available'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Countdown */}
                                        <div className="min-w-[220px] rounded-2xl border border-white/5 bg-black/20 p-5">
                                            <div className="text-[10px] font-bold tracking-[0.2em] text-slate-600">
                                                COUNTDOWN
                                            </div>

                                            <div className="mt-1 text-3xl font-black tracking-wider text-cyan-300">
                                                {nextReminder
                                                    ? countdown > 0
                                                        ? formattedCountdown
                                                        : 'UPDATING...'
                                                    : '--:--:--'}
                                            </div>

                                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                                                Prepare for your next
                                                hydration break
                                            </div>
                                        </div>
                                    </div>

                                    {/* Countdown progress */}
                                    {nextReminder &&
                                        nextReminder.countdownSeconds > 0 && (
                                            <div className="mt-6">
                                                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                                    <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                                        initial={{
                                                            width: '0%',
                                                        }}
                                                        animate={{
                                                            width: '100%',
                                                        }}
                                                        transition={{
                                                            duration:
                                                                nextReminder.countdownSeconds,
                                                            ease: 'linear',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                </motion.section>

                                {/* Main hydration card */}
                                <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.025] to-blue-500/[0.04] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8"
                                    >
                                        {/* Grid */}
                                        <div
                                            className="pointer-events-none absolute inset-0 opacity-[0.035]"
                                            style={{
                                                backgroundImage:
                                                    'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                                                backgroundSize: '35px 35px',
                                            }}
                                        />

                                        <div className="relative">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-cyan-400">
                                                        <Waves className="h-4 w-4" />
                                                        DAILY HYDRATION
                                                    </div>

                                                    <p className="mt-3 text-sm text-slate-400">
                                                        Your hydration progress for today
                                                    </p>
                                                </div>

                                                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold tracking-widest text-cyan-300">
                                                    ACTIVE
                                                </div>
                                            </div>

                                            <div className="mt-8 flex flex-col items-center justify-center gap-8 md:flex-row md:justify-start">
                                                {/* Progress ring */}
                                                <div className="relative h-56 w-56 shrink-0">
                                                    <div
                                                        className="absolute inset-0 rounded-full"
                                                        style={{
                                                            background: `conic-gradient(#22d3ee ${progress * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                                                        }}
                                                    />

                                                    <div className="absolute inset-[8px] rounded-full bg-[#080c15]" />

                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <Droplets className="mb-2 h-7 w-7 text-cyan-400" />

                                                        <div className="text-4xl font-black tracking-tight">
                                                            {progress}%
                                                        </div>

                                                        <div className="mt-1 text-xs font-semibold tracking-widest text-slate-500">
                                                            COMPLETE
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Numbers */}
                                                <div className="flex-1 text-center md:text-left">
                                                    <div className="text-5xl font-black tracking-tight">
                                                        {formatLitres(total)}
                                                    </div>

                                                    <div className="mt-2 text-sm text-slate-500">
                                                        of {formatLitres(goal)} daily goal
                                                    </div>

                                                    <div className="mt-6">
                                                        <div className="mb-2 flex items-center justify-between text-xs">
                                                            <span className="font-semibold text-slate-400">
                                                                PROGRESS
                                                            </span>

                                                            <span className="font-bold text-cyan-400">
                                                                {formatMl(total)} /{' '}
                                                                {formatMl(goal)}
                                                            </span>
                                                        </div>

                                                        <div className="h-3 overflow-hidden rounded-full bg-white/5">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{
                                                                    width: `${progress}%`,
                                                                }}
                                                                transition={{
                                                                    duration: 0.8,
                                                                    ease: 'easeOut',
                                                                }}
                                                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 flex items-center gap-2 text-sm">
                                                        <Target className="h-4 w-4 text-cyan-400" />

                                                        <span className="text-slate-400">
                                                            {remaining > 0
                                                                ? `${formatLitres(
                                                                    remaining,
                                                                )} remaining`
                                                                : 'Daily target completed'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-xs font-bold tracking-wide text-cyan-300">
                                                        <Sparkles className="h-3.5 w-3.5" />
                                                        {getProgressMessage(progress)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                                        <StatCard
                                            icon={<Target className="h-5 w-5" />}
                                            label="DAILY TARGET"
                                            value={formatLitres(goal)}
                                            description="Your configured goal"
                                        />

                                        <StatCard
                                            icon={<Activity className="h-5 w-5" />}
                                            label="WATER LOGS"
                                            value={hydration.logs.length.toString()}
                                            description="Entries today"
                                        />

                                        <StatCard
                                            icon={<Zap className="h-5 w-5" />}
                                            label="AVG. PER LOG"
                                            value={
                                                averagePerLog
                                                    ? formatMl(averagePerLog)
                                                    : '--'
                                            }
                                            description="Today's average"
                                        />

                                        <StatCard
                                            icon={<span className="text-lg">🔥</span>}
                                            label="HYDRATION STREAK"
                                            value={`${hydration.streak?.currentStreak ?? 0} DAYS`}
                                            description={`Best: ${hydration.streak?.bestStreak ?? 0
                                                } days`}
                                        />
                                    </div>
                                </section>

                                {/* Quick add */}
                                <section className="mt-6">
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
                                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-cyan-400">
                                                    <Plus className="h-4 w-4" />
                                                    QUICK LOG
                                                </div>

                                                <h2 className="mt-2 text-xl font-bold">
                                                    Add water
                                                </h2>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Select how much water you just drank.
                                                </p>
                                            </div>

                                            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                                                <Droplets className="h-4 w-4 text-cyan-400" />
                                                Every drop counts.
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {QUICK_AMOUNTS.map((amount) => (
                                                <button
                                                    key={amount}
                                                    type="button"
                                                    onClick={() => addWater(amount)}
                                                    disabled={isAdding}
                                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/5 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <div className="absolute right-3 top-3 opacity-20 transition group-hover:opacity-50">
                                                        <Droplets className="h-5 w-5 text-cyan-400" />
                                                    </div>

                                                    <div className="text-2xl font-black">
                                                        +{amount}
                                                    </div>

                                                    <div className="mt-1 text-xs font-semibold tracking-widest text-slate-500">
                                                        ML
                                                    </div>

                                                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400 opacity-70 transition group-hover:opacity-100">
                                                        ADD
                                                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Custom */}
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10000"
                                                    value={customAmount}
                                                    onChange={(event) =>
                                                        setCustomAmount(
                                                            event.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key === 'Enter' &&
                                                            customAmount
                                                        ) {
                                                            addWater(
                                                                Number(customAmount),
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Custom amount in ml"
                                                    className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 pr-14 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
                                                />

                                                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                                                    ML
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    isAdding ||
                                                    !customAmount ||
                                                    Number(customAmount) <= 0
                                                }
                                                onClick={() =>
                                                    addWater(Number(customAmount))
                                                }
                                                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Plus className="h-4 w-4" />
                                                ADD WATER
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Today's log */}
                                <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
                                        <div className="mb-6 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-cyan-400">
                                                    <Clock3 className="h-4 w-4" />
                                                    ACTIVITY
                                                </div>

                                                <Link
                                                    href="/hydration/history"
                                                    className="flex items-center gap-1 text-xs font-bold tracking-wide text-cyan-400 transition hover:text-cyan-300"
                                                >
                                                    View Full History
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            </div>

                                            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400">
                                                {hydration.logs.length}{' '}
                                                {hydration.logs.length === 1
                                                    ? 'ENTRY'
                                                    : 'ENTRIES'}
                                            </div>
                                        </div>

                                        {hydration.logs.length === 0 ? (
                                            <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-center">
                                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10">
                                                    <Droplets className="h-7 w-7 text-cyan-400" />
                                                </div>

                                                <p className="font-semibold text-slate-300">
                                                    No water logged yet
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    Start your hydration journey.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {hydration.logs.map(
                                                    (log, index) => (
                                                        <motion.div
                                                            key={log.id}
                                                            initial={{
                                                                opacity: 0,
                                                                x: -10,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                x: 0,
                                                            }}
                                                            transition={{
                                                                delay: index * 0.04,
                                                            }}
                                                            className="group flex items-center justify-between rounded-2xl border border-white/5 bg-black/15 px-4 py-4 transition hover:border-cyan-400/15 hover:bg-cyan-400/[0.025]"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/5">
                                                                    <Droplets className="h-5 w-5 text-cyan-400" />
                                                                </div>

                                                                <div>
                                                                    <div className="font-bold text-slate-200">
                                                                        +{formatMl(
                                                                            Number(
                                                                                log.amount_ml,
                                                                            ),
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-1 text-xs text-slate-600">
                                                                        {getSourceLabel(
                                                                            log.source,
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-sm font-semibold text-slate-400">
                                                                    {formatTime(
                                                                        log.logged_at,
                                                                    )}
                                                                </div>

                                                                <div className="mt-1 text-[10px] font-bold tracking-widest text-slate-700">
                                                                    LOGGED
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Today's mission */}
                                    <div className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-6 sm:p-8">
                                        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

                                        <div className="relative">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10">
                                                <Sparkles className="h-5 w-5 text-violet-300" />
                                            </div>

                                            <div className="mt-6 text-xs font-bold tracking-[0.2em] text-violet-300">
                                                DAILY MISSION
                                            </div>

                                            <h2 className="mt-2 text-xl font-black">
                                                Stay Hydrated
                                            </h2>

                                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                                Reach your configured daily
                                                hydration target and keep your
                                                character ready for the next
                                                adventure.
                                            </p>

                                            <div className="mt-7">
                                                <div className="mb-2 flex items-center justify-between text-xs">
                                                    <span className="text-slate-500">
                                                        MISSION PROGRESS
                                                    </span>

                                                    <span className="font-bold text-violet-300">
                                                        {progress}%
                                                    </span>
                                                </div>

                                                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{
                                                            width: `${progress}%`,
                                                        }}
                                                        className="h-full rounded-full bg-violet-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-7 flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                <Trophy className="h-4 w-4 text-violet-300" />
                                                RPG rewards will connect here
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Bottom navigation */}
                                <section className="mt-6">
                                    <Link
                                        href="/hydration/settings"
                                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                                                <Settings className="h-5 w-5 text-cyan-400" />
                                            </div>

                                            <div>
                                                <div className="font-semibold text-slate-200">
                                                    Hydration Settings
                                                </div>

                                                <div className="mt-1 text-xs text-slate-600">
                                                    Goal, reminders, active hours and
                                                    notifications
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-400" />
                                    </Link>
                                </section>
                            </>
                        )}
                    </div>
                </main>
            </AppShell>
        </>
    );
}

function StatCard({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-cyan-400/15 hover:bg-white/[0.04]"
        >
            <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
                    {icon}
                </div>

                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
            </div>

            <div className="mt-5 text-[10px] font-bold tracking-[0.18em] text-slate-600">
                {label}
            </div>

            <div className="mt-1 text-2xl font-black text-slate-100">
                {value}
            </div>

            <div className="mt-1 text-xs text-slate-600">
                {description}
            </div>
        </motion.div>
    );
}

function LoadingDashboard() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div className="h-[430px] rounded-3xl border border-white/10 bg-white/[0.025]" />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                    <div className="rounded-3xl bg-white/[0.025]" />
                    <div className="rounded-3xl bg-white/[0.025]" />
                    <div className="rounded-3xl bg-white/[0.025]" />
                    <div className="rounded-3xl bg-white/[0.025]" />
                </div>
            </div>

            <div className="h-72 rounded-3xl bg-white/[0.025]" />
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.025]">
            <div className="max-w-md px-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-400/10">
                    <Droplets className="h-10 w-10 text-cyan-400" />
                </div>

                <h2 className="mt-6 text-2xl font-black">
                    Hydration System Not Configured
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    Configure your daily water goal and reminder
                    system before starting your hydration journey.
                </p>

                <Link
                    href="/hydration/settings"
                    className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-black text-black transition hover:bg-cyan-300"
                >
                    <Settings className="h-4 w-4" />
                    Configure Hydration
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}