package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.TimeZone

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.jaykishan.lifetodo.hydration.HydrationAlarmScheduler

@Composable
fun HydrationSettingsScreen(
    paddingValues: PaddingValues,
    onBack: () -> Unit
) {

    // =========================================================
    // STATE
    // =========================================================

    var isLoading by remember {
        mutableStateOf(true)
    }

    var isSaving by remember {
        mutableStateOf(false)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    var successMessage by remember {
        mutableStateOf<String?>(null)
    }

    var dailyGoalMl by remember {
        mutableStateOf("2500")
    }

    var reminderMode by remember {
        mutableStateOf("SMART")
    }

    var intervalMinutes by remember {
        mutableStateOf("60")
    }

    var wakeTime by remember {
        mutableStateOf("08:00")
    }

    var sleepTime by remember {
        mutableStateOf("23:00")
    }

    var snoozeMinutes by remember {
        mutableStateOf("15")
    }

    var notificationsEnabled by remember {
        mutableStateOf(true)
    }

    var soundEnabled by remember {
        mutableStateOf(true)
    }

    var inAppEnabled by remember {
        mutableStateOf(true)
    }

    var reminderStyle by remember {
        mutableStateOf("NOTIFICATION")
    }

    val customReminderTimes = remember {
        mutableStateListOf<String>()
    }

    val scope = rememberCoroutineScope()

    val context = LocalContext.current

    val notificationPermissionLauncher =
        rememberLauncherForActivityResult(
            contract =
                ActivityResultContracts.RequestPermission()
        ) {
            /*
             * Alarm is already scheduled.
             * Permission result is handled by Android.
             */
        }


    // =========================================================
    // LOAD SETTINGS
    // =========================================================

    LaunchedEffect(Unit) {

        isLoading = true
        errorMessage = null

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            errorMessage =
                "User is not logged in"

            isLoading = false

            return@LaunchedEffect
        }

        val result =
            ApiClient.get(
                path = "/hydration",
                token = token
            )

        result.fold(

            onSuccess = { response ->

                try {

                    val json =
                        JSONObject(response)

                    val settings =
                        json.optJSONObject("settings")

                    if (settings != null) {

                        dailyGoalMl =
                            settings.optInt(
                                "daily_goal_ml",
                                2500
                            ).toString()

                        reminderMode =
                            settings.optString(
                                "reminder_mode",
                                "SMART"
                            )

                        intervalMinutes =
                            settings.optInt(
                                "interval_minutes",
                                60
                            ).toString()

                        wakeTime =
                            settings.optString(
                                "wake_time",
                                "08:00"
                            ).take(5)

                        sleepTime =
                            settings.optString(
                                "sleep_time",
                                "23:00"
                            ).take(5)

                        snoozeMinutes =
                            settings.optInt(
                                "snooze_minutes",
                                15
                            ).toString()

                        notificationsEnabled =
                            settings.optBoolean(
                                "notifications_enabled",
                                true
                            )

                        soundEnabled =
                            settings.optBoolean(
                                "sound_enabled",
                                true
                            )

                        inAppEnabled =
                            settings.optBoolean(
                                "in_app_enabled",
                                true
                            )

                        reminderStyle =
                            settings.optString(
                                "reminder_style",
                                "NOTIFICATION"
                            )
                    }

                    customReminderTimes.clear()

                    val reminderTimes =
                        json.optJSONArray(
                            "reminderTimes"
                        )

                    if (reminderTimes != null) {

                        for (
                            index in
                            0 until reminderTimes.length()
                        ) {

                            customReminderTimes.add(
                                reminderTimes
                                    .optString(index)
                                    .take(5)
                            )
                        }
                    }

                } catch (error: Exception) {

                    errorMessage =
                        "Invalid hydration settings response"
                }

                isLoading = false
            },

            onFailure = { error ->

                errorMessage =
                    error.message
                        ?: "Failed to load hydration settings"

                isLoading = false
            }
        )
    }


    // =========================================================
    // SAVE SETTINGS
    // =========================================================

    fun saveSettings() {

        if (isSaving) {
            return
        }

        val goal =
            dailyGoalMl.toIntOrNull()

        if (goal == null || goal < 500) {

            errorMessage =
                "Daily goal must be at least 500 ml"

            successMessage = null

            return
        }

        if (
            reminderMode == "INTERVAL" ||
            reminderMode == "HYBRID"
        ) {

            val interval =
                intervalMinutes.toIntOrNull()

            if (
                interval == null ||
                interval <= 0
            ) {

                errorMessage =
                    "Enter a valid interval"

                successMessage = null

                return
            }
        }

        if (
            reminderMode == "CUSTOM" ||
            reminderMode == "HYBRID"
        ) {

            if (customReminderTimes.isEmpty()) {

                errorMessage =
                    "Add at least one custom reminder"

                successMessage = null

                return
            }
        }

        // =====================================================
        // CLEAN CUSTOM TIMES
        // =====================================================

        val cleanedTimes =
            customReminderTimes
                .map { it.trim() }
                .filter {
                    it.matches(
                        Regex("^\\d{2}:\\d{2}$")
                    )
                }
                .distinct()
                .sorted()

        // =====================================================
        // BUILD REQUEST BODY
        // =====================================================

        val body =
            JSONObject().apply {

                put(
                    "dailyGoalMl",
                    goal
                )

                put(
                    "reminderMode",
                    reminderMode
                )

                put(
                    "intervalMinutes",
                    intervalMinutes
                        .toIntOrNull()
                        ?: 60
                )

                put(
                    "wakeTime",
                    wakeTime
                )

                put(
                    "sleepTime",
                    sleepTime
                )

                put(
                    "timezone",
                    TimeZone
                        .getDefault()
                        .id
                )

                put(
                    "notificationsEnabled",
                    notificationsEnabled
                )

                put(
                    "soundEnabled",
                    soundEnabled
                )

                put(
                    "inAppEnabled",
                    inAppEnabled
                )

                put(
                    "snoozeMinutes",
                    snoozeMinutes
                        .toIntOrNull()
                        ?: 15
                )

                put(
                    "reminderStyle",
                    reminderStyle
                )

                val timesArray =
                    JSONArray()

                cleanedTimes.forEach { time ->

                    timesArray.put(time)
                }

                put(
                    "customReminderTimes",
                    timesArray
                )
            }

        // =====================================================
        // API CALL MUST RUN IN COROUTINE
        // =====================================================

        scope.launch {

            isSaving = true
            errorMessage = null
            successMessage = null

            try {

                val token =
                    FirebaseAuthManager.getIdToken()

                if (token == null) {

                    errorMessage =
                        "User is not logged in"

                    return@launch
                }

                val result =
                    ApiClient.patch(
                        path = "/hydration/settings",
                        token = token,
                        body = body
                    )

                result.fold(

                    onSuccess = {

                        successMessage =
                            "Hydration settings saved"

                        customReminderTimes.clear()

                        customReminderTimes.addAll(
                            cleanedTimes
                        )

                        /*
                         * =====================================================
                         * ANDROID NOTIFICATION PERMISSION
                         * =====================================================
                         */

                        if (
                            notificationsEnabled &&
                            Build.VERSION.SDK_INT >=
                            Build.VERSION_CODES.TIRAMISU
                        ) {
                        
                            val permission =
                                ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.POST_NOTIFICATIONS
                                )

                            if (
                                permission !=
                                PackageManager.PERMISSION_GRANTED
                            ) {
                            
                                notificationPermissionLauncher.launch(
                                    Manifest.permission.POST_NOTIFICATIONS
                                )
                            }
                        }

                        /*
                         * =====================================================
                         * SCHEDULE NEXT HYDRATION ALARM
                         * =====================================================
                         */

                        if (notificationsEnabled) {
                        
                            HydrationAlarmScheduler.scheduleNext(
                                context
                            )

                        } else {
                        
                            HydrationAlarmScheduler.cancel(
                                context
                            )
                        }

                        /*
                         * =====================================================
                         * EXACT ALARM ACCESS
                         * =====================================================
                         *
                         * Android 12+ may require the user to allow
                         * "Alarms & reminders".
                         */

                        if (
                            notificationsEnabled &&
                            Build.VERSION.SDK_INT >=
                            Build.VERSION_CODES.S
                        ) {
                        
                            val alarmManager =
                                context.getSystemService(
                                    Context.ALARM_SERVICE
                                ) as AlarmManager

                            if (
                                !alarmManager.canScheduleExactAlarms()
                            ) {
                            
                                try {
                                
                                    val intent =
                                        Intent(
                                            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                            Uri.parse(
                                                "package:${context.packageName}"
                                            )
                                        )

                                    context.startActivity(
                                        intent
                                    )

                                } catch (_: Exception) {
                                
                                    // Some devices may not expose
                                    // the direct exact-alarm page.
                                }
                            }
                        }
                    },

                    onFailure = { error ->

                        errorMessage =
                            error.message
                                ?: "Failed to save settings"
                    }
                )

            } catch (error: Exception) {

                errorMessage =
                    error.message
                        ?: "Failed to save settings"

            } finally {

                isSaving = false
            }
        }
    }


    // =========================================================
    // LOADING
    // =========================================================

    if (isLoading) {

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(paddingValues)
                .padding(24.dp),

            horizontalAlignment =
                Alignment.CenterHorizontally,

            verticalArrangement =
                Arrangement.Center
        ) {

            CircularProgressIndicator()

            Spacer(
                modifier =
                    Modifier.height(12.dp)
            )

            Text(
                text =
                    "Loading hydration settings..."
            )
        }

        return
    }


    // =========================================================
    // UI
    // =========================================================

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
            Arrangement.spacedBy(16.dp)
    ) {


        // =====================================================
        // HEADER
        // =====================================================

        item {

            Row(
                modifier =
                    Modifier.fillMaxWidth(),

                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                IconButton(
                    onClick = onBack
                ) {

                    Icon(
                        imageVector =
                            Icons.Default.ArrowBack,

                        contentDescription =
                            "Back"
                    )
                }

                Column(
                    modifier =
                        Modifier.weight(1f)
                ) {

                    Text(
                        text =
                            "Hydration Settings",

                        fontSize =
                            30.sp,

                        fontWeight =
                            FontWeight.Bold
                    )

                    Text(
                        text =
                            "Manage your water reminders",

                        fontSize =
                            14.sp,

                        color =
                            Color(0xFF77747F)
                    )
                }
            }
        }


        // =====================================================
        // ERROR
        // =====================================================

        item {

            if (errorMessage != null) {

                Card(
                    modifier =
                        Modifier.fillMaxWidth(),

                    shape =
                        RoundedCornerShape(16.dp),

                    colors =
                        CardDefaults.cardColors(
                            containerColor =
                                Color(0xFFFFEBEE)
                        )
                ) {

                    Text(
                        text =
                            errorMessage!!,

                        modifier =
                            Modifier.padding(16.dp),

                        color =
                            Color(0xFFC62828)
                    )
                }
            }
        }


        // =====================================================
        // SUCCESS
        // =====================================================

        item {

            if (successMessage != null) {

                Card(
                    modifier =
                        Modifier.fillMaxWidth(),

                    shape =
                        RoundedCornerShape(16.dp),

                    colors =
                        CardDefaults.cardColors(
                            containerColor =
                                Color(0xFFE8F5E9)
                        )
                ) {

                    Text(
                        text =
                            successMessage!!,

                        modifier =
                            Modifier.padding(16.dp),

                        color =
                            Color(0xFF2E7D32)
                    )
                }
            }
        }


        // =====================================================
        // DAILY GOAL
        // =====================================================

        item {

            SettingsCard(
                title =
                    "Daily Water Goal",

                subtitle =
                    "How much water you want to drink each day"
            ) {

                TextField(
                    value =
                        dailyGoalMl,

                    onValueChange = {

                        if (
                            it.all { char ->
                                char.isDigit()
                            }
                        ) {

                            dailyGoalMl = it
                        }
                    },

                    modifier =
                        Modifier.fillMaxWidth(),

                    singleLine = true,

                    label = {
                        Text("Goal in ml")
                    }
                )
            }
        }


        // =====================================================
        // REMINDER MODE
        // =====================================================

        item {

            ReminderModeSelector(

                selectedMode =
                    reminderMode,

                onModeSelected = {

                    reminderMode = it

                    errorMessage = null
                }
            )
        }


        // =====================================================
        // INTERVAL
        // =====================================================

        if (
            reminderMode == "INTERVAL" ||
            reminderMode == "HYBRID"
        ) {

            item {

                SettingsCard(
                    title =
                        "Reminder Interval",

                    subtitle =
                        "Time between hydration reminders"
                ) {

                    TextField(
                        value =
                            intervalMinutes,

                        onValueChange = {

                            if (
                                it.all { char ->
                                    char.isDigit()
                                }
                            ) {

                                intervalMinutes = it
                            }
                        },

                        modifier =
                            Modifier.fillMaxWidth(),

                        singleLine = true,

                        label = {
                            Text("Minutes")
                        }
                    )
                }
            }
        }


        // =====================================================
        // HYDRATION WINDOW
        // =====================================================

        item {

            SettingsCard(
                title =
                    "Hydration Window",

                subtitle =
                    "Reminders will operate inside this time range"
            ) {

                TimeInput(
                    title =
                        "Wake Time",

                    value =
                        wakeTime,

                    onValueChange = {
                        wakeTime = it
                    }
                )

                Spacer(
                    modifier =
                        Modifier.height(12.dp)
                )

                TimeInput(
                    title =
                        "Sleep Time",

                    value =
                        sleepTime,

                    onValueChange = {
                        sleepTime = it
                    }
                )
            }
        }


        // =====================================================
        // CUSTOM REMINDERS
        // =====================================================

        if (
            reminderMode == "CUSTOM" ||
            reminderMode == "HYBRID"
        ) {

            item {

                SettingsCard(
                    title =
                        "Custom Reminders",

                    subtitle =
                        "Specific times during your hydration window"
                ) {

                    if (
                        customReminderTimes.isEmpty()
                    ) {

                        Text(
                            text =
                                "No custom reminders added",

                            fontSize =
                                13.sp,

                            color =
                                Color(0xFF77747F)
                        )
                    }

                    customReminderTimes
                        .sorted()
                        .forEach { time ->

                            Row(
                                modifier =
                                    Modifier.fillMaxWidth(),

                                verticalAlignment =
                                    Alignment.CenterVertically
                            ) {

                                Icon(
                                    imageVector =
                                        Icons.Default.Schedule,

                                    contentDescription =
                                        null,

                                    tint =
                                        Color(0xFF2196F3)
                                )

                                Spacer(
                                    modifier =
                                        Modifier.padding(4.dp)
                                )

                                Text(
                                    text =
                                        time,

                                    modifier =
                                        Modifier.weight(1f),

                                    fontSize =
                                        16.sp,

                                    fontWeight =
                                        FontWeight.SemiBold
                                )

                                IconButton(
                                    onClick = {

                                        customReminderTimes
                                            .remove(time)
                                    }
                                ) {

                                    Icon(
                                        imageVector =
                                            Icons.Default.Delete,

                                        contentDescription =
                                            "Remove"
                                    )
                                }
                            }
                        }

                    Spacer(
                        modifier =
                            Modifier.height(8.dp)
                    )

                    var newTime by remember {
                        mutableStateOf("")
                    }

                    TextField(
                        value =
                            newTime,

                        onValueChange = {

                            if (
                                it.length <= 5
                            ) {

                                newTime = it
                            }
                        },

                        modifier =
                            Modifier.fillMaxWidth(),

                        singleLine = true,

                        label = {
                            Text("New time")
                        },

                        placeholder = {
                            Text("Example: 14:30")
                        }
                    )

                    Spacer(
                        modifier =
                            Modifier.height(8.dp)
                    )

                    OutlinedButton(
                        onClick = {

                            if (
                                newTime.matches(
                                    Regex(
                                        "^\\d{2}:\\d{2}$"
                                    )
                                ) &&
                                !customReminderTimes
                                    .contains(newTime)
                            ) {

                                customReminderTimes
                                    .add(newTime)

                                newTime = ""
                            }
                        },

                        modifier =
                            Modifier.fillMaxWidth()
                    ) {

                        Icon(
                            imageVector =
                                Icons.Default.Add,

                            contentDescription =
                                null
                        )

                        Spacer(
                            modifier =
                                Modifier.padding(4.dp)
                        )

                        Text(
                            text =
                                "Add Reminder"
                        )
                    }
                }
            }
        }


        // =====================================================
        // SNOOZE
        // =====================================================

        item {

            SettingsCard(
                title =
                    "Snooze",

                subtitle =
                    "Delay a reminder when you are busy"
            ) {

                TextField(
                    value =
                        snoozeMinutes,

                    onValueChange = {

                        if (
                            it.all { char ->
                                char.isDigit()
                            }
                        ) {

                            snoozeMinutes = it
                        }
                    },

                    modifier =
                        Modifier.fillMaxWidth(),

                    singleLine = true,

                    label = {
                        Text("Snooze minutes")
                    }
                )
            }
        }


        // =====================================================
        // NOTIFICATION SETTINGS
        // =====================================================

        item {

            SettingsCard(
                title =
                    "Notifications",

                subtitle =
                    "Control how hydration reminders behave"
            ) {

                SettingSwitch(
                    title =
                        "Notifications",

                    subtitle =
                        "Enable hydration reminders",

                    checked =
                        notificationsEnabled,

                    onCheckedChange = {
                        notificationsEnabled = it
                    }
                )

                SettingSwitch(
                    title =
                        "Sound",

                    subtitle =
                        "Play reminder sound",

                    checked =
                        soundEnabled,

                    onCheckedChange = {
                        soundEnabled = it
                    }
                )

                SettingSwitch(
                    title =
                        "In-App Reminders",

                    subtitle =
                        "Show reminders inside Life Easy",

                    checked =
                        inAppEnabled,

                    onCheckedChange = {
                        inAppEnabled = it
                    }
                )

                ReminderStyleSelector(
                    selectedStyle = reminderStyle,
                    onStyleSelected = {
                        reminderStyle = it
                    }
                )
            }
        }


        // =====================================================
        // SAVE
        // =====================================================

        item {

            Button(
                onClick = {
                    saveSettings()
                },

                modifier =
                    Modifier.fillMaxWidth(),

                enabled =
                    !isSaving,

                shape =
                    RoundedCornerShape(14.dp)
            ) {

                if (isSaving) {

                    CircularProgressIndicator(
                        modifier =
                            Modifier.padding(
                                end = 8.dp
                            ),

                        strokeWidth =
                            2.dp
                    )

                    Text(
                        text =
                            "Saving..."
                    )

                } else {

                    Text(
                        text =
                            "Save Hydration Settings"
                    )
                }
            }
        }
    }
}


