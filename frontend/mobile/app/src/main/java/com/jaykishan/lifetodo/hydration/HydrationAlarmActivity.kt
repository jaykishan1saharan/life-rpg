package com.jaykishan.lifetodo.hydration

import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class HydrationAlarmActivity : ComponentActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    private var alarmId: Int = 0
    private var triggerAt: Long = 0L
    private var snoozeMinutes: Int = 15
    private var amountMl: Int = 250

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        /*
         * =========================================================
         * SHOW OVER LOCK SCREEN
         * =========================================================
         */

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }

        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        /*
         * =========================================================
         * READ ALARM DATA
         * =========================================================
         */

        alarmId =
            intent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_ALARM_ID,
                0
            )

        triggerAt =
            intent.getLongExtra(
                HydrationAlarmScheduler.EXTRA_TRIGGER_AT,
                System.currentTimeMillis()
            )

        snoozeMinutes =
            intent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_SNOOZE_MINUTES,
                15
            )

        amountMl =
            intent.getIntExtra(
                HydrationAlarmScheduler.EXTRA_AMOUNT_ML,
                250
            )

        /*
         * =========================================================
         * START ALARM
         * =========================================================
         */

        startAlarmSound()
        startVibration()

        /*
         * =========================================================
         * FULL-SCREEN UI
         * =========================================================
         */

        setContent {

            var isProcessing by remember {
                mutableStateOf(false)
            }

            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(
                            Color(0xFF071018)
                        )
                        .padding(24.dp),

                contentAlignment =
                    Alignment.Center
            ) {

                Column(
                    modifier =
                        Modifier.fillMaxWidth(),

                    horizontalAlignment =
                        Alignment.CenterHorizontally,

                    verticalArrangement =
                        Arrangement.Center
                ) {

                    Text(
                        text = "💧",
                        fontSize = 72.sp
                    )

                    Spacer(
                        modifier =
                            Modifier.height(24.dp)
                    )

                    Text(
                        text = "TIME TO HYDRATE",

                        fontSize = 30.sp,

                        fontWeight =
                            FontWeight.Bold,

                        color =
                            Color.White,

                        textAlign =
                            TextAlign.Center
                    )

                    Spacer(
                        modifier =
                            Modifier.height(12.dp)
                    )

                    Text(
                        text =
                            "Drink some water and keep your streak alive!",

                        fontSize = 16.sp,

                        color =
                            Color(0xFFB8C4CC),

                        textAlign =
                            TextAlign.Center
                    )

                    Spacer(
                        modifier =
                            Modifier.height(40.dp)
                    )

                    /*
                     * =================================================
                     * DRINK
                     * =================================================
                     */

                    Button(
                        enabled =
                            !isProcessing,

                        onClick = {

                            isProcessing = true

                            performAction(
                                action = "DRANK"
                            )
                        },

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .height(60.dp),

                        shape =
                            RoundedCornerShape(16.dp),

                        colors =
                            ButtonDefaults.buttonColors(
                                containerColor =
                                    Color(0xFF22D3EE),

                                contentColor =
                                    Color(0xFF071018)
                            )
                    ) {

                        Text(
                            text =
                                "💧 Drink $amountMl ml",

                            fontSize = 17.sp,

                            fontWeight =
                                FontWeight.Bold
                        )
                    }

                    Spacer(
                        modifier =
                            Modifier.height(14.dp)
                    )

                    /*
                     * =================================================
                     * SNOOZE
                     * =================================================
                     */

                    OutlinedButton(
                        enabled =
                            !isProcessing,

                        onClick = {

                            isProcessing = true

                            performAction(
                                action = "SNOOZE"
                            )
                        },

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .height(58.dp),

                        shape =
                            RoundedCornerShape(16.dp)
                    ) {

                        Text(
                            text =
                                "💤 Snooze $snoozeMinutes min",

                            fontSize = 16.sp,

                            fontWeight =
                                FontWeight.SemiBold,

                            color =
                                Color.White
                        )
                    }
                }
            }
        }
    }

    /*
     * =========================================================
     * ALARM SOUND
     * =========================================================
     */

    private fun startAlarmSound() {

        try {

            val alarmUri: Uri =
                android.provider.Settings
                    .System
                    .DEFAULT_ALARM_ALERT_URI

            mediaPlayer =
                MediaPlayer.create(
                    this,
                    alarmUri
                )

            mediaPlayer?.apply {

                isLooping = true

                setVolume(
                    1.0f,
                    1.0f
                )

                start()
            }

        } catch (_: Exception) {

            mediaPlayer = null
        }
    }

    /*
     * =========================================================
     * VIBRATION
     * =========================================================
     */

    private fun startVibration() {

        try {

            vibrator =
                if (
                    Build.VERSION.SDK_INT >=
                    Build.VERSION_CODES.S
                ) {

                    val manager =
                        getSystemService(
                            VibratorManager::class.java
                        )

                    manager.defaultVibrator

                } else {

                    @Suppress("DEPRECATION")
                    getSystemService(
                        VIBRATOR_SERVICE
                    ) as Vibrator
                }

            val pattern =
                longArrayOf(
                    0,
                    700,
                    500,
                    700,
                    1000
                )

            if (
                Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.O
            ) {

                vibrator?.vibrate(
                    VibrationEffect.createWaveform(
                        pattern,
                        0
                    )
                )

            } else {

                @Suppress("DEPRECATION")
                vibrator?.vibrate(
                    pattern,
                    0
                )
            }

        } catch (_: Exception) {
        }
    }

    /*
     * =========================================================
     * DRINK / SNOOZE ACTION
     * =========================================================
     */

    private fun performAction(
        action: String
    ) {

        /*
         * Stop ringing immediately.
         */

        stopAlarm()

        CoroutineScope(
            Dispatchers.IO
        ).launch {

            try {

                val token =
                    FirebaseAuthManager
                        .getIdToken()

                if (token != null) {

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

                        HydrationAlarmScheduler
                            .scheduleNext(
                                this@HydrationAlarmActivity
                            )
                    }
                }

            } catch (_: Exception) {
            }

            runOnUiThread {

                finish()
            }
        }
    }

    /*
     * =========================================================
     * STOP SOUND + VIBRATION
     * =========================================================
     */

    private fun stopAlarm() {

        try {
            mediaPlayer?.stop()
        } catch (_: Exception) {
        }

        try {
            mediaPlayer?.release()
        } catch (_: Exception) {
        }

        mediaPlayer = null

        try {
            vibrator?.cancel()
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {

        stopAlarm()

        super.onDestroy()
    }
}