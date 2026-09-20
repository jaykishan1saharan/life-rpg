import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Message,
} from 'firebase-admin/messaging';

import {
  FirebaseAdminService,
} from './firebase-admin.service.js';

@Injectable()
export class PushNotificationService {
  private readonly logger =
    new Logger(
      PushNotificationService.name,
    );

  constructor(
    private readonly firebaseAdmin:
      FirebaseAdminService,
  ) { }

  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const message: Message = {
      token,

      // DATA payload
      data: {
        title,
        body,
        ...(data ?? {}),
      },

      // ANDROID notification
      android: {
        priority: 'high',

        notification: {
          title,
          body,
          channelId: 'hydration',
          sound: 'default',
        },
      },

      // WEB notification behavior
      webpush: {
        fcmOptions: {
          link: '/hydration',
        },
      },
    };

    try {
      const response =
        await this.firebaseAdmin
          .getMessaging()
          .send(message);

      this.logger.log(
        `[FCM] Push sent successfully: ${response}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        '[FCM] Failed to send push notification.',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }
  }
}