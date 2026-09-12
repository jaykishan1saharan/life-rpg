import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getAuth, Auth } from 'firebase-admin/auth';
import {
  App,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class AuthService {
  private readonly firebaseApp: App;
  private readonly firebaseAuth: Auth;

  constructor() {
    const apps = getApps();

    if (apps.length === 0) {
      const serviceAccountPath = resolve(
        process.cwd(),
        'firebase',
        'service-account.json',
      );

      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf-8'),
      );

      this.firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      this.firebaseApp = apps[0];
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