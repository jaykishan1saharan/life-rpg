'use client';

import { useEffect, useState } from 'react';
import { getIdToken } from 'firebase/auth';

import { auth } from '../../../src/lib/firebase';
import { getHydrationFcmToken } from '../../../src/lib/firebase-messaging';

type NotificationState =
    | 'checking'
    | 'ready'
    | 'disabled'
    | 'unsupported';

const DISABLED_STORAGE_KEY =
    'life-rpg-hydration-notifications-disabled';

export default function HydrationNotificationsPage() {
    const [permission, setPermission] =
        useState<NotificationPermission>('default');

    const [serviceWorkerStatus, setServiceWorkerStatus] =
        useState<NotificationState>('checking');

    const [message, setMessage] =
        useState('');

    const [isEnabled, setIsEnabled] =
        useState(false);

    const [isLoading, setIsLoading] =
        useState(false);

    /*
     * Temporary Phase 1C test event ID.
     *
     * Enter an event ID whose status is SENT in
     * hydration_reminder_events before testing
     * the DRANK WATER action.
     */
    const [testEventId, setTestEventId] =
        useState('');

    /*
     * ========================================================
     * INITIALIZE
     * ========================================================
     */

    useEffect(() => {
        initializeNotifications();
    }, []);

    /*
     * ========================================================
     * PHASE 1C — SERVICE WORKER ACTION HANDLER
     * ========================================================
     *
     * The service worker sends HYDRATION_DRANK here when the
     * user clicks DRANK WATER while this page is open.
     *
     * The browser page has Firebase authentication, so the
     * authenticated backend request is made from here.
     */
    useEffect(() => {
        if (
            typeof navigator === 'undefined' ||
            !('serviceWorker' in navigator)
        ) {
            return;
        }

        const handleServiceWorkerMessage = async (
            event: MessageEvent,
        ) => {
            const data = event.data;

            if (
                !data ||
                data.type !== 'HYDRATION_DRANK'
            ) {
                return;
            }

            const eventId =
                String(data.eventId || '').trim();

            const amountMl =
                Number(data.amountMl ?? 250);

            if (!eventId) {
                console.error(
                    '[Hydration Notifications] DRANK action missing eventId.',
                );

                setMessage(
                    'DRANK WATER action failed: reminder event ID is missing.',
                );

                return;
            }

            if (
                !Number.isInteger(amountMl) ||
                amountMl <= 0
            ) {
                setMessage(
                    'DRANK WATER action failed: invalid water amount.',
                );

                return;
            }

            setMessage(
                'Logging your water intake...',
            );

            try {
                const currentUser =
                    auth.currentUser;

                if (!currentUser) {
                    throw new Error(
                        'You must be logged in to log hydration.',
                    );
                }

                const idToken =
                    await getIdToken(
                        currentUser,
                    );

                const apiUrl =
                    process.env
                        .NEXT_PUBLIC_API_URL;

                if (!apiUrl) {
                    throw new Error(
                        'NEXT_PUBLIC_API_URL is not configured.',
                    );
                }

                const response =
                    await fetch(
                        `${apiUrl}/hydration/reminder/${encodeURIComponent(eventId)}/drank`,
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

                const responseData =
                    await response
                        .json()
                        .catch(
                            () => null,
                        );

                if (!response.ok) {
                    throw new Error(
                        responseData?.message ||
                            'Failed to log water from reminder.',
                    );
                }

                console.log(
                    '[Hydration Notifications] DRANK WATER processed:',
                    responseData,
                );

                setMessage(
                    `✓ DRANK WATER recorded successfully — ${amountMl} ml added.`,
                );

                /*
                 * Give the user the normal hydration page after
                 * the action succeeds so the updated hydration
                 * state can be viewed there.
                 */
                window.location.href =
                    '/hydration';
            } catch (error) {
                console.error(
                    '[Hydration Notifications] DRANK action error:',
                    error,
                );

                setMessage(
                    error instanceof Error
                        ? error.message
                        : 'Failed to log water from reminder.',
                );
            }
        };

        navigator.serviceWorker.addEventListener(
            'message',
            handleServiceWorkerMessage,
        );

        return () => {
            navigator.serviceWorker.removeEventListener(
                'message',
                handleServiceWorkerMessage,
            );
        };
    }, []);

    async function initializeNotifications() {
        try {
            if (
                typeof window === 'undefined' ||
                !('Notification' in window) ||
                !('serviceWorker' in navigator)
            ) {
                setServiceWorkerStatus('unsupported');
                return;
            }

            setPermission(
                Notification.permission,
            );

            const locallyDisabled =
                localStorage.getItem(
                    DISABLED_STORAGE_KEY,
                ) === 'true';

            /*
             * If user disabled Life RPG notifications,
             * don't automatically register the service worker.
             */

            if (locallyDisabled) {
                setIsEnabled(false);
                setServiceWorkerStatus('disabled');
                return;
            }

            const registration =
                await navigator.serviceWorker.getRegistration(
                    '/hydration-sw.js',
                );

            if (registration) {
                await registration.update();

                if (registration.active) {
                    setIsEnabled(false);
                    setServiceWorkerStatus('ready');
                } else {
                    setIsEnabled(false);
                    setServiceWorkerStatus('checking');
                }
            } else {
                setIsEnabled(false);
                setServiceWorkerStatus('disabled');
            }
        } catch (error) {
            console.error(
                '[Hydration Notifications] Initialization error:',
                error,
            );

            setIsEnabled(false);
            setServiceWorkerStatus('disabled');
        }
    }

    /*
     * ========================================================
     * ENABLE NOTIFICATIONS
     * ========================================================
     */

    async function enableNotifications() {
        setIsLoading(true);
        setMessage('');

        try {
            if (
                !('Notification' in window)
            ) {
                throw new Error(
                    'This browser does not support notifications.',
                );
            }

            if (
                !('serviceWorker' in navigator)
            ) {
                throw new Error(
                    'This browser does not support service workers.',
                );
            }

            /*
             * ------------------------------------------------
             * STEP 1 — Browser permission
             * ------------------------------------------------
             */

            let currentPermission =
                Notification.permission;

            if (
                currentPermission !==
                'granted'
            ) {
                currentPermission =
                    await Notification.requestPermission();

                setPermission(
                    currentPermission,
                );
            }

            if (
                currentPermission !==
                'granted'
            ) {
                setMessage(
                    'Notification permission was not granted.',
                );

                return;
            }

            /*
             * ------------------------------------------------
             * STEP 2 — Remove local disabled flag
             * ------------------------------------------------
             */

            localStorage.removeItem(
                DISABLED_STORAGE_KEY,
            );

            /*
             * ------------------------------------------------
             * STEP 3 — Register hydration service worker
             * ------------------------------------------------
             */

            const registration =
                await navigator.serviceWorker.register(
                    '/hydration-sw.js',
                    {
                        scope: '/',
                    },
                );

            await navigator.serviceWorker.ready;

            await registration.update();

            /*
             * ------------------------------------------------
             * STEP 4 — Get logged-in Firebase user
             * ------------------------------------------------
             */

            const currentUser =
                auth.currentUser;

            if (!currentUser) {
                throw new Error(
                    'You must be logged in to enable hydration notifications.',
                );
            }

            /*
             * ------------------------------------------------
             * STEP 5 — Generate FCM token
             * ------------------------------------------------
             */

            const fcmToken =
                await getHydrationFcmToken();

            if (!fcmToken) {
                throw new Error(
                    'FCM registration token was not generated.',
                );
            }

            /*
             * ------------------------------------------------
             * STEP 6 — Get Firebase ID token
             * ------------------------------------------------
             */

            const idToken =
                await getIdToken(
                    currentUser,
                );

            /*
             * ------------------------------------------------
             * STEP 7 — Register FCM device with backend
             * ------------------------------------------------
             */

            const apiUrl =
                process.env
                    .NEXT_PUBLIC_API_URL;

            if (!apiUrl) {
                throw new Error(
                    'NEXT_PUBLIC_API_URL is not configured.',
                );
            }

            const response =
                await fetch(
                    `${apiUrl}/hydration/push/register`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json',

                            Authorization:
                                `Bearer ${idToken}`,
                        },

                        body: JSON.stringify({
                            fcmToken,
                        }),
                    },
                );

            if (!response.ok) {
                let errorMessage =
                    'Failed to register FCM device.';

                try {
                    const errorData =
                        await response.json();

                    if (
                        errorData?.message
                    ) {
                        errorMessage =
                            Array.isArray(
                                errorData.message,
                            )
                                ? errorData.message.join(
                                    ', ',
                                )
                                : errorData.message;
                    }
                } catch {
                    // Ignore invalid JSON response.
                }

                throw new Error(
                    errorMessage,
                );
            }

            /*
             * ------------------------------------------------
             * SUCCESS
             * ------------------------------------------------
             */

            setIsEnabled(true);
            setServiceWorkerStatus('ready');

            setMessage(
                'Notifications enabled and this browser is registered for hydration push notifications.',
            );
        } catch (error) {
            console.error(
                '[Hydration Notifications] Enable error:',
                error,
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to enable notifications.',
            );
        } finally {
            setIsLoading(false);
        }
    }

    /*
     * ========================================================
     * DISABLE NOTIFICATIONS
     * ========================================================
     */

    async function disableNotifications() {
        setIsLoading(true);
        setMessage('');

        try {
            /*
             * Mark Life RPG notifications as disabled
             * locally first.
             */

            localStorage.setItem(
                DISABLED_STORAGE_KEY,
                'true',
            );

            /*
             * Get current service worker BEFORE
             * unregistering it.
             */

            const registration =
                await navigator.serviceWorker.getRegistration(
                    '/hydration-sw.js',
                );

            /*
             * ------------------------------------------------
             * Deactivate FCM token on backend
             * ------------------------------------------------
             */

            const currentUser =
                auth.currentUser;

            if (
                currentUser &&
                registration &&
                Notification.permission ===
                'granted'
            ) {
                try {
                    const fcmToken =
                        await getHydrationFcmToken();

                    const idToken =
                        await getIdToken(
                            currentUser,
                        );

                    const apiUrl =
                        process.env
                            .NEXT_PUBLIC_API_URL;

                    if (apiUrl) {
                        await fetch(
                            `${apiUrl}/hydration/push/register`,
                            {
                                method: 'DELETE',

                                headers: {
                                    'Content-Type':
                                        'application/json',

                                    Authorization:
                                        `Bearer ${idToken}`,
                                },

                                body: JSON.stringify({
                                    fcmToken,
                                }),
                            },
                        );
                    }
                } catch (error) {
                    /*
                     * Don't block the local disable flow
                     * if token deactivation fails.
                     */

                    console.warn(
                        '[Hydration Notifications] Could not deactivate FCM token:',
                        error,
                    );
                }
            }

            /*
             * ------------------------------------------------
             * Close visible hydration notifications
             * ------------------------------------------------
             */

            if (registration) {
                const notifications =
                    await registration.getNotifications();

                notifications.forEach(
                    (notification) => {
                        notification.close();
                    },
                );

                /*
                 * ------------------------------------------------
                 * Unregister service worker
                 * ------------------------------------------------
                 */

                await registration.unregister();
            }

            setIsEnabled(false);
            setServiceWorkerStatus('disabled');

            setMessage(
                'Hydration notifications disabled successfully.',
            );
        } catch (error) {
            console.error(
                '[Hydration Notifications] Disable error:',
                error,
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Failed to disable notifications.',
            );
        } finally {
            setIsLoading(false);
        }
    }

    /*
     * ========================================================
     * TEST NOTIFICATION
     * ========================================================
     */

    async function sendTestNotification() {
        setMessage('');

        try {
            if (
                !('Notification' in window)
            ) {
                setMessage(
                    'Notifications are not supported by this browser.',
                );

                return;
            }

            if (
                Notification.permission !==
                'granted'
            ) {
                setMessage(
                    'Please enable notifications first.',
                );

                return;
            }

            if (!isEnabled) {
                setMessage(
                    'Hydration notifications are currently disabled.',
                );

                return;
            }

            /*
             * Get the existing hydration service worker.
             */

            const registration =
                await navigator.serviceWorker.getRegistration(
                    '/hydration-sw.js',
                );

            if (!registration) {
                setMessage(
                    'Hydration service worker is not active.',
                );

                return;
            }

            /*
             * Unique tag prevents Chrome from treating
             * repeated test notifications as the same
             * notification.
             */

            const eventId =
                testEventId.trim();

            if (!eventId) {
                setMessage(
                    'Enter a SENT reminder event ID first. You can get it from hydration_reminder_events.',
                );

                return;
            }

            const uniqueTag =
                `hydration-test-${Date.now()}`;

            /*
             * TypeScript DOM typings may not expose
             * the actions property.
             *
             * IMPORTANT:
             * This test uses a REAL reminder event ID so
             * DRANK WATER can exercise the authenticated
             * Phase 1C backend endpoint.
             */

            const notificationOptions =
                {
                    body:
                        'Phase 1C test — click DRANK WATER to log 250 ml.',

                    tag: uniqueTag,

                    requireInteraction: true,

                    data: {
                        type:
                            'hydration-reminder',

                        url:
                            '/hydration',

                        eventId,

                        reminderKey:
                            'phase1c-test',

                        reminderTime:
                            'test',

                        reminderSource:
                            'TEST',
                    },

                    actions: [
                        {
                            action:
                                'drink',

                            title:
                                'DRANK WATER',
                        },
                        {
                            action:
                                'snooze',

                            title:
                                'SNOOZE',
                        },
                    ],
                } as NotificationOptions & {
                    actions: Array<{
                        action: string;
                        title: string;
                    }>;
                };

            await registration.showNotification(
                '💧 TIME TO HYDRATE',
                notificationOptions,
            );

            setMessage(
                'Phase 1C test notification sent. Click DRANK WATER in the notification.',
            );
        } catch (error) {
            console.error(
                '[Hydration Notifications] Test error:',
                error,
            );

            setMessage(
                'Failed to show notification.',
            );
        }
    }

    /*
     * ========================================================
     * PERMISSION LABEL
     * ========================================================
     */

    function getPermissionLabel() {
        if (
            permission === 'granted'
        ) {
            return 'GRANTED';
        }

        if (
            permission === 'denied'
        ) {
            return 'DENIED';
        }

        return 'NOT SET';
    }

    /*
     * ========================================================
     * SERVICE WORKER LABEL
     * ========================================================
     */

    function getServiceWorkerLabel() {
        if (
            serviceWorkerStatus ===
            'ready'
        ) {
            return 'READY';
        }

        if (
            serviceWorkerStatus ===
            'disabled'
        ) {
            return 'DISABLED';
        }

        if (
            serviceWorkerStatus ===
            'unsupported'
        ) {
            return 'NOT SUPPORTED';
        }

        return 'CHECKING';
    }

    /*
     * ========================================================
     * UI
     * ========================================================
     */

    return (
        <main className="min-h-screen bg-[#05070b] px-5 py-10 text-white">
            <div className="mx-auto max-w-2xl">

                {/* HEADER */}

                <div className="mb-8">
                    <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-400">
                        LIFE RPG / NOTIFICATION SYSTEM
                    </div>

                    <h1 className="mt-2 text-3xl font-black tracking-tight">
                        Hydration Notifications
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/40">
                        Manage and test the browser notification
                        infrastructure for the Life RPG hydration
                        reminder system.
                    </p>
                </div>

                {/* STATUS */}

                <div className="grid gap-4 sm:grid-cols-2">

                    {/* Permission */}

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                        <div className="text-[9px] font-bold tracking-[0.2em] text-white/30">
                            NOTIFICATION PERMISSION
                        </div>

                        <div
                            className={`
                                mt-3 text-xl font-black
                                ${permission ===
                                    'granted'
                                    ? 'text-emerald-300'
                                    : permission ===
                                        'denied'
                                        ? 'text-red-300'
                                        : 'text-amber-300'
                                }
                            `}
                        >
                            {getPermissionLabel()}
                        </div>
                    </div>

                    {/* Service Worker */}

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                        <div className="text-[9px] font-bold tracking-[0.2em] text-white/30">
                            SERVICE WORKER
                        </div>

                        <div
                            className={`
                                mt-3 text-xl font-black
                                ${serviceWorkerStatus ===
                                    'ready'
                                    ? 'text-emerald-300'
                                    : serviceWorkerStatus ===
                                        'disabled'
                                        ? 'text-red-300'
                                        : 'text-amber-300'
                                }
                            `}
                        >
                            {getServiceWorkerLabel()}
                        </div>
                    </div>
                </div>

                {/* NOTIFICATION CONTROL */}

                <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-6">

                    <div className="flex gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
                            🔔
                        </div>

                        <div>
                            <h2 className="text-sm font-black text-white">
                                NOTIFICATION CONTROL
                            </h2>

                            <p className="mt-2 text-xs leading-6 text-white/40">
                                Control Life RPG hydration
                                notifications and browser push
                                registration.
                            </p>
                        </div>

                    </div>

                    {isEnabled ? (
                        <div className="mt-6 space-y-3">

                            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                                <div className="text-xs font-black tracking-[0.15em] text-emerald-300">
                                    ✓ NOTIFICATIONS ENABLED
                                </div>

                                <p className="mt-2 text-xs leading-5 text-white/35">
                                    This browser is registered for
                                    Life RPG hydration push
                                    notifications.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    disableNotifications
                                }
                                disabled={
                                    isLoading
                                }
                                className="w-full rounded-xl border border-red-400/25 bg-red-400/[0.06] px-5 py-4 text-xs font-black tracking-[0.15em] text-red-300 transition hover:border-red-400/40 hover:bg-red-400/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isLoading
                                    ? 'DISABLING...'
                                    : 'DISABLE NOTIFICATIONS'}
                            </button>

                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">

                            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.05] p-4">
                                <div className="text-xs font-black tracking-[0.15em] text-red-300">
                                    NOTIFICATIONS DISABLED
                                </div>

                                <p className="mt-2 text-xs leading-5 text-white/35">
                                    Life RPG hydration push
                                    notifications are currently
                                    turned off.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    enableNotifications
                                }
                                disabled={
                                    isLoading
                                }
                                className="w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-4 text-xs font-black tracking-[0.15em] text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {isLoading
                                    ? 'ENABLING...'
                                    : 'ENABLE NOTIFICATIONS'}
                            </button>

                        </div>
                    )}
                </div>

                {/* TEST */}

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-6">

                    <div className="flex gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-xl">
                            🧪
                        </div>

                        <div>
                            <h2 className="text-sm font-black text-white">
                                STEP 02 — SEND TEST
                            </h2>

                            <p className="mt-2 text-xs leading-6 text-white/40">
                                Send a real persistent browser
                                notification through the Life RPG
                                service worker.
                            </p>
                        </div>

                    </div>

                    <div className="mt-6">
                        <label className="mb-2 block text-[9px] font-bold tracking-[0.2em] text-white/30">
                            SENT REMINDER EVENT ID
                        </label>

                        <input
                            type="text"
                            value={
                                testEventId
                            }
                            onChange={(
                                event,
                            ) =>
                                setTestEventId(
                                    event.target.value,
                                )
                            }
                            placeholder="Paste hydration_reminder_events.id"
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs font-mono text-white outline-none transition placeholder:text-white/20 focus:border-purple-400/50"
                        />

                        <p className="mt-2 text-[10px] leading-5 text-white/25">
                            Use an event with
                            status = SENT. The
                            DRANK WATER action
                            will mark that event
                            DRANK and add 250 ml.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            sendTestNotification
                        }
                        disabled={
                            !isEnabled ||
                            serviceWorkerStatus !== 'ready'
                        }
                        className={`
                            mt-6 w-full
                            rounded-xl
                            border px-5 py-4
                            text-xs font-black
                            tracking-[0.15em]
                            transition
                            ${!isEnabled ||
                                serviceWorkerStatus !== 'ready'
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/15'
                                : 'border-purple-400/30 bg-purple-400/10 text-purple-300 hover:border-purple-400/50 hover:bg-purple-400/15'
                            }
                        `}
                    >
                        {!isEnabled
                            ? 'ENABLE NOTIFICATIONS FIRST'
                            : serviceWorkerStatus !== 'ready'
                                ? 'SERVICE WORKER LOADING...'
                                : 'SEND TEST NOTIFICATION'}
                    </button>
                </div>

                {/* RESULT */}

                {message && (
                    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">

                        <div className="text-[9px] font-bold tracking-[0.2em] text-white/25">
                            SYSTEM MESSAGE
                        </div>

                        <p className="mt-2 text-xs leading-6 text-white/60">
                            {message}
                        </p>

                    </div>
                )}

                {/* BACK */}

                <button
                    type="button"
                    onClick={() =>
                    (window.location.href =
                        '/hydration')
                    }
                    className="mt-6 rounded-xl border border-white/10 px-5 py-3 text-xs font-black tracking-[0.15em] text-white/40 transition hover:border-white/20 hover:text-white"
                >
                    ← BACK TO HYDRATION
                </button>

                {/* FOOTER */}

                <div className="mt-10 text-center text-[9px] font-bold tracking-[0.2em] text-white/15">
                    NOTIFICATION ENGINE // LIFE RPG
                </div>

            </div>
        </main>
    );
}