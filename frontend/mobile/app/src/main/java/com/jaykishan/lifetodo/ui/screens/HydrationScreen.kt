package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone


/*
 * =========================================================
 * HYDRATION UI MODELS
 * =========================================================
 */

private data class WaterLogUi(
    val time: String,
    val amountMl: Int
)

private data class NextReminderUi(
    val reminderTime: String,
    val countdownSeconds: Int,
    val source: String
)


/*
 * =========================================================
 * HYDRATION SCREEN
 * =========================================================
 */

@Composable
fun HydrationScreen(
    paddingValues: PaddingValues,
    onOpenSettings: () -> Unit
) {

    /*
     * -----------------------------------------------------
     * STATE
     * -----------------------------------------------------
     */

    var waterMl by remember {
        mutableStateOf(0)
    }

    var goalMl by remember {
        mutableStateOf(0)
    }

    var progress by remember {
        mutableStateOf(0f)
    }

    var waterLogs by remember {
        mutableStateOf<List<WaterLogUi>>(emptyList())
    }

    var nextReminder by remember {
        mutableStateOf<NextReminderUi?>(null)
    }

    var countdownSeconds by remember {
        mutableStateOf(0)
    }

    var isLoading by remember {
        mutableStateOf(true)
    }

    var isAddingWater by remember {
        mutableStateOf(false)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    val scope = rememberCoroutineScope()


    /*
     * -----------------------------------------------------
     * LOAD HYDRATION DATA
     * -----------------------------------------------------
     */

    suspend fun loadHydrationData(
        showLoading: Boolean = true
    ) {

        if (showLoading) {
            isLoading = true
        }

        errorMessage = null

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            isLoading = false

            errorMessage =
                "User is not logged in"

            return
        }

        try {

            /*
             * =================================================
             * GET TODAY'S HYDRATION
             * =================================================
             */

            val todayResult =
                ApiClient.get(
                    path = "/hydration/today",
                    token = token
                )

            if (todayResult.isFailure) {

                throw todayResult.exceptionOrNull()
                    ?: Exception(
                        "Unable to load hydration data"
                    )
            }

            val todayResponse =
                todayResult.getOrThrow()

            if (todayResponse.isBlank()) {

                throw Exception(
                    "Empty hydration response"
                )
            }

            val todayJson =
                JSONObject(todayResponse)


            /*
             * TOTAL WATER
             */

            waterMl =
                todayJson.optInt(
                    "totalMl",
                    0
                )


            /*
             * DAILY GOAL
             */

            goalMl =
                todayJson.optInt(
                    "goalMl",
                    0
                )


            /*
             * PROGRESS
             */

            val progressPercent =
                todayJson.optInt(
                    "progressPercent",
                    0
                )

            progress =
                (
                    progressPercent / 100f
                ).coerceIn(
                    0f,
                    1f
                )


            /*
             * TODAY'S LOGS
             */

            val logsArray =
                todayJson.optJSONArray(
                    "logs"
                )

            waterLogs =
                parseWaterLogs(
                    logsArray
                )


            /*
             * =================================================
             * GET NEXT REMINDER
             * =================================================
             *
             * Reminder failure should NOT break
             * the hydration screen.
             */

            val reminderResult =
                ApiClient.get(
                    path = "/hydration/next-reminder",
                    token = token
                )

            if (reminderResult.isSuccess) {

                val reminderResponse =
                    reminderResult.getOrNull()
                        ?: ""

                if (
                    reminderResponse.isBlank() ||
                    reminderResponse == "null"
                ) {

                    nextReminder = null

                    countdownSeconds = 0

                } else {

                    try {

                        val reminderJson =
                            JSONObject(
                                reminderResponse
                            )

                        val reminderTime =
                            reminderJson.optString(
                                "reminderTime",
                                ""
                            )

                        val seconds =
                            reminderJson.optInt(
                                "countdownSeconds",
                                0
                            )

                        val source =
                            reminderJson.optString(
                                "source",
                                "HYDRATION"
                            )

                        if (
                            reminderTime.isBlank()
                        ) {

                            nextReminder = null
                            countdownSeconds = 0

                        } else {

                            nextReminder =
                                NextReminderUi(
                                    reminderTime =
                                        reminderTime,

                                    countdownSeconds =
                                        seconds,

                                    source =
                                        source
                                )

                            countdownSeconds =
                                seconds.coerceAtLeast(0)
                        }

                    } catch (_: Exception) {

                        nextReminder = null
                        countdownSeconds = 0
                    }
                }

            } else {

                nextReminder = null
                countdownSeconds = 0
            }

        } catch (error: Exception) {

            errorMessage =
                error.message
                    ?.takeIf {
                        it.isNotBlank()
                    }
                    ?: "Unable to load hydration data"

        } finally {

            isLoading = false
        }
    }


    /*
     * -----------------------------------------------------
     * INITIAL LOAD
     * -----------------------------------------------------
     */

    LaunchedEffect(Unit) {

        loadHydrationData()
    }


    /*
     * -----------------------------------------------------
     * LIVE COUNTDOWN
     * -----------------------------------------------------
     */

    LaunchedEffect(
        nextReminder?.reminderTime
    ) {

        while (
            countdownSeconds > 0
        ) {

            delay(1000)

            countdownSeconds =
                (
                    countdownSeconds - 1
                ).coerceAtLeast(0)
        }

        /*
         * Countdown finished.
         *
         * Ask backend for the next reminder.
         */

        if (
            nextReminder != null &&
            countdownSeconds == 0
        ) {

            loadHydrationData(
                showLoading = false
            )
        }
    }


    /*
     * -----------------------------------------------------
     * ADD WATER
     * -----------------------------------------------------
     */

    fun addWater(
        amount: Int
    ) {

        /*
         * Prevent multiple API requests
         * from rapid button taps.
         */

        if (isAddingWater) {
            return
        }

        scope.launch {

            isAddingWater = true
            errorMessage = null

            try {

                val token =
                    FirebaseAuthManager.getIdToken()

                if (token == null) {

                    errorMessage =
                        "User is not logged in"

                    return@launch
                }


                /*
                 * REQUEST BODY
                 */

                val body =
                    JSONObject().apply {

                        put(
                            "amountMl",
                            amount
                        )

                        put(
                            "source",
                            "QUICK_ADD"
                        )
                    }


                /*
                 * POST WATER LOG
                 */

                val result =
                    ApiClient.post(
                        path = "/hydration/log",
                        token = token,
                        body = body
                    )


                if (result.isFailure) {

                    throw result.exceptionOrNull()
                        ?: Exception(
                            "Failed to log water"
                        )
                }


                /*
                 * IMPORTANT:
                 *
                 * Never manually increase waterMl.
                 *
                 * Reload the actual backend state.
                 */

                loadHydrationData(
                    showLoading = false
                )

            } catch (error: Exception) {

                errorMessage =
                    error.message
                        ?.takeIf {
                            it.isNotBlank()
                        }
                        ?: "Failed to log water"

            } finally {

                isAddingWater = false
            }
        }
    }


    /*
     * =====================================================
     * UI
     * =====================================================
     */

    LazyColumn(

        modifier =
            Modifier
                .fillMaxWidth()
                .padding(paddingValues),

        contentPadding =
            PaddingValues(
                start = 20.dp,
                top = 20.dp,
                end = 20.dp,
                bottom = 24.dp
            ),

        verticalArrangement =
            Arrangement.spacedBy(
                16.dp
            )

    ) {


        /*
         * -------------------------------------------------
         * HEADER
         * -------------------------------------------------
         */

        item {

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Column(
            modifier = Modifier.weight(1f)
        ) {

            Text(
                text = "Hydration",
                fontSize = 30.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(
                modifier = Modifier.height(4.dp)
            )

            Text(
                text = "Stay hydrated. Keep your energy up.",
                fontSize = 14.sp,
                color = Color(0xFF77747F)
            )
        }

        IconButton(
            onClick = onOpenSettings
        ) {

            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Hydration Settings"
            )
        }
    }
}


        /*
         * -------------------------------------------------
         * ERROR
         * -------------------------------------------------
         */

        if (
            errorMessage != null
        ) {

            item {

                Text(
                    text =
                        errorMessage!!,

                    fontSize = 12.sp,

                    color =
                        Color(0xFFD32F2F)
                )
            }
        }


        /*
         * -------------------------------------------------
         * MAIN WATER CARD
         * -------------------------------------------------
         */

        item {

            Card(

                modifier =
                    Modifier.fillMaxWidth(),

                shape =
                    RoundedCornerShape(26.dp),

                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            Color(0xFF2196F3)
                    )

            ) {

                Column(

                    modifier =
                        Modifier.padding(22.dp)

                ) {

                    Row(

                        modifier =
                            Modifier.fillMaxWidth(),

                        verticalAlignment =
                            Alignment.CenterVertically

                    ) {

                        Column(

                            modifier =
                                Modifier.weight(1f)

                        ) {

                            Text(
                                text = "TODAY",

                                fontSize = 12.sp,

                                fontWeight =
                                    FontWeight.Bold,

                                color =
                                    Color.White.copy(
                                        alpha = 0.75f
                                    )
                            )

                            Spacer(
                                modifier =
                                    Modifier.height(5.dp)
                            )

                            Text(
                                text =
                                    "${waterMl} ml",

                                fontSize = 32.sp,

                                fontWeight =
                                    FontWeight.Bold,

                                color =
                                    Color.White
                            )

                            Text(
                                text =
                                    "of ${goalMl} ml goal",

                                fontSize = 13.sp,

                                color =
                                    Color.White.copy(
                                        alpha = 0.8f
                                    )
                            )
                        }


                        Icon(

                            imageVector =
                                Icons.Default.WaterDrop,

                            contentDescription =
                                null,

                            tint =
                                Color.White,

                            modifier =
                                Modifier.size(52.dp)
                        )
                    }


                    Spacer(
                        modifier =
                            Modifier.height(20.dp)
                    )


                    LinearProgressIndicator(

                        progress = {
                            progress
                        },

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .height(9.dp),

                        color =
                            Color.White,

                        trackColor =
                            Color.White.copy(
                                alpha = 0.22f
                            )
                    )


                    Spacer(
                        modifier =
                            Modifier.height(8.dp)
                    )


                    Text(

                        text =
                            "${(progress * 100).toInt()}% of today's goal",

                        color =
                            Color.White.copy(
                                alpha = 0.8f
                            ),

                        fontSize = 12.sp
                    )
                }
            }
        }


        /*
         * -------------------------------------------------
         * QUICK ADD TITLE
         * -------------------------------------------------
         */

        item {

            Text(
                text = "Quick Add",

                fontSize = 20.sp,

                fontWeight =
                    FontWeight.Bold
            )
        }


        /*
         * -------------------------------------------------
         * QUICK ADD BUTTONS
         * -------------------------------------------------
         */

        item {

            Row(

                modifier =
                    Modifier.fillMaxWidth(),

                horizontalArrangement =
                    Arrangement.spacedBy(
                        10.dp
                    )

            ) {

                WaterButton(

                    amount = 250,

                    modifier =
                        Modifier.weight(1f),

                    enabled =
                        !isAddingWater

                ) {

                    addWater(250)
                }


                WaterButton(

                    amount = 350,

                    modifier =
                        Modifier.weight(1f),

                    enabled =
                        !isAddingWater

                ) {

                    addWater(350)
                }


                WaterButton(

                    amount = 500,

                    modifier =
                        Modifier.weight(1f),

                    enabled =
                        !isAddingWater

                ) {

                    addWater(500)
                }
            }
        }


        /*
         * -------------------------------------------------
         * NEXT REMINDER
         * -------------------------------------------------
         */

        item {

            Card(

                modifier =
                    Modifier.fillMaxWidth(),

                shape =
                    RoundedCornerShape(20.dp)

            ) {

                Row(

                    modifier =
                        Modifier.padding(18.dp),

                    verticalAlignment =
                        Alignment.CenterVertically

                ) {

                    Card(

                        modifier =
                            Modifier.size(44.dp),

                        shape =
                            CircleShape,

                        colors =
                            CardDefaults.cardColors(
                                containerColor =
                                    Color(0xFFE3F2FD)
                            )

                    ) {

                        Icon(

                            imageVector =
                                Icons.Default.Schedule,

                            contentDescription =
                                null,

                            tint =
                                Color(0xFF2196F3),

                            modifier =
                                Modifier.padding(11.dp)
                        )
                    }


                    Spacer(
                        modifier =
                            Modifier.size(12.dp)
                    )


                    Column(

                        modifier =
                            Modifier.weight(1f)

                    ) {

                        Text(
                            text =
                                "Next reminder",

                            fontWeight =
                                FontWeight.Bold
                        )

                        Spacer(
                            modifier =
                                Modifier.height(3.dp)
                        )

                        Text(

                            text =
                                formatCountdown(
                                    countdownSeconds,
                                    nextReminder
                                ),

                            fontSize = 13.sp,

                            color =
                                Color(0xFF77747F)
                        )
                    }


                    Text(

                        text =
                            if (
                                nextReminder != null
                            ) {
                                "ON"
                            } else {
                                "OFF"
                            },

                        fontSize = 11.sp,

                        fontWeight =
                            FontWeight.Bold,

                        color =
                            Color(0xFF2196F3)
                    )
                }
            }
        }


        /*
         * -------------------------------------------------
         * TODAY'S WATER TITLE
         * -------------------------------------------------
         */

        item {

            Text(
                text = "Today's Water",

                fontSize = 20.sp,

                fontWeight =
                    FontWeight.Bold
            )
        }


        /*
         * -------------------------------------------------
         * WATER HISTORY
         * -------------------------------------------------
         */

        if (
            waterLogs.isEmpty()
        ) {

            item {

                Text(

                    text =
                        if (isLoading) {
                            "Loading today's water..."
                        } else {
                            "No water logged today."
                        },

                    fontSize = 13.sp,

                    color =
                        Color(0xFF77747F)
                )
            }

        } else {

            items(

                count =
                    waterLogs.size,

                key = { index ->

                    val log =
                        waterLogs[index]

                    "${log.time}-${log.amountMl}-$index"
                }

            ) { index ->

                val log =
                    waterLogs[index]

                WaterHistoryItem(

                    time =
                        log.time,

                    amount =
                        "${log.amountMl} ml"
                )
            }
        }
    }
}


