import { Module } from '@nestjs/common';

import {
  FirebaseAdminService,
} from './firebase-admin.service.js';

import {
  PushNotificationService,
} from './push-notification.service.js';

@Module({
  providers: [
    FirebaseAdminService,
    PushNotificationService,
  ],

  exports: [
    FirebaseAdminService,
    PushNotificationService,
  ],
})
export class NotificationsModule {}