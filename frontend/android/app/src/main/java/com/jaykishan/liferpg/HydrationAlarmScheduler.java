package com.jaykishan.liferpg;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

public final class HydrationAlarmScheduler {

    public static final String CHANNEL_ID =
            "hydration-native-alarm";

    private static final String PREFS =
            "hydration_native_alarm_prefs";

    private static final String KEY_ALARMS =
            "scheduled_alarms";

    private HydrationAlarmScheduler() {}

    public static void ensureNotificationChannel(
            Context context
    ) {

        if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.O) {

            NotificationManager manager =
                    context.getSystemService(
                            NotificationManager.class
                    );

            if (manager == null) {
                return;
            }

            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "Hydration Reminders",
                            NotificationManager.IMPORTANCE_HIGH
                    );

            channel.setDescription(
                    "Life Easy TODO hydration reminders"
            );

            channel.enableVibration(
                    true
            );

            manager.createNotificationChannel(
                    channel
            );
        }
    }

    public static boolean canScheduleExactAlarms(
            Context context
    ) {

        if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.S) {

            AlarmManager alarmManager =
                    context.getSystemService(
                            AlarmManager.class
                    );

            return alarmManager != null &&
                    alarmManager.canScheduleExactAlarms();
        }

        return true;
    }

    public static void openExactAlarmSettings(
            Context context
    ) {

        if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.S) {

            Intent intent =
                    new Intent(
                            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                    );

            intent.setData(
                    android.net.Uri.parse(
                            "package:" +
                                    context.getPackageName()
                    )
            );

            intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK
            );

            context.startActivity(
                    intent
            );
        }
    }

    public static void scheduleAlarms(
            Context context,
            JSONArray alarms
    ) throws Exception {

        ensureNotificationChannel(
                context
        );

        AlarmManager alarmManager =
                context.getSystemService(
                        AlarmManager.class
                );

        if (alarmManager == null) {
            throw new Exception(
                    "Android AlarmManager is unavailable."
            );
        }

        if (!canScheduleExactAlarms(context)) {
            throw new Exception(
                    "Exact alarm permission is not enabled."
            );
        }

        cancelAllAlarms(
                context
        );

        for (
                int i = 0;
                i < alarms.length();
                i++
        ) {

            JSONObject alarm =
                    alarms.getJSONObject(i);

            int id =
                    alarm.getInt(
                            "id"
                    );

            long triggerAt =
                    alarm.getLong(
                            "at"
                    );

            String title =
                    alarm.optString(
                            "title",
                            "💧 TIME TO HYDRATE"
                    );

            String body =
                    alarm.optString(
                            "body",
                            "Your body is waiting for its next water refill."
                    );

            int snoozeMinutes =
                    alarm.optInt(
                            "snoozeMinutes",
                            15
                    );

            boolean soundEnabled =
                    alarm.optBoolean(
                            "soundEnabled",
                            true
                    );

            if (
                    triggerAt <=
                            System.currentTimeMillis()
            ) {
                continue;
            }

            scheduleAlarmInternal(
                    context,
                    alarmManager,
                    id,
                    triggerAt,
                    title,
                    body,
                    snoozeMinutes,
                    soundEnabled
            );
        }

        context
                .getSharedPreferences(
                        PREFS,
                        Context.MODE_PRIVATE
                )
                .edit()
                .putString(
                        KEY_ALARMS,
                        alarms.toString()
                )
                .apply();
    }

    public static void scheduleSingleAlarm(
            Context context,
            int id,
            long triggerAt,
            String title,
            String body,
            int snoozeMinutes
    ) throws Exception {

        AlarmManager alarmManager =
                context.getSystemService(
                        AlarmManager.class
                );

        if (alarmManager == null) {
            throw new Exception(
                    "Android AlarmManager is unavailable."
            );
        }

        if (!canScheduleExactAlarms(context)) {
            throw new Exception(
                    "Exact alarm permission is not enabled."
            );
        }

        scheduleAlarmInternal(
                context,
                alarmManager,
                id,
                triggerAt,
                title,
                body,
                snoozeMinutes,
                true
        );

        /*
         * Preserve the existing future alarms.
         * Add this snooze alarm to the saved list.
         */
        try {

            String saved =
                    context
                            .getSharedPreferences(
                                    PREFS,
                                    Context.MODE_PRIVATE
                            )
                            .getString(
                                    KEY_ALARMS,
                                    "[]"
                            );

            JSONArray alarms =
                    new JSONArray(saved);

            JSONObject snoozeAlarm =
                    new JSONObject();

            snoozeAlarm.put(
                    "id",
                    id
            );

            snoozeAlarm.put(
                    "at",
                    triggerAt
            );

            snoozeAlarm.put(
                    "title",
                    title
            );

            snoozeAlarm.put(
                    "body",
                    body
            );

            snoozeAlarm.put(
                    "snoozeMinutes",
                    snoozeMinutes
            );

            snoozeAlarm.put(
                    "soundEnabled",
                    true
            );

            alarms.put(
                    snoozeAlarm
            );

            context
                    .getSharedPreferences(
                            PREFS,
                            Context.MODE_PRIVATE
                    )
                    .edit()
                    .putString(
                            KEY_ALARMS,
                            alarms.toString()
                    )
                    .apply();

        } catch (Exception error) {

            android.util.Log.e(
                    "HydrationAlarm",
                    "Failed to save snooze alarm",
                    error
            );
        }
    }

    private static void scheduleAlarmInternal(
            Context context,
            AlarmManager alarmManager,
            int id,
            long triggerAt,
            String title,
            String body,
            int snoozeMinutes,
            boolean soundEnabled
    ) {

        Intent intent =
                new Intent(
                        context,
                        HydrationAlarmReceiver.class
                );

        intent.putExtra(
        "alarm_id",
        id
);

intent.putExtra(
        "trigger_at",
        triggerAt
);

intent.putExtra(
        "title",
        title
);

intent.putExtra(
        "body",
        body
);

intent.putExtra(
        "snooze_minutes",
        snoozeMinutes
);

intent.putExtra(
        "sound_enabled",
        soundEnabled
);

        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        id,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                                PendingIntent.FLAG_IMMUTABLE
                );

        AlarmManager.AlarmClockInfo alarmClockInfo =
        new AlarmManager.AlarmClockInfo(
                triggerAt,
                pendingIntent
        );

        alarmManager.setAlarmClock(
        alarmClockInfo,
        pendingIntent
        );
    }

    public static void cancelAllAlarms(
            Context context
    ) {

        AlarmManager alarmManager =
                context.getSystemService(
                        AlarmManager.class
                );

        if (alarmManager == null) {
            return;
        }

        String saved =
                context
                        .getSharedPreferences(
                                PREFS,
                                Context.MODE_PRIVATE
                        )
                        .getString(
                                KEY_ALARMS,
                                null
                        );

        if (saved != null) {

            try {

                JSONArray alarms =
                        new JSONArray(
                                saved
                        );

                for (
                        int i = 0;
                        i < alarms.length();
                        i++
                ) {

                    JSONObject alarm =
                            alarms.getJSONObject(
                                    i
                            );

                    int id =
                            alarm.getInt(
                                    "id"
                            );

                    cancelAlarmById(
                            context,
                            alarmManager,
                            id
                    );
                }

            } catch (Exception error) {

                android.util.Log.e(
                        "HydrationAlarm",
                        "Failed to cancel saved alarms",
                        error
                );
            }
        }

        context
                .getSharedPreferences(
                        PREFS,
                        Context.MODE_PRIVATE
                )
                .edit()
                .remove(
                        KEY_ALARMS
                )
                .apply();
    }

    private static void cancelAlarmById(
            Context context,
            AlarmManager alarmManager,
            int id
    ) {

        Intent intent =
                new Intent(
                        context,
                        HydrationAlarmReceiver.class
                );

        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        id,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                                PendingIntent.FLAG_IMMUTABLE
                );

        alarmManager.cancel(
                pendingIntent
        );

        pendingIntent.cancel();
    }

    public static void restoreAlarms(
            Context context
    ) {

        String saved =
                context
                        .getSharedPreferences(
                                PREFS,
                                Context.MODE_PRIVATE
                        )
                        .getString(
                                KEY_ALARMS,
                                null
                        );

        if (saved == null) {
            return;
        }

        try {

            JSONArray alarms =
                    new JSONArray(
                            saved
                    );

            JSONArray futureAlarms =
                    new JSONArray();

            long now =
                    System.currentTimeMillis();

            for (
                    int i = 0;
                    i < alarms.length();
                    i++
            ) {

                JSONObject alarm =
                        alarms.getJSONObject(
                                i
                        );

                if (
                        alarm.getLong("at") >
                                now
                ) {

                    futureAlarms.put(
                            alarm
                    );
                }
            }

            if (
                    futureAlarms.length() == 0
            ) {

                cancelAllAlarms(
                        context
                );

                return;
            }

            scheduleAlarms(
                    context,
                    futureAlarms
            );

        } catch (Exception error) {

            android.util.Log.e(
                    "HydrationAlarm",
                    "Failed to restore alarms",
                    error
            );
        }
    }
}