/*
 * =========================================================
 * WATER BUTTON
 * =========================================================
 */

@Composable
private fun WaterButton(
    amount: Int,
    modifier: Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {

    OutlinedButton(

        modifier =
            modifier,

        onClick =
            onClick,

        enabled =
            enabled,

        shape =
            RoundedCornerShape(14.dp)

    ) {

        Icon(

            imageVector =
                Icons.Default.Add,

            contentDescription =
                null,

            modifier =
                Modifier.size(16.dp)
        )


        Spacer(
            modifier =
                Modifier.size(3.dp)
        )


        Text(

            text =
                "${amount}ml",

            fontSize = 12.sp
        )
    }
}


/*
 * =========================================================
 * WATER HISTORY ITEM
 * =========================================================
 */

@Composable
private fun WaterHistoryItem(
    time: String,
    amount: String
) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(18.dp)

    ) {

        Row(

            modifier =
                Modifier.padding(16.dp),

            verticalAlignment =
                Alignment.CenterVertically

        ) {

            Card(

                modifier =
                    Modifier.size(40.dp),

                shape =
                    CircleShape,

                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            Color(0xFFE3F2FD)
                    )

            ) {

                Icon(

                    imageVector =
                        Icons.Default.Check,

                    contentDescription =
                        null,

                    tint =
                        Color(0xFF2196F3),

                    modifier =
                        Modifier.padding(10.dp)
                )
            }


            Spacer(
                modifier =
                    Modifier.size(12.dp)
            )


            Column(

                modifier =
                    Modifier.weight(1f)

            ) {

                Text(

                    text =
                        amount,

                    fontWeight =
                        FontWeight.Bold
                )


                Text(

                    text =
                        time,

                    fontSize = 12.sp,

                    color =
                        Color(0xFF77747F)
                )
            }


            Text(

                text =
                    "Logged",

                fontSize = 11.sp,

                fontWeight =
                    FontWeight.Bold,

                color =
                    Color(0xFF2196F3)
            )
        }
    }
}


