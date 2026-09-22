package com.jaykishan.liferpg;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

public class HydrationAlarmService extends Service {

    public static final String ACTION_START =
            "com.jaykishan.liferpg.HYDRATION_ALARM_START";

    public static final String ACTION_DRANK =
            "com.jaykishan.liferpg.HYDRATION_ALARM_DRANK";

    public static final String ACTION_SNOOZE =
            "com.jaykishan.liferpg.HYDRATION_ALARM_SNOOZE";

    private static final String CHANNEL_ID =
            "hydration-alarm-active-v2";

    private static final int NOTIFICATION_ID =
            920001;

    private static final int SNOOZE_REQUEST_CODE =
            920002;

    private static final String ACTION_PREFS =
            "hydration_alarm_action";

    private static final String KEY_PENDING_ACTION =
            "pending_action";

    private static final String KEY_AMOUNT_ML =
            "amount_ml";

    private MediaPlayer mediaPlayer;

    private int alarmId = 0;

    private String title =
            "💧 TIME TO HYDRATE";

    private String body =
            "Your body is waiting for its next water refill.";

    private int snoozeMinutes = 15;

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_DRANK.equals(action)) {

    alarmId =
            intent.getIntExtra(
                    "alarm_id",
                    0
            );

    long triggerAt =
            intent.getLongExtra(
                    "trigger_at",
                    0L
            );

    savePendingDrankAction(
            triggerAt
    );

    stopAlarm();

    openMainActivity("DRANK");

    return START_NOT_STICKY;
}

        if (ACTION_SNOOZE.equals(action)) {

    alarmId =
            intent.getIntExtra(
                    "alarm_id",
                    0
            );

    triggerAt =
            intent.getLongExtra(
                    "trigger_at",
                    0L
            );

    snoozeMinutes =
            intent.getIntExtra(
                    "snooze_minutes",
                    15
            );

    title =
            intent.getStringExtra(
                    "title"
            );

    body =
            intent.getStringExtra(
                    "body"
            );

    if (title == null) {
        title = "💧 TIME TO HYDRATE";
    }

    if (body == null) {
        body =
                "Your body is waiting for its next water refill.";
    }

    savePendingSnoozeAction();

    stopAlarm();

    long snoozeAt =
            System.currentTimeMillis()
                    + (
                        snoozeMinutes *
                        60L *
                        1000L
                    );

    try {

        HydrationAlarmScheduler
                .scheduleSingleAlarm(
                        this,
                        930000 + alarmId,
                        snoozeAt,
                        title,
                        body,
                        snoozeMinutes
                );

        openMainActivity("SNOOZE");

    } catch (Exception error) {

        android.util.Log.e(
                "HydrationAlarmService",
                "Failed to schedule snooze",
                error
        );
    }

    return START_NOT_STICKY;
}

        /*
         * Normal alarm start.
         */

        if (ACTION_START.equals(action)) {

            alarmId =
                    intent.getIntExtra(
                            "alarm_id",
                            0
                    );

            title =
                    intent.getStringExtra(
                            "title"
                    );

            body =
                    intent.getStringExtra(
                            "body"
                    );

            snoozeMinutes =
                    intent.getIntExtra(
                            "snooze_minutes",
                            15
                    );

            if (title == null) {
                title = "💧 TIME TO HYDRATE";
            }

            if (body == null) {
                body =
                        "Your body is waiting for its next water refill.";
            }

            boolean soundEnabled =
                    intent.getBooleanExtra(
                            "sound_enabled",
                            true
                    );

            Notification notification =
                    buildNotification();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

                startForeground(
                        NOTIFICATION_ID,
                        notification,
                        android.content.pm.ServiceInfo
                                .FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                );

            } else {

                startForeground(
                        NOTIFICATION_ID,
                        notification
                );
            }

            if (soundEnabled) {
                startAlarmSound();
            }

            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private Notification buildNotification() {

        Intent drankIntent =
        new Intent(
                this,
                HydrationAlarmService.class
        );

drankIntent.setAction(
        ACTION_DRANK
);

drankIntent.putExtra(
        "alarm_id",
        alarmId
);

        PendingIntent drankPendingIntent =
                PendingIntent.getService(
                        this,
                        alarmId + 100000,
                        drankIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                                PendingIntent.FLAG_IMMUTABLE
                );

        Intent snoozeIntent =
                new Intent(
                        this,
                        HydrationAlarmService.class
                );

        snoozeIntent.setAction(
                ACTION_SNOOZE
        );

        snoozeIntent.putExtra(
                "alarm_id",
                alarmId
        );

        snoozeIntent.putExtra(
                "snooze_minutes",
                snoozeMinutes
        );

        snoozeIntent.putExtra(
                "title",
                title
        );

        snoozeIntent.putExtra(
                "body",
                body
        );

        PendingIntent snoozePendingIntent =
                PendingIntent.getService(
                        this,
                        SNOOZE_REQUEST_CODE,
                        snoozeIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                                PendingIntent.FLAG_IMMUTABLE
                );

        Intent openIntent =
                new Intent(
                        this,
                        MainActivity.class
                );

        openIntent.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent openPendingIntent =
                PendingIntent.getActivity(
                        this,
                        alarmId + 200000,
                        openIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                                PendingIntent.FLAG_IMMUTABLE
                );

        return new NotificationCompat.Builder(
                this,
                CHANNEL_ID
        )
                .setSmallIcon(
                        R.mipmap.ic_launcher
                )
                .setContentTitle(
                        title
                )
                .setContentText(
                        body
                )
                .setContentIntent(
                        openPendingIntent
                )
                .setPriority(
                        NotificationCompat.PRIORITY_MAX
                )
                .setCategory(
                        NotificationCompat.CATEGORY_ALARM
                )
                .setOngoing(
                        true
                )
                .setAutoCancel(
                        false
                )
                .setOnlyAlertOnce(
                        true
                )
                .addAction(
                        R.mipmap.ic_launcher,
                        "💧 DRANK WATER",
                        drankPendingIntent
                )
                .addAction(
                        R.mipmap.ic_launcher,
                        "😴 SNOOZE",
                        snoozePendingIntent
                )
                .build();
    }

    private void startAlarmSound() {

        stopAlarmSoundOnly();

        try {

            Uri alarmUri =
                    RingtoneManager
                            .getActualDefaultRingtoneUri(
                                    this,
                                    RingtoneManager.TYPE_ALARM
                            );

            if (alarmUri == null) {

                alarmUri =
                        RingtoneManager.getDefaultUri(
                                RingtoneManager.TYPE_ALARM
                        );
            }

            if (alarmUri == null) {
                return;
            }

            mediaPlayer =
                    MediaPlayer.create(
                            this,
                            alarmUri
                    );

            if (mediaPlayer == null) {
                return;
            }

            mediaPlayer.setLooping(true);

            if (Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.LOLLIPOP) {

                AudioAttributes audioAttributes =
                        new AudioAttributes.Builder()
                                .setUsage(
                                        AudioAttributes.USAGE_ALARM
                                )
                                .setContentType(
                                        AudioAttributes
                                                .CONTENT_TYPE_SONIFICATION
                                )
                                .build();

                mediaPlayer.setAudioAttributes(
                        audioAttributes
                );
            }

            mediaPlayer.start();

        } catch (Exception error) {

            android.util.Log.e(
                    "HydrationAlarmService",
                    "Failed to start alarm sound",
                    error
            );
        }
    }

    private void stopAlarm() {

        stopAlarmSoundOnly();

        stopForeground(
                true
        );

        stopSelf();
    }

    private void stopAlarmSoundOnly() {

        if (mediaPlayer != null) {

            try {

                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }

            } catch (Exception ignored) {
            }

            try {
                mediaPlayer.release();
            } catch (Exception ignored) {
            }

            mediaPlayer = null;
        }
    }

    private void openMainActivity(
            String action
    ) {

        Intent intent =
                new Intent(
                        this,
                        MainActivity.class
                );

        intent.putExtra(
                "hydrationAlarmAction",
                action
        );

        intent.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP |
                        Intent.FLAG_ACTIVITY_NEW_TASK
        );

        startActivity(intent);
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT <
                Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager =
                getSystemService(
                        NotificationManager.class
                );

        if (manager == null) {
            return;
        }

        NotificationChannel channel =
                new NotificationChannel(
                        CHANNEL_ID,
                        "Hydration Alarm",
                        NotificationManager.IMPORTANCE_HIGH
                );

        /*
         * IMPORTANT:
         *
         * The channel itself is silent.
         * The actual alarm sound is played by MediaPlayer
         * and keeps looping until DRANK/SNOOZE.
         */
        channel.setSound(
                null,
                null
        );

        channel.enableVibration(
                true
        );

        channel.setDescription(
                "Active Life Easy TODO hydration alarm"
        );

        manager.createNotificationChannel(
                channel
        );
    }

    private void savePendingDrankAction(
        long triggerAt
) {

    getSharedPreferences(
            ACTION_PREFS,
            MODE_PRIVATE
    )
            .edit()

            .putString(
                    KEY_PENDING_ACTION,
                    "DRANK"
            )

            .putInt(
                    KEY_AMOUNT_ML,
                    250
            )

            .putInt(
                    "alarm_id",
                    alarmId
            )

            .putLong(
                    "trigger_at",
                    triggerAt > 0
                            ? triggerAt
                            : System.currentTimeMillis()
            )

            .putInt(
                    "snooze_minutes",
                    snoozeMinutes
            )

            .apply();
}

private void savePendingSnoozeAction() {

    getSharedPreferences(
            ACTION_PREFS,
            MODE_PRIVATE
    )
            .edit()

            .putString(
                    KEY_PENDING_ACTION,
                    "SNOOZE"
            )

            .putInt(
                    KEY_AMOUNT_ML,
                    250
            )

            .putInt(
                    "alarm_id",
                    alarmId
            )

            .putLong(
                    "trigger_at",
                    triggerAt
            )

            .putInt(
                    "snooze_minutes",
                    snoozeMinutes
            )

            .apply();
}

    @Override
    public void onDestroy() {

        stopAlarmSoundOnly();

        super.onDestroy();
    }

    @Override
    public IBinder onBind(
            Intent intent
    ) {
        return null;
    }
}