self.addEventListener('install', (event) => {
  console.log('[Hydration SW] Installing...');

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Hydration SW] Activated...');

  event.waitUntil(
    self.clients.claim(),
  );
});

/* =========================================================
   PUSH NOTIFICATION
   ========================================================= */

self.addEventListener('push', (event) => {
  let data = {
    title: 'TIME TO HYDRATE',
    body: 'Your body is waiting for its next water refill.',
    eventId: '',
    reminderKey: '',
    reminderTime: '',
    reminderSource: '',
    snoozeMinutes: '15',
    type: 'hydration-reminder',
    url: '/hydration',
  };

  if (event.data) {
    try {
      const incomingData =
        event.data.json();

      /*
       * Support FCM data payload.
       */

      if (
        incomingData.notification
      ) {
        data.title =
          incomingData.notification.title ||
          data.title;

        data.body =
          incomingData.notification.body ||
          data.body;
      }

      if (
        incomingData.data
      ) {
        data = {
          ...data,
          ...incomingData.data,
        };
      }

      /*
       * Also support flat payloads.
       */

      data = {
        ...data,
        ...incomingData,
      };
    } catch {
      data.body =
        event.data.text();
    }
  }

  /*
   * =======================================================
   * SEND MESSAGE TO OPEN HYDRATION PAGE
   * =======================================================
   */

  const notifyOpenHydrationPages =
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clients) => {
        for (
          const client of clients
        ) {
          if (
            client.url.includes(
              '/hydration',
            )
          ) {
            console.log(
              '[Hydration SW] Sending reminder to Hydration page.',
            );

            client.postMessage({
              type:
                'HYDRATION_PUSH_RECEIVED',

              title:
                data.title ||
                '💧 TIME TO HYDRATE',

              body:
                data.body ||
                'Your body is waiting for its next water refill.',

              eventId:
                data.eventId || '',

              reminderKey:
                data.reminderKey || '',

              reminderTime:
                data.reminderTime || '',

              reminderSource:
                data.reminderSource ||
                'HYDRATION',

              snoozeMinutes:
                data.snoozeMinutes ||
                '15',

              url:
                data.url ||
                '/hydration',
            });
          }
        }
      });

  /*
   * =======================================================
   * SHOW SYSTEM NOTIFICATION
   * =======================================================
   */

  const showNotification =
    self.registration.showNotification(
      data.title ||
      'TIME TO HYDRATE',
      {
        body:
          data.body ||
          'Time to drink some water.',

        tag:
          data.eventId
            ? `hydration-${data.eventId}`
            : 'life-rpg-hydration',

        renotify: true,

        requireInteraction: true,

        data: {
          url:
            data.url ||
            '/hydration',

          eventId:
            data.eventId || '',

          reminderKey:
            data.reminderKey || '',

          reminderTime:
            data.reminderTime || '',

          reminderSource:
            data.reminderSource || '',

          snoozeMinutes:
            data.snoozeMinutes ||
            '15',
        },

        actions: [
          {
            action: 'drink',
            title: 'DRANK WATER',
          },
          {
            action: 'snooze',
            title: 'SNOOZE',
          },
        ],
      },
    );

  event.waitUntil(
    Promise.all([
      notifyOpenHydrationPages,
      showNotification,
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log(
    '[Hydration SW] Notification clicked:',
    event.action,
    event.notification?.data,
  );

  const notification = event.notification;
  const data = notification?.data || {};

  const eventId = data.eventId || '';
  const url = data.url || '/hydration';

  const snoozeMinutes = Number(
    data.snoozeMinutes ?? 15,
  );

  /*
   * Close notification immediately.
   */
  notification.close();

  /*
   * DRANK WATER
   */
  if (event.action === 'drink') {
    event.waitUntil(
      (async () => {
        const clients =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });

        const hydrationClient =
          clients.find((client) =>
            client.url.includes(
              '/hydration',
            ),
          );

        if (hydrationClient) {
          console.log(
            '[Hydration SW] Sending DRANK action to Hydration page.',
          );

          hydrationClient.postMessage({
            type: 'HYDRATION_DRANK',
            eventId,
            amountMl: 250,
          });

          await hydrationClient.focus();

          return;
        }

        /*
         * App is not open.
         * Open hydration page with action
         * in query parameters.
         */
        const fallbackUrl =
          new URL(
            url,
            self.location.origin,
          );

        fallbackUrl.searchParams.set(
          'hydrationAction',
          'drank',
        );

        fallbackUrl.searchParams.set(
          'eventId',
          eventId,
        );

        fallbackUrl.searchParams.set(
          'amountMl',
          '250',
        );

        console.log(
          '[Hydration SW] Opening hydration page for DRANK action:',
          fallbackUrl.toString(),
        );

        await self.clients.openWindow(
          fallbackUrl.toString(),
        );
      })(),
    );

    return;
  }

  /*
   * SNOOZE
   */
  if (event.action === 'snooze') {
    event.waitUntil(
      (async () => {
        const clients =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });

        const hydrationClient =
          clients.find((client) =>
            client.url.includes(
              '/hydration',
            ),
          );

        const snoozeMinutes = Number(
          data.snoozeMinutes ?? 15,
        );

        if (hydrationClient) {
          console.log(
            '[Hydration SW] Sending SNOOZE action to Hydration page.',
          );

          hydrationClient.postMessage({
            type: 'HYDRATION_SNOOZE',
            eventId,
            snoozeMinutes,
          });

          await hydrationClient.focus();

          return;
        }

        const fallbackUrl =
          new URL(
            url,
            self.location.origin,
          );

        fallbackUrl.searchParams.set(
          'hydrationAction',
          'snooze',
        );

        fallbackUrl.searchParams.set(
          'eventId',
          eventId,
        );

        fallbackUrl.searchParams.set(
          'snoozeMinutes',
          String(snoozeMinutes),
        );

        console.log(
          '[Hydration SW] Opening hydration page for SNOOZE action:',
          fallbackUrl.toString(),
        );

        await self.clients.openWindow(
          fallbackUrl.toString(),
        );
      })(),
    );

    return;
  }

  /*
   * Normal notification click
   * without pressing an action button.
   */
  event.waitUntil(
    (async () => {
      const clients =
        await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

      const hydrationClient =
        clients.find((client) =>
          client.url.includes(
            '/hydration',
          ),
        );

      if (hydrationClient) {
        await hydrationClient.focus();
        return;
      }

      await self.clients.openWindow(
        new URL(
          url,
          self.location.origin,
        ).toString(),
      );
    })(),
  );
});