/*
 * =========================================================
 * PARSE WATER LOGS
 * =========================================================
 */

private fun parseWaterLogs(
    array: JSONArray?
): List<WaterLogUi> {

    if (
        array == null ||
        array.length() == 0
    ) {
        return emptyList()
    }

    val result =
        mutableListOf<WaterLogUi>()


    for (
        index in 0 until array.length()
    ) {

        try {

            val item =
                array.getJSONObject(index)


            val amount =
                item.optInt(
                    "amount_ml",
                    0
                )


            val loggedAt =
                item.optString(
                    "logged_at",
                    ""
                )


            if (amount > 0) {

                result.add(

                    WaterLogUi(

                        time =
                            formatLogTime(
                                loggedAt
                            ),

                        amountMl =
                            amount
                    )
                )
            }

        } catch (_: Exception) {

            /*
             * Ignore malformed log entry.
             */
        }
    }


    return result
}


/*
 * =========================================================
 * FORMAT LOG TIME
 * =========================================================
 */

private fun formatLogTime(
    value: String
): String {

    if (value.isBlank()) {
        return "--:--"
    }


    /*
     * Try ISO timestamp formats first.
     */

    val inputFormats =
        listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX"
        )


    for (
        pattern in inputFormats
    ) {

        try {

            val normalized =
                if (
                    value.endsWith("Z")
                ) {

                    value.dropLast(1) +
                        "+0000"

                } else {

                    value
                }


            val inputFormat =
                SimpleDateFormat(
                    pattern,
                    Locale.US
                )


            inputFormat.timeZone =
                TimeZone.getTimeZone(
                    "UTC"
                )


            val date =
                inputFormat.parse(
                    normalized
                )


            if (date != null) {

                /*
                 * Use device/local timezone
                 * for display.
                 */

                val outputFormat =
                    SimpleDateFormat(
                        "hh:mm a",
                        Locale.US
                    )


                return outputFormat.format(
                    date
                )
            }

        } catch (_: Exception) {
            // Try next format.
        }
    }


    /*
     * Fallback:
     * extract useful time from the string.
     */

    return try {

        val timePart =
            value
                .substringAfter(
                    "T",
                    missingDelimiterValue = value
                )
                .substringBefore(
                    "+",
                    missingDelimiterValue = value
                )
                .substringBefore(
                    "Z",
                    missingDelimiterValue = value
                )


        if (
            timePart.length >= 5 &&
            timePart.contains(":")
        ) {

            timePart.substring(
                0,
                5
            )

        } else {

            value
        }

    } catch (_: Exception) {

        value
    }
}


/*
 * =========================================================
 * NEXT REMINDER TEXT
 * =========================================================
 */

private fun formatCountdown(
    seconds: Int,
    reminder: NextReminderUi?
): String {

    if (reminder == null) {

        return "No upcoming reminder"
    }


    val safeSeconds =
        seconds.coerceAtLeast(0)


    if (safeSeconds < 60) {

        return "In less than a minute"
    }


    val minutes =
        safeSeconds / 60


    val remainingSeconds =
        safeSeconds % 60


    if (minutes < 60) {

        return if (
            remainingSeconds == 0
        ) {

            "In ${minutes} minutes"

        } else {

            "In ${minutes}m ${remainingSeconds}s"
        }
    }


    val hours =
        minutes / 60


    val remainingMinutes =
        minutes % 60


    return if (
        remainingMinutes == 0
    ) {

        "In ${hours}h"

    } else {

        "In ${hours}h ${remainingMinutes}m"
    }
}