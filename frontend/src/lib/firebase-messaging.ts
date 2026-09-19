import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';

import { app } from './firebase';

export async function getHydrationFcmToken() {
  if (
    typeof window === 'undefined'
  ) {
    throw new Error(
      'FCM can only run in the browser.',
    );
  }

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

  const supported =
    await isSupported();

  if (!supported) {
    throw new Error(
      'Firebase Cloud Messaging is not supported by this browser.',
    );
  }

  const vapidKey =
    process.env
      .NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.',
    );
  }

  if (
    Notification.permission !==
    'granted'
  ) {
    throw new Error(
      'Notification permission is not granted.',
    );
  }

  /*
   * Use our existing hydration
   * service worker.
   */
  const registration =
    await navigator.serviceWorker.getRegistration(
      '/hydration-sw.js',
    );

  if (!registration) {
    throw new Error(
      'Hydration service worker is not registered.',
    );
  }

  const messaging =
    getMessaging(app);

  const token =
    await getToken(
      messaging,
      {
        vapidKey,
        serviceWorkerRegistration:
          registration,
      },
    );

  if (!token) {
    throw new Error(
      'FCM registration token was not generated.',
    );
  }

  return token;
}

/*
 * ========================================================
 * FOREGROUND HYDRATION MESSAGES
 * ========================================================
 *
 * When the Life RPG hydration page is open,
 * Firebase delivers the FCM message here instead
 * of relying only on the service worker notification.
 *
 * The dashboard uses this to show the in-app
 * hydration popup.
 */
export async function
  listenForHydrationMessages(
    callback: (
      payload: MessagePayload,
    ) => void,
  ) {
  if (
    typeof window === 'undefined'
  ) {
    return () => { };
  }

  if (
    !('Notification' in window)
  ) {
    return () => { };
  }

  if (
    !('serviceWorker' in navigator)
  ) {
    return () => { };
  }

  try {
    const supported =
      await isSupported();

    if (!supported) {
      return () => { };
    }

    const messaging =
      getMessaging(app);

    console.log(
      '[Hydration FCM] Foreground listener attached.',
    );

    return onMessage(
      messaging,
      (payload) => {
        console.log(
          '[Hydration FCM] FOREGROUND MESSAGE RECEIVED:',
          payload,
        );

        callback(payload);
      },
    );
  } catch (error) {
    console.error(
      '[Hydration FCM] Failed to initialize foreground listener:',
      error,
    );

    return () => { };
  }
}