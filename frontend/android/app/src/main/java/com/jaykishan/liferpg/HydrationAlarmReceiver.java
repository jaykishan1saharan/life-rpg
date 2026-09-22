package com.jaykishan.liferpg;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class HydrationAlarmReceiver
        extends BroadcastReceiver {

    @Override
    public void onReceive(
            Context context,
            Intent intent
    ) {

        HydrationAlarmScheduler
                .ensureNotificationChannel(
                        context
                );

        int alarmId =
                intent.getIntExtra(
                        "alarm_id",
                        0
                );

        String title =
                intent.getStringExtra(
                        "title"
                );

        String body =
                intent.getStringExtra(
                        "body"
                );

        if (title == null) {
            title =
                    "💧 TIME TO HYDRATE";
        }

        if (body == null) {
            body =
                    "Your body is waiting for its next water refill.";
        }

        Intent openIntent =
                new Intent(
                        context,
                        MainActivity.class
                );

        openIntent.putExtra(
                "hydrationAlarmId",
                alarmId
        );

        openIntent.setFlags(
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent contentIntent =
                PendingIntent.getActivity(
                        context,
                        alarmId,
                        openIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                        PendingIntent.FLAG_IMMUTABLE
                );

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(
                        context,
                        HydrationAlarmScheduler.CHANNEL_ID
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
                .setPriority(
                        NotificationCompat.PRIORITY_HIGH
                )
                .setCategory(
                        NotificationCompat.CATEGORY_REMINDER
                )
                .setAutoCancel(true)
                .setContentIntent(
                        contentIntent
                )
                .setVibrate(
                        new long[]{
                                0,
                                300,
                                200,
                                300
                        }
                );

        NotificationManagerCompat
                .from(context)
                .notify(
                        alarmId,
                        builder.build()
                );
    }
}