// =============================================================
// SETTINGS CARD
// =============================================================

@Composable
private fun SettingsCard(
    title: String,
    subtitle: String,
    content: @Composable () -> Unit
) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(18.dp),

        colors =
            CardDefaults.cardColors(
                containerColor =
                    Color.White
            )
    ) {

        Column(
            modifier =
                Modifier.padding(16.dp)
        ) {

            Text(
                text =
                    title,

                fontSize =
                    18.sp,

                fontWeight =
                    FontWeight.Bold
            )

            Spacer(
                modifier =
                    Modifier.height(3.dp)
            )

            Text(
                text =
                    subtitle,

                fontSize =
                    12.sp,

                color =
                    Color(0xFF77747F)
            )

            Spacer(
                modifier =
                    Modifier.height(14.dp)
            )

            content()
        }
    }
}


// =============================================================
// REMINDER MODE
// =============================================================

@Composable
private fun ReminderModeSelector(
    selectedMode: String,
    onModeSelected: (String) -> Unit
) {

    var expanded by remember {
        mutableStateOf(false)
    }

    val description =
        when (selectedMode) {

            "SMART" ->
                "Automatically adjusts reminders based on your routine."

            "INTERVAL" ->
                "Reminds you at a fixed interval."

            "CUSTOM" ->
                "Uses only the specific times you define."

            "HYBRID" ->
                "Combines interval reminders with custom times."

            else ->
                ""
        }

    SettingsCard(
        title =
            "Reminder Mode",

        subtitle =
            description
    ) {

        Card(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .clickable {
                        expanded = true
                    },

            shape =
                RoundedCornerShape(12.dp),

            colors =
                CardDefaults.cardColors(
                    containerColor =
                        Color(0xFFF7F7F9)
                )
        ) {

            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(16.dp),

                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                Column(
                    modifier =
                        Modifier.weight(1f)
                ) {

                    Text(
                        text =
                            selectedMode,

                        fontWeight =
                            FontWeight.Bold
                    )

                    Text(
                        text =
                            "Tap to change mode",

                        fontSize =
                            12.sp,

                        color =
                            Color(0xFF77747F)
                    )
                }
            }

            DropdownMenu(
                expanded =
                    expanded,

                onDismissRequest = {
                    expanded = false
                }
            ) {

                listOf(
                    "SMART",
                    "INTERVAL",
                    "CUSTOM",
                    "HYBRID"
                ).forEach { mode ->

                    DropdownMenuItem(

                        text = {
                            Text(mode)
                        },

                        onClick = {

                            onModeSelected(
                                mode
                            )

                            expanded = false
                        }
                    )
                }
            }
        }
    }
}


