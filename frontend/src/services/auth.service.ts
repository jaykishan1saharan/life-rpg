import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import { auth } from '../lib/firebase';

import { Capacitor } from '@capacitor/core';
import {
  FirebaseAuthentication,
} from '@capacitor-firebase/authentication';

const googleProvider =
  new GoogleAuthProvider();

const isNative =
  Capacitor.isNativePlatform();

/* =====================================================
   REGISTER
===================================================== */

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<any> {

  if (isNative) {
    const result =
      await FirebaseAuthentication
        .createUserWithEmailAndPassword({
          email,
          password,
        });

    return result.user;
  }

  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

  await updateProfile(
    credential.user,
    {
      displayName: name,
    },
  );

  return credential.user;
}

/* =====================================================
   LOGIN
===================================================== */

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<any> {

  if (isNative) {
    const result =
      await FirebaseAuthentication
        .signInWithEmailAndPassword({
          email,
          password,
        });

    return result.user;
  }

  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return credential.user;
}

/* =====================================================
   GOOGLE LOGIN
===================================================== */

export async function loginWithGoogle(): Promise<any> {

  if (isNative) {
    const result =
      await FirebaseAuthentication
        .signInWithGoogle();

    return result.user;
  }

  const credential =
    await signInWithPopup(
      auth,
      googleProvider,
    );

  return credential.user;
}

/* =====================================================
   LINK EMAIL + PASSWORD
===================================================== */

export async function linkEmailPassword(
  email: string,
  password: string,
): Promise<any> {

  if (isNative) {
    const result =
      await FirebaseAuthentication
        .linkWithEmailAndPassword({
          email,
          password,
        });

    return result.user;
  }

  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    throw new Error(
      'You must sign in with Google before setting an email password.',
    );
  }

  const credential =
    EmailAuthProvider.credential(
      email,
      password,
    );

  const linkedCredential =
    await linkWithCredential(
      currentUser,
      credential,
    );

  return linkedCredential.user;
}

/* =====================================================
   LOGOUT
===================================================== */

export async function logout(): Promise<void> {

  if (isNative) {
    await FirebaseAuthentication
      .signOut();

    return;
  }

  await signOut(auth);
}