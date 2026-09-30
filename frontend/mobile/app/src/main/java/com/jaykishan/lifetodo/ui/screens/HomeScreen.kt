package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
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
import com.jaykishan.lifetodo.ui.components.StatCard
import com.jaykishan.lifetodo.ui.components.TopBar
import org.json.JSONObject

@Composable
fun HomeScreen(
    paddingValues: PaddingValues
) {

    var isLoading by remember {
        mutableStateOf(true)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    var displayName by remember {
        mutableStateOf("User")
    }

    var level by remember {
        mutableStateOf(0)
    }

    var totalXp by remember {
        mutableStateOf(0L)
    }

    var gold by remember {
        mutableStateOf(0L)
    }

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

                    displayName =
                        user?.optString(
                            "display_name",
                            ""
                        )?.takeIf {
                            it.isNotBlank()
                        } ?: "User"

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

                } catch (error: Exception) {

                    errorMessage =
                        "Invalid profile response"
                }

                isLoading = false
            },

            onFailure = { error ->

                errorMessage =
                    error.message ?: "Failed to load data"

                isLoading = false
            }
        )
    }

    LazyColumn(
        modifier = Modifier.padding(paddingValues),

        contentPadding = PaddingValues(
            start = 20.dp,
            top = 20.dp,
            end = 20.dp,
            bottom = 24.dp
        ),

        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {

        /* ---------------- HEADER ---------------- */

        item {

            TopBar(
                greeting = "Good evening 👋",
                title = "Life Easy",
                subtitle = if (displayName == "User") {
                    "Let's make today count."
                } else {
                    "Let's make today count, $displayName."
                }
            )
        }

        /* ---------------- LOADING ---------------- */

        if (isLoading) {

            item {

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp)
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

                        CircularProgressIndicator()
                    }
                }
            }
        }

        /* ---------------- ERROR ---------------- */

        if (errorMessage != null) {

            item {

                Text(
                    text = errorMessage!!,
                    color = Color.Red,
                    fontSize = 14.sp
                )
            }
        }

        /* ---------------- LEVEL CARD ---------------- */

        item {

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),

                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF6750E8)
                )
            ) {

                Column(
                    modifier = Modifier.padding(22.dp)
                ) {

                    Row(
                        modifier = Modifier.fillMaxWidth(),

                        horizontalArrangement =
                            Arrangement.SpaceBetween,

                        verticalAlignment =
                            Alignment.CenterVertically
                    ) {

                        Column {

                            Text(
                                text = "LEVEL $level",
                                color =
                                    Color.White.copy(
                                        alpha = 0.75f
                                    ),

                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )

                            Spacer(
                                modifier =
                                    Modifier.height(4.dp)
                            )

                            Text(
                                text = "$totalXp XP",
                                color = Color.White,
                                fontSize = 27.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Text(
                            text = "⭐",
                            fontSize = 36.sp
                        )
                    }

                    Spacer(
                        modifier = Modifier.height(18.dp)
                    )

                    /*
                     * We are intentionally not inventing
                     * the game's XP-per-level formula yet.
                     *
                     * The backend gives us total_xp, but we
                     * haven't verified the exact level progression
                     * formula.
                     */

                    LinearProgressIndicator(
                        progress = {
                            0f
                        },

                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp),

                        color = Color.White,
                        trackColor =
                            Color.White.copy(
                                alpha = 0.25f
                            )
                    )

                    Spacer(
                        modifier = Modifier.height(8.dp)
                    )

                    Text(
                        text = "XP progression",
                        color =
                            Color.White.copy(
                                alpha = 0.8f
                            ),

                        fontSize = 12.sp
                    )
                }
            }
        }

        /* ---------------- QUICK STATS ---------------- */

        item {

            Row(
                modifier = Modifier.fillMaxWidth(),

                horizontalArrangement =
                    Arrangement.spacedBy(12.dp)
            ) {

                StatCard(
                    modifier = Modifier.weight(1f),

                    title = "Gold",

                    value = formatGold(gold),

                    icon = "🪙",

                    accentColor =
                        Color(0xFFFFA000)
                )

                /*
                 * Quest count will become real once we connect
                 * the backend quest endpoint.
                 */

                StatCard(
                    modifier = Modifier.weight(1f),

                    title = "Quests Today",

                    value = "—",

                    icon = "⚔️",

                    accentColor =
                        Color(0xFF6750E8)
                )
            }
        }

        /* ---------------- DAILY PROGRESS ---------------- */

        item {

            SectionTitle(
                title = "Today's Progress",
                subtitle = "Keep the streak alive."
            )
        }

        item {

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            ) {

                Column(
                    modifier = Modifier.padding(20.dp)
                ) {

                    ProgressRow(
                        icon = "⚔️",
                        title = "Quests",
                        progress = "Coming soon",
                        fraction = 0f
                    )

                    Spacer(
                        modifier = Modifier.height(18.dp)
                    )

                    ProgressRow(
                        icon = "💧",
                        title = "Hydration",
                        progress = "Coming soon",
                        fraction = 0f
                    )
                }
            }
        }

        /* ---------------- QUESTS ---------------- */

        item {

            SectionTitle(
                title = "Today's Quests",
                subtitle = "Small wins become big progress."
            )
        }

        item {

            QuestCard(
                title = "Study DSA",
                reward = "+25 XP  •  +12 Gold",
                completed = false
            )
        }

        item {

            QuestCard(
                title = "Workout",
                reward = "+50 XP  •  +20 Gold",
                completed = true
            )
        }

        item {

            QuestCard(
                title = "Read 20 Pages",
                reward = "+20 XP  •  +10 Gold",
                completed = false
            )
        }
    }
}