// =============================================================
// TIME INPUT
// =============================================================

@Composable
private fun TimeInput(
    title: String,
    value: String,
    onValueChange: (String) -> Unit
) {

    TextField(
        value =
            value,

        onValueChange = {

            if (it.length <= 5) {
                onValueChange(it)
            }
        },

        modifier =
            Modifier.fillMaxWidth(),

        singleLine = true,

        label = {
            Text(title)
        },

        placeholder = {
            Text("HH:mm")
        }
    )
}


// =============================================================
// SWITCH
// =============================================================

@Composable
private fun SettingSwitch(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
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
                text =
                    title,

                fontWeight =
                    FontWeight.SemiBold
            )

            Text(
                text =
                    subtitle,

                fontSize =
                    12.sp,

                color =
                    Color(0xFF77747F)
            )
        }

        Switch(
            checked =
                checked,

            onCheckedChange =
                onCheckedChange
        )
    }

    Spacer(
        modifier =
            Modifier.height(10.dp)
    )
}


@Composable
private fun ReminderStyleSelector(
    selectedStyle: String,
    onStyleSelected: (String) -> Unit
) {
    var expanded by remember {
        mutableStateOf(false)
    }

    val title =
        if (selectedStyle == "FULL_SCREEN") {
            "Full-Screen Alarm"
        } else {
            "Normal Notification"
        }

    val description =
        if (selectedStyle == "FULL_SCREEN") {
            "Show a full-screen hydration alarm."
        } else {
            "Show a normal hydration notification."
        }

    Column {

        Text(
            text = "Reminder Style",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold
        )

        Spacer(
            modifier = Modifier.height(4.dp)
        )

        Text(
            text = description,
            fontSize = 12.sp,
            color = Color(0xFF77747F)
        )

        Spacer(
            modifier = Modifier.height(8.dp)
        )

        Box {

            OutlinedButton(
                onClick = {
                    expanded = true
                }
            ) {
                Text(title)
            }

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = {
                    expanded = false
                }
            ) {

                DropdownMenuItem(
                    text = {
                        Text("Normal Notification")
                    },
                    onClick = {
                        onStyleSelected(
                            "NOTIFICATION"
                        )
                        expanded = false
                    }
                )

                DropdownMenuItem(
                    text = {
                        Text("Full-Screen Alarm")
                    },
                    onClick = {
                        onStyleSelected(
                            "FULL_SCREEN"
                        )
                        expanded = false
                    }
                )
            }
        }
    }
}