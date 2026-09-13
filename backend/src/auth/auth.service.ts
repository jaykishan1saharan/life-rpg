import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getAuth, Auth } from 'firebase-admin/auth';
import {
  App,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

@Injectable()
export class AuthService {
  private readonly firebaseApp: App;
  private readonly firebaseAuth: Auth;

  constructor() {
    const apps = getApps();

    if (apps.length > 0) {
      this.firebaseApp = apps[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey =
        process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Firebase Admin environment variables are not configured',
        );
      }

      this.firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    this.firebaseAuth = getAuth(this.firebaseApp);
  }

  async verifyToken(token: string) {
    try {
      return await this.firebaseAuth.verifyIdToken(token);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }
}