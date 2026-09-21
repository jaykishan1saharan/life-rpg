import { Capacitor } from '@capacitor/core';

import {
  auth,
} from '../lib/firebase';

import {
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

export async function getFirebaseIdToken() {

  /* =========================================
     ANDROID / NATIVE
  ========================================= */

  if (
    Capacitor.isNativePlatform()
  ) {

    const result =
      await FirebaseAuthentication
        .getIdToken();

    return result.token;
  }

  /* =========================================
     WEB
  ========================================= */

  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      'User is not authenticated',
    );
  }

  return user.getIdToken();
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  const token =
    await getFirebaseIdToken();

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,

          ...options.headers,
        },
      },
    );

  if (!response.ok) {

    const errorData =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      errorData?.message ||
        'Something went wrong',
    );
  }

  return response.json();
}

export async function getCurrentUser() {
  return apiRequest(
    '/users/me',
  );
}