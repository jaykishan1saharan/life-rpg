package com.jaykishan.lifetodo.hydration

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class HydrationBootReceiver : BroadcastReceiver() {

    override fun onReceive(
        context: Context,
        intent: Intent
    ) {

        when (intent.action) {

            Intent.ACTION_BOOT_COMPLETED -> {

                HydrationAlarmScheduler
                    .scheduleNext(
                        context.applicationContext
                    )
            }

            AlarmManager
                .ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED -> {

                if (
                    Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.S
                ) {

                    val alarmManager =
                        context.getSystemService(
                            Context.ALARM_SERVICE
                        ) as AlarmManager

                    if (
                        alarmManager
                            .canScheduleExactAlarms()
                    ) {

                        HydrationAlarmScheduler
                            .scheduleNext(
                                context.applicationContext
                            )
                    }
                }
            }
        }
    }
}