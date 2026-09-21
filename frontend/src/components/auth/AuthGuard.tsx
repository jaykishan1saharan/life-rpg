'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Capacitor } from '@capacitor/core';

import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { auth } from '../../lib/firebase';

import {
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [user, setUser] =
    useState<any>(null);

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    let webUnsubscribe:
      (() => void) | undefined;

    let nativeListener:
      { remove: () => Promise<void> } | null =
      null;

    let cancelled = false;

    const setupAuth = async () => {
      try {
        // =====================================================
        // NATIVE ANDROID / CAPACITOR
        // =====================================================

        if (Capacitor.isNativePlatform()) {
          nativeListener =
            await FirebaseAuthentication.addListener(
              'authStateChange',
              (change) => {
                if (cancelled) {
                  return;
                }

                if (change.user) {
                  setUser(change.user);
                  setChecking(false);
                  return;
                }

                setUser(null);
                setChecking(false);
                router.replace('/login');
              },
            );

          // Check the already-restored native session too.
          const result =
            await FirebaseAuthentication.getCurrentUser();

          if (cancelled) {
            return;
          }

          if (result.user) {
            setUser(result.user);
            setChecking(false);
            return;
          }

          /*
           * IMPORTANT:
           * Do NOT redirect immediately.
           *
           * Android/Firebase may still be restoring
           * the persisted native session.
           */
          setTimeout(async () => {
            if (cancelled) {
              return;
            }

            const retry =
              await FirebaseAuthentication.getCurrentUser();

            if (cancelled) {
              return;
            }

            if (retry.user) {
              setUser(retry.user);
              setChecking(false);
              return;
            }

            setUser(null);
            setChecking(false);

            router.replace('/login');
          }, 1500);

          return;
        }

        // =====================================================
        // WEB / BROWSER
        // =====================================================

        webUnsubscribe =
          onAuthStateChanged(
            auth,
            (firebaseUser: User | null) => {
              if (cancelled) {
                return;
              }

              if (firebaseUser) {
                setUser(firebaseUser);
                setChecking(false);
                return;
              }

              setUser(null);
              setChecking(false);

              router.replace('/login');
            },
          );
      } catch (error) {
        console.error(
          '[AUTH] Auth initialization failed:',
          error,
        );

        if (cancelled) {
          return;
        }

        /*
         * Do not immediately redirect on native startup
         * because Firebase may still be restoring the session.
         */
        if (Capacitor.isNativePlatform()) {
          setTimeout(async () => {
            if (cancelled) {
              return;
            }

            try {
              const retry =
                await FirebaseAuthentication.getCurrentUser();

              if (retry.user) {
                setUser(retry.user);
                setChecking(false);
                return;
              }
            } catch (retryError) {
              console.error(
                '[AUTH] Native retry failed:',
                retryError,
              );
            }

            if (!cancelled) {
              setUser(null);
              setChecking(false);
              router.replace('/login');
            }
          }, 1500);

          return;
        }

        setUser(null);
        setChecking(false);

        router.replace('/login');
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
  }, [router]);

  // ===========================================================
  // AUTH CHECKING
  // ===========================================================

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

          <p className="text-sm font-bold tracking-widest text-cyan-400">
            LOADING CHARACTER...
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================
  // NOT AUTHENTICATED
  // ===========================================================

  if (!user) {
    return null;
  }

  // ===========================================================
  // AUTHENTICATED
  // ===========================================================

  return <>{children}</>;
}