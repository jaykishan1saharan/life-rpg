package com.jaykishan.lifetodo.hydration

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

object HydrationAlarmScheduler {

    const val ACTION_FIRE =
        "com.jaykishan.lifetodo.hydration.FIRE"

    const val ACTION_DRANK =
        "com.jaykishan.lifetodo.hydration.DRANK"

    const val ACTION_SNOOZE =
        "com.jaykishan.lifetodo.hydration.SNOOZE"

    const val EXTRA_TRIGGER_AT =
        "triggerAt"

    const val EXTRA_ALARM_ID =
        "alarmId"

    const val EXTRA_SOUND_ENABLED =
        "soundEnabled"
    
    const val EXTRA_REMINDER_STYLE =
        "reminderStyle"

    const val EXTRA_SNOOZE_MINUTES =
        "snoozeMinutes"

    const val EXTRA_AMOUNT_ML =
        "amountMl"

    const val NOTIFICATION_ID = 9001

    private const val REQUEST_CODE = 7001

    private val scope =
        CoroutineScope(
            SupervisorJob() + Dispatchers.IO
        )

    fun scheduleNext(context: Context) {

        scope.launch {

            scheduleNextInternal(
                context.applicationContext
            )
        }
    }

    fun cancel(context: Context) {

        val alarmManager =
            context.getSystemService(
                Context.ALARM_SERVICE
            ) as AlarmManager

        val pendingIntent =
            PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                Intent(
                    context,
                    HydrationAlarmReceiver::class.java
                ).apply {
                    action = ACTION_FIRE
                },
                PendingIntent.FLAG_NO_CREATE or
                    PendingIntent.FLAG_IMMUTABLE
            )

        if (pendingIntent != null) {

            alarmManager.cancel(
                pendingIntent
            )

            pendingIntent.cancel()
        }
    }

    private suspend fun scheduleNextInternal(
        context: Context
    ) {

        val token =
            FirebaseAuthManager.getIdToken()
                ?: return

        try {

            /*
             * =====================================================
             * GET HYDRATION SETTINGS
             * =====================================================
             */

            val hydrationResult =
                ApiClient.get(
                    path = "/hydration",
                    token = token
                )

            if (hydrationResult.isFailure) {

                return
            }

            val hydrationResponse =
                hydrationResult.getOrNull()
                    ?: return

            if (hydrationResponse.isBlank()) {

                return
            }

            val hydrationJson =
                JSONObject(
                    hydrationResponse
                )

            val settings =
                hydrationJson.optJSONObject(
                    "settings"
                )

            if (settings == null) {

                cancel(context)

                return
            }

            val notificationsEnabled =
                settings.optBoolean(
                    "notifications_enabled",
                    true
                )

            val isActive =
                settings.optBoolean(
                    "is_active",
                    true
                )

            val soundEnabled =
                settings.optBoolean(
                    "sound_enabled",
                    true
                )

            val reminderStyle =
                settings.optString(
                    "reminder_style",
                    "NOTIFICATION"
                )

            val snoozeMinutes =
                settings.optInt(
                    "snooze_minutes",
                    15
                )

            if (!notificationsEnabled || !isActive) {

                cancel(context)

                return
            }

            /*
             * =====================================================
             * GET NEXT REMINDER
             * =====================================================
             */

            val nextResult =
                ApiClient.get(
                    path = "/hydration/next-reminder",
                    token = token
                )

            if (nextResult.isFailure) {

                return
            }

            val nextResponse =
                nextResult.getOrNull()
                    ?: return

            if (
                nextResponse.isBlank() ||
                nextResponse == "null"
            ) {

                cancel(context)

                return
            }

            val nextJson =
                JSONObject(
                    nextResponse
                )

            val countdownSeconds =
                nextJson.optLong(
                    "countdownSeconds",
                    0L
                )

            if (countdownSeconds < 0) {

                return
            }

            /*
             * Prevent an accidental immediate
             * alarm if backend returns 0.
             */

            val safeCountdown =
                countdownSeconds
                    .coerceAtLeast(2L)

            val triggerAt =
                System.currentTimeMillis() +
                    (safeCountdown * 1000L)

            val alarmId =
                nextJson
                    .optString(
                        "reminderKey",
                        "hydration"
                    )
                    .hashCode()

            scheduleAlarm(
                context = context,
                triggerAt = triggerAt,
                alarmId = alarmId,
                soundEnabled = soundEnabled,
                reminderStyle = reminderStyle,
                snoozeMinutes = snoozeMinutes
            )

        } catch (_: Exception) {

            // Do not crash the app because
            // reminder scheduling failed.
        }
    }

    private fun scheduleAlarm(
        context: Context,
        triggerAt: Long,
        alarmId: Int,
        soundEnabled: Boolean,
        reminderStyle: String,
        snoozeMinutes: Int
    ) {

        val alarmManager =
            context.getSystemService(
                Context.ALARM_SERVICE
            ) as AlarmManager

        /*
         * Cancel previous "next reminder".
         */

        cancel(context)

        val intent =
            Intent(
                context,
                HydrationAlarmReceiver::class.java
            ).apply {

                action = ACTION_FIRE

                putExtra(
                    EXTRA_TRIGGER_AT,
                    triggerAt
                )

                putExtra(
                    EXTRA_ALARM_ID,
                    alarmId
                )

                putExtra(
                    EXTRA_SOUND_ENABLED,
                    soundEnabled
                )

                putExtra(
                    EXTRA_REMINDER_STYLE,
                    reminderStyle
                )

                putExtra(
                    EXTRA_SNOOZE_MINUTES,
                    snoozeMinutes
                )
            }

        val pendingIntent =
            PendingIntent.getBroadcast(
                context,
                REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )

        /*
         * Android 12+ requires special access
         * for exact alarms.
         */

        if (
            Build.VERSION.SDK_INT >=
            Build.VERSION_CODES.S
        ) {

            if (
                alarmManager.canScheduleExactAlarms()
            ) {

                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
                )

            } else {

                /*
                 * Graceful fallback.
                 *
                 * Once the user grants
                 * "Alarms & reminders", the
                 * BootReceiver / permission receiver
                 * will reschedule it exactly.
                 */

                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAt,
                    pendingIntent
                )
            }

        } else {

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAt,
                pendingIntent
            )
        }
    }
}