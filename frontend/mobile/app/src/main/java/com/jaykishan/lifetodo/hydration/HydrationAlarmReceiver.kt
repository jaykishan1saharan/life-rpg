package com.jaykishan.lifetodo.hydration

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.jaykishan.lifetodo.MainActivity
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

class HydrationAlarmReceiver : BroadcastReceiver() {

    companion object {

        private const val CHANNEL_ID =
            "hydration_reminders"

        private const val CHANNEL_NAME =
            "Hydration Reminders"

        private const val CHANNEL_DESCRIPTION =
            "Life Easy hydration reminders"

        private const val ACTION_REQUEST_CODE_BASE =
            8000

        private const val FULL_SCREEN_REQUEST_CODE =
            7001

        private val receiverScope =
            CoroutineScope(
                SupervisorJob() +
                    Dispatchers.IO
            )
    }

    override fun onReceive(
        context: Context,
        intent: Intent
    ) {

        when (intent.action) {

            HydrationAlarmScheduler.ACTION_FIRE -> {

                val reminderStyle =
                    intent.getStringExtra(
                        HydrationAlarmScheduler.EXTRA_REMINDER_STYLE
                    ) ?: "NOTIFICATION"

                if (
                    reminderStyle == "FULL_SCREEN"
                ) {
                
                    showHydrationNotification(
                        context.applicationContext,
                        intent,
                        true
                    )

                } else {
                
                    showHydrationNotification(
                        context.applicationContext,
                        intent,
                        false
                    )
                }

                /*
                 * The current alarm has fired.
                 * Schedule the following reminder now.
                 */

                HydrationAlarmScheduler
                    .scheduleNext(
                        context.applicationContext
                    )
            }

            HydrationAlarmScheduler.ACTION_DRANK,
            HydrationAlarmScheduler.ACTION_SNOOZE -> {

                handleReminderAction(
                    context.applicationContext,
                    intent
                )
            }
        }
    }

    private fun showHydrationNotification(
        context: Context,
        alarmIntent: Intent,
        fullScreenEnabled: Boolean
    ) {

        createNotificationChannel(
            context
        )

        /*
         * Android 13+ notification permission.
         */

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.TIRAMISU
        ) {

            if (
                context.checkSelfPermission(
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {

                return
            }
        }

        val triggerAt =
            alarmIntent.getLongExtra(
                HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                System.currentTimeMillis()
            )

        val alarmId =
            alarmIntent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_ALARM_ID,
                0
            )

        val soundEnabled =
            alarmIntent.getBooleanExtra(
                HydrationAlarmScheduler.EXTRA_SOUND_ENABLED,
                true
            )

        val snoozeMinutes =
            alarmIntent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                15
            )