/* ===================================================
   FORMAT GOLD
=================================================== */

private fun formatGold(
    gold: Long
): String {

    return when {

        gold >= 1_000_000 -> {

            String.format(
                "%.1fM",
                gold / 1_000_000.0
            )
        }

        gold >= 1_000 -> {

            String.format(
                "%.1fK",
                gold / 1_000.0
            )
        }

        else -> {

            gold.toString()
        }
    }
}


/* ===================================================
   SECTION TITLE
=================================================== */

@Composable
private fun SectionTitle(
    title: String,
    subtitle: String
) {

    Column {

        Text(
            text = title,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(
            modifier = Modifier.height(3.dp)
        )

        Text(
            text = subtitle,
            fontSize = 13.sp,
            color = Color(0xFF77747F)
        )
    }
}


/* ===================================================
   PROGRESS ROW
=================================================== */

@Composable
private fun ProgressRow(
    icon: String,
    title: String,
    progress: String,
    fraction: Float
) {

    Column {

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment =
                Alignment.CenterVertically
        ) {

            Text(
                text = icon,
                fontSize = 21.sp
            )

            Spacer(
                modifier = Modifier.width(10.dp)
            )

            Text(
                text = title,
                modifier = Modifier.weight(1f),
                fontWeight = FontWeight.SemiBold
            )

            Text(
                text = progress,
                fontSize = 13.sp,
                color = Color(0xFF77747F)
            )
        }

        Spacer(
            modifier = Modifier.height(8.dp)
        )

        LinearProgressIndicator(
            progress = {
                fraction
            },

            modifier = Modifier
                .fillMaxWidth()
                .height(7.dp)
        )
    }
}


/* ===================================================
   QUEST CARD
=================================================== */

@Composable
private fun QuestCard(
    title: String,
    reward: String,
    completed: Boolean
) {

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp)
    ) {

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(17.dp),

            verticalAlignment =
                Alignment.CenterVertically
        ) {

            Icon(
                imageVector =
                    Icons.Default.CheckCircle,

                contentDescription = null,

                tint =
                    if (completed)
                        Color(0xFF00A896)
                    else
                        Color(0xFF6750E8)
            )

            Spacer(
                modifier = Modifier.width(13.dp)
            )

            Column(
                modifier = Modifier.weight(1f)
            ) {

                Text(
                    text = title,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(
                    modifier = Modifier.height(3.dp)
                )

                Text(
                    text = reward,
                    fontSize = 12.sp,
                    color = Color(0xFF77747F)
                )
            }

            Text(
                text =
                    if (completed)
                        "DONE"
                    else
                        "OPEN",

                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,

                color =
                    if (completed)
                        Color(0xFF00A896)
                    else
                        Color(0xFF6750E8)
            )
        }
    }
}