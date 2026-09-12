import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );

  await updateProfile(credential.user, {
    displayName: name,
  });

  return credential.user;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(
    auth,
    googleProvider,
  );

  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}