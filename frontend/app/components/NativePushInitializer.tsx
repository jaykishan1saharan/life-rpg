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
          FirebaseAuthentication,
        } = await import(
          '@capacitor-firebase/authentication'
        );

        // ==========================================
        // TOKEN STORAGE
        // ==========================================

        let registeredToken: string | null = null;

        // ==========================================
        // WAIT FOR NATIVE FIREBASE USER
        // ==========================================

        const waitForNativeFirebaseUser =
          async (): Promise<any> => {
            console.log(
              '[Native Push] Checking native Firebase user...',
            );

            // ----------------------------------------
            // 1. Check immediately
            // ----------------------------------------

            try {
              const currentUser =
                await FirebaseAuthentication.getCurrentUser();

              if (currentUser.user) {
                console.log(
                  '[Native Push] Native Firebase user found:',
                  currentUser.user.uid,
                );

                return currentUser.user;
              }
            } catch (error) {
              console.error(
                '[Native Push] getCurrentUser failed:',
                error,
              );
            }

            // ----------------------------------------
            // 2. Listen for native auth state
            // ----------------------------------------

            console.log(
              '[Native Push] Waiting for native Firebase auth state...',
            );

            return new Promise<any>(
              async (resolve) => {
                let resolved = false;

                const finish = async (
                  user: any,
                ) => {
                  if (resolved || !user) return;

                  resolved = true;

                  try {
                    await authStateListener?.remove();
                  } catch {}

                  console.log(
                    '[Native Push] Native Firebase auth ready:',
                    user.uid,
                  );

                  resolve(user);
                };

                let authStateListener:
                  | {
                      remove: () => Promise<void>;
                    }
                  | undefined;

                try {
                  authStateListener =
                    await FirebaseAuthentication.addListener(
                      'authStateChange',
                      (change) => {
                        console.log(
                          '[Native Push] Native auth state changed:',
                          change.user
                            ? `LOGGED IN ${change.user.uid}`
                            : 'NOT LOGGED IN',
                        );

                        if (change.user) {
                          void finish(change.user);
                        }
                      },
                    );
                } catch (error) {
                  console.error(
                    '[Native Push] Failed to add native auth listener:',
                    error,
                  );
                }

                // ------------------------------------
                // 3. Retry current user for a few seconds
                // ------------------------------------

                let attempts = 0;

                const interval = setInterval(
                  async () => {
                    if (resolved) {
                      clearInterval(interval);
                      return;
                    }

                    attempts++;

                    try {
                      const currentUser =
                        await FirebaseAuthentication.getCurrentUser();

                      if (currentUser.user) {
                        clearInterval(interval);
                        await finish(
                          currentUser.user,
                        );
                        return;
                      }
                    } catch {}

                    if (attempts >= 15) {
                      clearInterval(interval);

                      try {
                        await authStateListener?.remove();
                      } catch {}

                      console.error(
                        '[Native Push] Timed out waiting for native Firebase user',
                      );

                      resolve(null);
                    }
                  },
                  1000,
                );
              },
            );
          };

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
                  '[Native Push] No native Firebase user',
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
                '[Native Push] Native Firebase user:',
                user.uid,
              );

              // --------------------------------------
              // Get native Firebase ID token
              // --------------------------------------

              const idTokenResult =
                await FirebaseAuthentication.getIdToken();

              const idToken =
                idTokenResult.token;

              if (!idToken) {
                throw new Error(
                  'Native Firebase ID token is missing',
                );
              }

              console.log(
                '[Native Push] Native ID token obtained',
              );

              // --------------------------------------
              // API URL
              // --------------------------------------

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

              // --------------------------------------
              // Register FCM token
              // --------------------------------------

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
        // FCM REGISTRATION
        // ==========================================

        await PushNotifications.addListener(
          'registration',
          async (token) => {
            console.log(
              '========================================',
            );

            console.log(
              '[Native Push] FCM TOKEN RECEIVED',
            );

            console.log(
              '[Native Push] Token length:',
              token.value.length,
            );

            console.log(
              '========================================',
            );

            try {
              console.log(
                '[Native Push] Waiting for native Firebase Auth...',
              );

              const user =
                await waitForNativeFirebaseUser();

              if (!user) {
                console.error(
                  '[Native Push] No native Firebase user available. Token not registered.',
                );
                return;
              }

              console.log(
                '[Native Push] Native Firebase Auth ready',
              );

              await registerTokenWithBackend(
                token.value,
                user,
              );
            } catch (error) {
              console.error(
                '[Native Push] Failed waiting for native Firebase Auth:',
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

    void initializePush();
  }, []);

  return null;
}