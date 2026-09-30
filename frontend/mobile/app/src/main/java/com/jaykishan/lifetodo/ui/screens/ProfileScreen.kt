package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import org.json.JSONObject


@Composable
fun ProfileScreen(
    paddingValues: PaddingValues,
    onOpenSettings: () -> Unit
) {

    // ===================================================
    // PROFILE STATE
    // ===================================================

    var isLoading by remember {
        mutableStateOf(true)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    var displayName by remember {
        mutableStateOf("Loading...")
    }


    // ===================================================
    // BASIC CHARACTER DATA
    // ===================================================

    var level by remember {
        mutableStateOf(0)
    }

    var totalXp by remember {
        mutableStateOf(0L)
    }

    var gold by remember {
        mutableStateOf(0L)
    }


    // ===================================================
    // CHARACTER ATTRIBUTES
    // ===================================================

    var strength by remember {
        mutableStateOf(0)
    }

    var intellect by remember {
        mutableStateOf(0)
    }

    var discipline by remember {
        mutableStateOf(0)
    }

    var creativity by remember {
        mutableStateOf(0)
    }


    // ===================================================
    // STREAK DATA
    // ===================================================

    var currentStreak by remember {
        mutableStateOf(0)
    }

    var longestStreak by remember {
        mutableStateOf(0)
    }

    var lastActivityDate by remember {
        mutableStateOf("")
    }


    // ===================================================
    // LOAD PROFILE
    // ===================================================

    LaunchedEffect(Unit) {

        isLoading = true
        errorMessage = null

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            errorMessage = "User is not logged in"
            isLoading = false

            return@LaunchedEffect
        }

        val result =
            ApiClient.get(
                path = "/users/me",
                token = token
            )

        result.fold(

            onSuccess = { response ->

                try {

                    val json =
                        JSONObject(response)

                    val user =
                        json.optJSONObject("user")

                    val character =
                        json.optJSONObject("character")


                    // ===================================================
                    // USER
                    // ===================================================

                    displayName =
                        user?.optString(
                            "display_name",
                            ""
                        )?.takeIf {
                            it.isNotBlank()
                        } ?: "User"


                    // ===================================================
                    // BASIC CHARACTER DATA
                    // ===================================================

                    level =
                        character?.optInt(
                            "level",
                            1
                        ) ?: 1

                    totalXp =
                        character?.optLong(
                            "total_xp",
                            0L
                        ) ?: 0L

                    gold =
                        character?.optLong(
                            "gold",
                            0L
                        ) ?: 0L


                    // ===================================================
                    // CHARACTER ATTRIBUTES
                    // ===================================================

                    strength =
                        character?.optInt(
                            "strength",
                            0
                        ) ?: 0

                    intellect =
                        character?.optInt(
                            "intellect",
                            0
                        ) ?: 0

                    discipline =
                        character?.optInt(
                            "discipline",
                            0
                        ) ?: 0

                    creativity =
                        character?.optInt(
                            "creativity",
                            0
                        ) ?: 0


                    // ===================================================
                    // STREAK DATA
                    // ===================================================

                    currentStreak =
                        character?.optInt(
                            "current_streak",
                            0
                        ) ?: 0

                    longestStreak =
                        character?.optInt(
                            "longest_streak",
                            0
                        ) ?: 0

                    lastActivityDate =
                        character?.optString(
                            "last_activity_date",
                            ""
                        ) ?: ""


                } catch (error: Exception) {

                    errorMessage =
                        "Invalid profile response"
                }

                isLoading = false
            },

            onFailure = { error ->

                errorMessage =
                    error.message ?: "Failed to load profile"

                isLoading = false
            }
        )
    }


    // ===================================================
    // PROFILE UI
    // ===================================================

    LazyColumn(

        modifier = Modifier
            .fillMaxWidth()
            .padding(paddingValues),

        contentPadding = PaddingValues(
            start = 20.dp,
            top = 20.dp,
            end = 20.dp,
            bottom = 24.dp
        ),

        verticalArrangement =
            Arrangement.spacedBy(16.dp)
    ) {


        // ===================================================
        // HEADER
        // ===================================================

        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {

                Column(
                    modifier = Modifier.weight(1f)
                ) {

                    Text(
                        text = "Profile",
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Your life progression",
                        fontSize = 14.sp,
                        color = Color(0xFF77747F)
                    )
                }

                IconButton(
                    onClick = onOpenSettings
                ) {

                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Settings"
                    )
                }
            }
        }


        // ===================================================
        // PROFILE CARD
        // ===================================================

        item {

            if (isLoading) {

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White
                    )
                ) {

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),

                        horizontalArrangement =
                            Arrangement.Center,

                        verticalAlignment =
                            Alignment.CenterVertically
                    ) {

                        CircularProgressIndicator(
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }

            } else {

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White
                    )
                ) {

                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment =
                            Alignment.CenterVertically
                    ) {

                        Card(
                            modifier = Modifier.size(72.dp),
                            shape = CircleShape,

                            colors = CardDefaults.cardColors(
                                containerColor =
                                    Color(0xFFEDE9FF)
                            )
                        ) {

                            Text(
                                text = displayName
                                    .firstOrNull()
                                    ?.uppercase()
                                    ?: "U",

                                modifier = Modifier.padding(
                                    start = 25.dp,
                                    top = 17.dp
                                ),

                                fontSize = 30.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF6750E8)
                            )
                        }


                        Spacer(
                            modifier = Modifier.size(16.dp)
                        )


                        Column(
                            modifier = Modifier.weight(1f)
                        ) {

                            Text(
                                text = displayName,
                                fontSize = 21.sp,
                                fontWeight = FontWeight.Bold
                            )

                            Text(
                                text = "Level $level",
                                fontSize = 13.sp,
                                color = Color(0xFF77747F)
                            )
                        }


                        IconButton(
                            onClick = {
                                // TODO: Edit profile
                            }
                        ) {

                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit"
                            )
                        }
                    }
                }
            }
        }


        // ===================================================
        // ERROR
        // ===================================================

        if (errorMessage != null) {

            item {

                Text(
                    text = errorMessage!!,
                    color = Color.Red,
                    fontSize = 14.sp
                )
            }
        }


        // ===================================================
        // YOUR STATS
        // ===================================================

        item {

            Text(
                text = "Your Stats",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }


        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(12.dp)
            ) {

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = level.toString(),
                    label = "Level",
                    icon = "⭐"
                )

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = totalXp.toString(),
                    label = "XP",
                    icon = "⚡"
                )

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = formatGold(gold),
                    label = "Gold",
                    icon = "🪙"
                )
            }
        }


        // ===================================================
        // CHARACTER
        // ===================================================

        item {

            Text(
                text = "Character",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }


        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(12.dp)
            ) {

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = strength.toString(),
                    label = "Strength",
                    icon = "💪"
                )

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = intellect.toString(),
                    label = "Intellect",
                    icon = "🧠"
                )
            }
        }


        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(12.dp)
            ) {

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = discipline.toString(),
                    label = "Discipline",
                    icon = "🎯"
                )

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = creativity.toString(),
                    label = "Creativity",
                    icon = "💡"
                )
            }
        }


        // ===================================================
        // STREAK
        // ===================================================

        item {

            Text(
                text = "Streak",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }


        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement =
                    Arrangement.spacedBy(12.dp)
            ) {

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = currentStreak.toString(),
                    label = "Current",
                    icon = "🔥"
                )

                ProfileStat(
                    modifier = Modifier.weight(1f),
                    value = longestStreak.toString(),
                    label = "Longest",
                    icon = "🏆"
                )
            }
        }


        // ===================================================
        // LAST ACTIVITY
        // ===================================================

        if (lastActivityDate.isNotBlank()) {

            item {

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp)
                ) {

                    Column(
                        modifier = Modifier.padding(17.dp)
                    ) {

                        Text(
                            text = "Last Activity",
                            fontWeight = FontWeight.SemiBold
                        )

                        Spacer(
                            modifier = Modifier.height(3.dp)
                        )

                        Text(
                            text = formatActivityDate(
                                lastActivityDate
                            ),
                            fontSize = 12.sp,
                            color = Color(0xFF77747F)
                        )
                    }
                }
            }
        }


        // ===================================================
        // ACHIEVEMENTS
        // ===================================================

        item {

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            ) {

                Row(
                    modifier = Modifier.padding(18.dp),
                    verticalAlignment =
                        Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector =
                            Icons.Default.EmojiEvents,

                        contentDescription = null,

                        tint = Color(0xFFFFA000),

                        modifier = Modifier.size(34.dp)
                    )


                    Spacer(
                        modifier = Modifier.size(13.dp)
                    )


                    Column {

                        Text(
                            text = "Achievements",
                            fontWeight = FontWeight.Bold
                        )

                        Text(
                            text =
                                "Achievements data coming soon",

                            fontSize = 13.sp,

                            color =
                                Color(0xFF77747F)
                        )
                    }
                }
            }
        }


        // ===================================================
        // ACCOUNT
        // ===================================================

        item {

            Text(
                text = "Account",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }


        // ===================================================
        // SETTINGS
        // ===================================================

        item {

            ProfileMenuItem(
                title = "Settings",
                subtitle = "App preferences",
                onClick = onOpenSettings
            )
        }


        // ===================================================
        // NOTIFICATIONS
        // ===================================================

        item {

            ProfileMenuItem(
                title = "Notifications",
                subtitle = "Manage reminders"
            )
        }


        // ===================================================
        // ABOUT
        // ===================================================

        item {

            ProfileMenuItem(
                title = "About Life Easy",
                subtitle = "Version 1.0"
            )
        }
    }
}


