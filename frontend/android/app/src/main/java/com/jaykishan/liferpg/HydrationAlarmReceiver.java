package com.jaykishan.liferpg;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class HydrationAlarmReceiver
        extends BroadcastReceiver {

    @Override
    public void onReceive(
            Context context,
            Intent intent
    ) {

        int alarmId =
                intent.getIntExtra(
                        "alarm_id",
                        0
                );

        long triggerAt =
        intent.getLongExtra(
                "trigger_at",
                0L
        );

        String title =
                intent.getStringExtra(
                        "title"
                );

        String body =
                intent.getStringExtra(
                        "body"
                );

        int snoozeMinutes =
                intent.getIntExtra(
                        "snooze_minutes",
                        15
                );

        boolean soundEnabled =
                intent.getBooleanExtra(
                        "sound_enabled",
                        true
                );

        Intent serviceIntent =
                new Intent(
                        context,
                        HydrationAlarmService.class
                );

        serviceIntent.setAction(
                HydrationAlarmService.ACTION_START
        );

        serviceIntent.putExtra(
                "alarm_id",
                alarmId
        );

        serviceIntent.putExtra(
        "trigger_at",
        triggerAt
        );

        serviceIntent.putExtra(
                "title",
                title
        );

        serviceIntent.putExtra(
                "body",
                body
        );

        serviceIntent.putExtra(
                "snooze_minutes",
                snoozeMinutes
        );

        serviceIntent.putExtra(
                "sound_enabled",
                soundEnabled
        );

        /*
         * AlarmManager is an allowed path for starting
         * a foreground service from the background.
         */
        ContextCompat.startForegroundService(
                context,
                serviceIntent
        );
    }
}