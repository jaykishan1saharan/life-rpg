import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';

@Module({
  providers: [
    AuthService,
    FirebaseAuthGuard,
  ],
  exports: [
    AuthService,
    FirebaseAuthGuard,
  ],
})
export class AuthModule {}