// ===================================================
// FORMAT GOLD
// ===================================================

private fun formatGold(
    gold: Long
): String {

    return when {

        gold >= 1_000_000 ->

            String.format(
                "%.1fM",
                gold / 1_000_000.0
            )

        gold >= 1_000 ->

            String.format(
                "%.1fK",
                gold / 1_000.0
            )

        else ->
            gold.toString()
    }
}


// ===================================================
// FORMAT ACTIVITY DATE
// ===================================================

private fun formatActivityDate(
    date: String
): String {

    return date
        .replace("T", " ")
        .replace("Z", "")
}


// ===================================================
// PROFILE STAT
// ===================================================

@Composable
private fun ProfileStat(
    modifier: Modifier,
    value: String,
    label: String,
    icon: String
) {

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp)
    ) {

        Column(
            modifier = Modifier.padding(14.dp)
        ) {

            Text(
                text = icon,
                fontSize = 20.sp
            )

            Spacer(
                modifier = Modifier.height(7.dp)
            )

            Text(
                text = value,
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = label,
                fontSize = 12.sp,
                color = Color(0xFF77747F)
            )
        }
    }
}


// ===================================================
// PROFILE MENU
// ===================================================

@Composable
private fun ProfileMenuItem(
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null
) {

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) {
                    Modifier.clickable {
                        onClick()
                    }
                } else {
                    Modifier
                }
            ),

        shape = RoundedCornerShape(18.dp)
    ) {

        Column(
            modifier = Modifier.padding(17.dp)
        ) {

            Text(
                text = title,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(
                modifier = Modifier.height(3.dp)
            )

            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = Color(0xFF77747F)
            )
        }
    }
}