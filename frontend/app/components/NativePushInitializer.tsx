'use client';

import { useEffect, useRef } from 'react';

export default function NativePushInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializePush = async () => {
      try {
        const { Capacitor } =
          await import('@capacitor/core');

        if (!Capacitor.isNativePlatform()) {
          console.log(
            '[Native Push] Browser detected',
          );
          return;
        }

        console.log(
          '[Native Push] Android native app detected',
        );

        const {
          PushNotifications,
        } = await import(
          '@capacitor/push-notifications'
        );

        const {
          onAuthStateChanged,
        } = await import('firebase/auth');

        const { auth } =
          await import(
            '../../src/lib/firebase'
          );

        // ==========================================
        // TOKEN STORAGE
        // ==========================================

        let nativeFcmToken: string | null =
          null;

        let registeredToken: string | null =
          null;

        // ==========================================
        // REGISTER TOKEN WITH BACKEND
        // ==========================================

        const registerTokenWithBackend =
          async (
            token: string,
            user: any,
          ) => {
            try {
              if (!user) {
                console.log(
                  '[Native Push] No Firebase user',
                );
                return;
              }

              if (
                registeredToken === token
              ) {
                console.log(
                  '[Native Push] Token already registered',
                );
                return;
              }

              console.log(
                '[Native Push] Firebase user:',
                user.uid,
              );

              const idToken =
                await user.getIdToken(
                  true,
                );

              console.log(
                '[Native Push] ID token obtained',
              );

              const apiUrl =
                process.env
                  .NEXT_PUBLIC_API_URL;

              console.log(
                '[Native Push] API URL:',
                apiUrl,
              );

              if (!apiUrl) {
                throw new Error(
                  'NEXT_PUBLIC_API_URL is missing',
                );
              }

              console.log(
                '[Native Push] Registering native FCM token with backend...',
              );

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
                      fcmToken: token,
                    }),
                  },
                );

              const responseText =
                await response.text();

              console.log(
                '[Native Push] Backend response:',
                response.status,
                responseText,
              );

              if (!response.ok) {
                throw new Error(
                  `Backend registration failed: ${response.status} ${responseText}`,
                );
              }

              registeredToken =
                token;

              console.log(
                '========================================',
              );

              console.log(
                '[Native Push] DEVICE REGISTERED SUCCESSFULLY',
              );

              console.log(
                '========================================',
              );
            } catch (error) {
              console.error(
                '[Native Push] Backend registration error:',
                error,
              );
            }
          };

        // ==========================================
        // FIREBASE AUTH
        // ==========================================

        const waitForFirebaseUser =
          new Promise<any>(
            (resolve) => {
              const unsubscribe =
                onAuthStateChanged(
                  auth,
                  (user) => {
                    console.log(
                      '[Native Push] Auth state:',
                      user
                        ? `LOGGED IN ${user.uid}`
                        : 'NOT LOGGED IN',
                    );

                    if (user) {
                      unsubscribe();

                      resolve(user);
                    }
                  },
                );

              // Firebase may already have user
              if (auth.currentUser) {
                unsubscribe();

                resolve(
                  auth.currentUser,
                );
              }
            },
          );

        // ==========================================
        // PUSH REGISTRATION
        // ==========================================

        await PushNotifications.addListener(
          'registration',
          async (token) => {
            nativeFcmToken =
              token.value;

            console.log(
              '========================================',
            );

            console.log(
              '[Native Push] FCM TOKEN RECEIVED',
            );

            console.log(
              token.value,
            );

            console.log(
              '========================================',
            );

            try {
              console.log(
                '[Native Push] Waiting for Firebase Auth...',
              );

              const user =
                await waitForFirebaseUser;

              console.log(
                '[Native Push] Firebase Auth ready',
              );

              await registerTokenWithBackend(
                token.value,
                user,
              );
            } catch (error) {
              console.error(
                '[Native Push] Failed waiting for Firebase Auth:',
                error,
              );
            }
          },
        );

        // ==========================================
        // REGISTRATION ERROR
        // ==========================================

        await PushNotifications.addListener(
          'registrationError',
          (error) => {
            console.error(
              '[Native Push] FCM registration error:',
              error,
            );
          },
        );

        // ==========================================
        // NOTIFICATION RECEIVED
        // ==========================================

        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log(
              '[Native Push] Notification received:',
              notification,
            );
          },
        );

        // ==========================================
        // NOTIFICATION TAPPED
        // ==========================================

        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            console.log(
              '[Native Push] Notification tapped:',
              action,
            );
          },
        );

        // ==========================================
        // PERMISSION
        // ==========================================

        let permission =
          await PushNotifications.checkPermissions();

        console.log(
          '[Native Push] Permission:',
          permission.receive,
        );

        if (
          permission.receive !==
          'granted'
        ) {
          permission =
            await PushNotifications.requestPermissions();

          console.log(
            '[Native Push] Permission after request:',
            permission.receive,
          );
        }

        if (
          permission.receive !==
          'granted'
        ) {
          console.error(
            '[Native Push] Notification permission denied',
          );

          return;
        }

        console.log(
          '[Native Push] Notification permission GRANTED',
        );

        // ==========================================
        // ANDROID NOTIFICATION CHANNEL
        // ==========================================

        await PushNotifications.createChannel({
          id: 'hydration',
          name: 'Hydration Reminders',
          description:
            'Life RPG hydration reminders',
          importance: 4,
          vibration: true,
        });

        console.log(
          '[Native Push] Hydration notification channel created',
        );

        // ==========================================
        // REGISTER WITH FCM
        // ==========================================

        console.log(
          '[Native Push] Calling PushNotifications.register()...',
        );

        await PushNotifications.register();

        console.log(
          '[Native Push] register() completed',
        );
      } catch (error) {
        console.error(
          '[Native Push] INITIALIZATION ERROR:',
          error,
        );
      }
    };

    initializePush();
  }, []);

  return null;
}