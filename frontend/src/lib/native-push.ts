import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from '@capacitor/push-notifications';

export async function initializeNativePushNotifications() {
  // Only run on native Android/iOS
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Check current permission
    let permission = await PushNotifications.checkPermissions();

    console.log(
      '[Native Push] Current permission:',
      permission.receive,
    );

    // Ask only when not granted
    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions();

      console.log(
        '[Native Push] Permission result:',
        permission.receive,
      );
    }

    // User denied permission
    if (permission.receive !== 'granted') {
      console.log(
        '[Native Push] Notification permission denied',
      );
      return;
    }

    // Registration success
    await PushNotifications.addListener(
      'registration',
      (token: Token) => {
        console.log(
          '[Native Push] FCM token:',
          token.value,
        );

        // IMPORTANT:
        // Next step will send this token
        // to your Life RPG backend.
      },
    );

    // Registration error
    await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error(
          '[Native Push] Registration error:',
          error,
        );
      },
    );

    // Notification received while app is running
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log(
          '[Native Push] Notification received:',
          notification,
        );
      },
    );

    // User taps notification
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log(
          '[Native Push] Notification action:',
          action,
        );
      },
    );

    // Register this device with FCM
    await PushNotifications.register();

    console.log(
      '[Native Push] Registration requested',
    );
  } catch (error) {
    console.error(
      '[Native Push] Initialization failed:',
      error,
    );
  }
}