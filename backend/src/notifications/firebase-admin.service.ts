import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  App,
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import {
  getMessaging,
  Messaging,
} from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminService {
  private readonly logger =
    new Logger(FirebaseAdminService.name);

  private readonly app: App;
  private readonly messaging: Messaging;

  constructor() {
    const existingApps = getApps();

    if (existingApps.length > 0) {
      this.app = existingApps[0];
    } else {
      this.app = initializeApp({
        credential:
          applicationDefault(),
      });
    }

    this.messaging =
      getMessaging(this.app);

    this.logger.log(
      '[Firebase Admin] Initialized successfully.',
    );
  }

  getMessaging(): Messaging {
    return this.messaging;
  }
}