        val amountMl =
            alarmIntent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                250
            )

        /*
         * =========================================================
         * NORMAL NOTIFICATION TAP
         * =========================================================
         */

        val openAppIntent =
            Intent(
                context,
                MainActivity::class.java
            ).apply {

                flags =
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

        val openAppPendingIntent =
            PendingIntent.getActivity(
                context,
                9100,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )

        /*
         * =========================================================
         * FULL-SCREEN ALARM
         * =========================================================
         */

        val fullScreenIntent =
            Intent(
                context,
                HydrationAlarmActivity::class.java
            ).apply {

                putExtra(
                    HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                    triggerAt
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_ALARM_ID,
                    alarmId
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                    amountMl
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_SOUND_ENABLED,
                    soundEnabled
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                    snoozeMinutes
                )

                flags =
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
            }

        val fullScreenPendingIntent =
            PendingIntent.getActivity(
                context,
                FULL_SCREEN_REQUEST_CODE,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )

        /*
         * =========================================================
         * DRANK ACTION
         * =========================================================
         */

        val drankIntent =
            Intent(
                context,
                HydrationAlarmReceiver::class.java
            ).apply {

                action =
                    HydrationAlarmScheduler.ACTION_DRANK

                putExtra(
                    HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                    triggerAt
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_ALARM_ID,
                    alarmId
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                    amountMl
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                    snoozeMinutes
                )
            }

        val drankPendingIntent =
            PendingIntent.getBroadcast(
                context,
                ACTION_REQUEST_CODE_BASE + 1,
                drankIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )

        /*
         * =========================================================
         * SNOOZE ACTION
         * =========================================================
         */

        val snoozeIntent =
            Intent(
                context,
                HydrationAlarmReceiver::class.java
            ).apply {

                action =
                    HydrationAlarmScheduler.ACTION_SNOOZE

                putExtra(
                    HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                    triggerAt
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_ALARM_ID,
                    alarmId
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                    amountMl
                )

                putExtra(
                    HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                    snoozeMinutes
                )
            }

        val snoozePendingIntent =
            PendingIntent.getBroadcast(
                context,
                ACTION_REQUEST_CODE_BASE + 2,
                snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )

        /*
         * =========================================================
         * BUILD NOTIFICATION
         * =========================================================
         */

        val builder =
            NotificationCompat.Builder(
                context,
                CHANNEL_ID
            )
                .setSmallIcon(
                    android.R.drawable.ic_dialog_info
                )
                .setContentTitle(
                    "💧 Time to Hydrate"
                )
                .setContentText(
                    "Drink some water and keep your streak alive!"
                )
                .setCategory(
                    NotificationCompat.CATEGORY_ALARM
                )
                .setPriority(
                    NotificationCompat.PRIORITY_MAX
                )
                .setVisibility(
                    NotificationCompat.VISIBILITY_PUBLIC
                )
                .setAutoCancel(true)
                .setContentIntent(
                    openAppPendingIntent
                )
                .addAction(
                    NotificationCompat.Action.Builder(
                        android.R.drawable.ic_input_add,
                        "Drink 250 ml",
                        drankPendingIntent
                    ).build()
                )
                .addAction(
                    NotificationCompat.Action.Builder(
                        android.R.drawable.ic_menu_recent_history,
                        "Snooze",
                        snoozePendingIntent
                    ).build()
                )

            if (fullScreenEnabled) {
            
                builder.setFullScreenIntent(
                    fullScreenPendingIntent,
                    true
                )
            }

        if (!soundEnabled) {

            builder.setSilent(true)
        }

        NotificationManagerCompat
            .from(context)
            .notify(
                HydrationAlarmScheduler.NOTIFICATION_ID,
                builder.build()
            )
    }

    /*
     * =========================================================
     * DRINK / SNOOZE FROM NOTIFICATION
     * =========================================================
     */

    private fun handleReminderAction(
        context: Context,
        intent: Intent
    ) {

        val pendingResult =
            goAsync()

        receiverScope.launch {

            try {

                val token =
                    FirebaseAuthManager.getIdToken()

                if (token == null) {
                    return@launch
                }

                val action =
                    when (intent.action) {

                        HydrationAlarmScheduler.ACTION_DRANK ->
                            "DRANK"

                        HydrationAlarmScheduler.ACTION_SNOOZE ->
                            "SNOOZE"

                        else ->
                            return@launch
                    }

                val amountMl =
                    intent.getIntExtra(
                        HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                        250
                    )

                val alarmId =
                    intent.getIntExtra(
                        HydrationAlarmScheduler.EXTRA_ALARM_ID,
                        0
                    )

                val triggerAt =
                    intent.getLongExtra(
                        HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                        0L
                    )

                val snoozeMinutes =
                    intent.getIntExtra(
                        HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                        15
                    )

                val body =
                    JSONObject().apply {

                        put(
                            "action",
                            action
                        )

                        put(
                            "amountMl",
                            amountMl
                        )

                        put(
                            "alarmId",
                            alarmId
                        )

                        put(
                            "triggerAt",
                            triggerAt
                        )

                        put(
                            "snoozeMinutes",
                            snoozeMinutes
                        )
                    }

                val result =
                    ApiClient.post(
                        path =
                            "/hydration/native-reminder-action",

                        token =
                            token,

                        body =
                            body
                    )

                if (result.isSuccess) {

                    NotificationManagerCompat
                        .from(context)
                        .cancel(
                            HydrationAlarmScheduler.NOTIFICATION_ID
                        )

                    HydrationAlarmScheduler
                        .scheduleNext(
                            context
                        )
                }

            } catch (_: Exception) {

                /*
                 * Keep notification/action available
                 * if network processing fails.
                 */

            } finally {

                pendingResult.finish()
            }
        }
    }

    /*
     * =========================================================
     * NOTIFICATION CHANNEL
     * =========================================================
     */

    private fun createNotificationChannel(
        context: Context
    ) {

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.O
        ) {

            val channel =
                NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {

                    description =
                        CHANNEL_DESCRIPTION

                    enableVibration(true)
                }

            val manager =
                context.getSystemService(
                    NotificationManager::class.java
                )

            manager.createNotificationChannel(
                channel
            )
        }
    }
}