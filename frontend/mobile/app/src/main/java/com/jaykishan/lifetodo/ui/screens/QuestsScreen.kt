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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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


import org.json.JSONArray
import org.json.JSONObject


// ============================================================
// DATA MODELS
// ============================================================

private data class QuestUi(
    val id: String,
    val title: String,
    val description: String,
    val category: String,
    val difficulty: String,
    val attribute: String,
    val xp: Int,
    val gold: Int,
    val attributeReward: Int
)

private data class HistoryUi(
    val id: String,
    val questId: String,
    val title: String,
    val description: String,
    val category: String,
    val difficulty: String,
    val xp: Int,
    val gold: Int,
    val completedAt: String
)


// ============================================================
// CREATE QUEST REQUEST
// ============================================================

private data class CreateQuestRequest(
    val title: String,
    val description: String,
    val category: String,
    val difficulty: String,
    val attribute: String,
    val xpReward: Int,
    val goldReward: Int,
    val attributeReward: Int
)


// ============================================================
// MAIN QUEST SCREEN
// ============================================================

@Composable
fun QuestsScreen(
    paddingValues: PaddingValues
) {

    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    val quests = remember {
        mutableStateListOf<QuestUi>()
    }

    val history = remember {
        mutableStateListOf<HistoryUi>()
    }

    var isLoading by remember {
        mutableStateOf(true)
    }

    var isHistoryLoading by remember {
        mutableStateOf(false)
    }

    var isCreating by remember {
        mutableStateOf(false)
    }

    var completingQuestId by remember {
        mutableStateOf<String?>(null)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    var showAddDialog by remember {
        mutableStateOf(false)
    }

    var showHistory by remember {
        mutableStateOf(false)
    }

    var refreshKey by remember {
        mutableStateOf(0)
    }

    /*
     * This stores the quest which the user wants to create.
     */
    var pendingCreateQuest by remember {
        mutableStateOf<CreateQuestRequest?>(null)
    }

    


    // ========================================================
    // LOAD ACTIVE QUESTS
    // ========================================================

    LaunchedEffect(refreshKey) {

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
                path = "/quests",
                token = token
            )

        result.fold(

            onSuccess = { response ->

                try {

                    val json =
                        JSONArray(response)

                    quests.clear()

                    for (index in 0 until json.length()) {

                        val item =
                            json.getJSONObject(index)

                        quests.add(
                            QuestUi(

                                id =
                                    item.optString(
                                        "id"
                                    ),

                                title =
                                    item.optString(
                                        "title",
                                        "Untitled Quest"
                                    ),

                                description =
                                    item.optString(
                                        "description",
                                        ""
                                    ),

                                category =
                                    item.optString(
                                        "category",
                                        "GENERAL"
                                    ),

                                difficulty =
                                    item.optString(
                                        "difficulty",
                                        "EASY"
                                    ),

                                attribute =
                                    item.optString(
                                        "attribute",
                                        "DISCIPLINE"
                                    ),

                                xp =
                                    item.optInt(
                                        "xp_reward",
                                        0
                                    ),

                                gold =
                                    item.optInt(
                                        "gold_reward",
                                        0
                                    ),

                                attributeReward =
                                    item.optInt(
                                        "attribute_reward",
                                        1
                                    )
                            )
                        )
                    }

                } catch (error: Exception) {

                    errorMessage =
                        "Could not read quests: ${error.message}"
                }

                isLoading = false
            },

            onFailure = { error ->

                errorMessage =
                    error.message
                        ?: "Failed to load quests"

                isLoading = false
            }
        )
    }


    // ========================================================
    // LOAD HISTORY
    // ========================================================

    LaunchedEffect(
        showHistory,
        refreshKey
    ) {

        if (!showHistory) {
            return@LaunchedEffect
        }

        isHistoryLoading = true

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            errorMessage =
                "User is not logged in"

            isHistoryLoading = false

            return@LaunchedEffect
        }

        val result =
            ApiClient.get(
                path = "/quests/history",
                token = token
            )

        result.fold(

            onSuccess = { response ->

                try {

                    val json =
                        JSONArray(response)

                    history.clear()

                    for (index in 0 until json.length()) {

                        val item =
                            json.getJSONObject(index)

                        history.add(
                            HistoryUi(

                                id =
                                    item.optString(
                                        "completion_id"
                                    ),

                                questId =
                                    item.optString(
                                        "quest_id"
                                    ),

                                title =
                                    item.optString(
                                        "title",
                                        "Quest"
                                    ),

                                description =
                                    item.optString(
                                        "description",
                                        ""
                                    ),

                                category =
                                    item.optString(
                                        "category",
                                        "GENERAL"
                                    ),

                                difficulty =
                                    item.optString(
                                        "difficulty",
                                        "EASY"
                                    ),

                                xp =
                                    item.optInt(
                                        "xp_earned",
                                        0
                                    ),

                                gold =
                                    item.optInt(
                                        "gold_earned",
                                        0
                                    ),

                                completedAt =
                                    item.optString(
                                        "completed_at",
                                        ""
                                    )
                            )
                        )
                    }

                } catch (error: Exception) {

                    errorMessage =
                        "Could not read history: ${error.message}"
                }

                isHistoryLoading = false
            },

            onFailure = { error ->

                errorMessage =
                    error.message
                        ?: "Failed to load history"

                isHistoryLoading = false
            }
        )
    }


    // ========================================================
    // CREATE QUEST
    // ========================================================

    LaunchedEffect(pendingCreateQuest) {

        val request =
            pendingCreateQuest
                ?: return@LaunchedEffect

        isCreating = true
        errorMessage = null

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            errorMessage =
                "User is not logged in"

            isCreating = false
            pendingCreateQuest = null

            return@LaunchedEffect
        }

        val body =
            JSONObject().apply {

                put(
                    "title",
                    request.title
                )

                put(
                    "description",
                    request.description
                )

                put(
                    "category",
                    request.category
                )

                put(
                    "difficulty",
                    request.difficulty
                )

                put(
                    "attribute",
                    request.attribute
                )

                put(
                    "xpReward",
                    request.xpReward
                )

                put(
                    "goldReward",
                    request.goldReward
                )

                put(
                    "attributeReward",
                    request.attributeReward
                )
            }

        val result =
            ApiClient.post(
                path = "/quests",
                token = token,
                body = body
            )

        result.fold(

            onSuccess = {

                showAddDialog = false

                pendingCreateQuest = null

                isCreating = false

                /*
                 * Reload quests.
                 */
                refreshKey++
            },

            onFailure = { error ->

                errorMessage =
                    error.message
                        ?: "Failed to create quest"

                pendingCreateQuest = null

                isCreating = false
            }
        )
    }


    // ========================================================
    // COMPLETE QUEST
    // ========================================================

    LaunchedEffect(completingQuestId) {

        val questId =
            completingQuestId
                ?: return@LaunchedEffect

        val token =
            FirebaseAuthManager.getIdToken()

        if (token == null) {

            errorMessage =
                "User is not logged in"

            completingQuestId = null

            return@LaunchedEffect
        }

        val result =
            ApiClient.post(
                path =
                    "/quests/$questId/complete",

                token = token,

                body =
                    JSONObject()
            )

        result.fold(

            onSuccess = {

                /*
                 * Quest is completed.
                 *
                 * Backend has already:
                 * XP
                 * Gold
                 * Attribute
                 * Level
                 * Streak
                 * Completion history
                 */

                completingQuestId = null

                errorMessage = null

                /*
                 * Reload everything.
                 */
                refreshKey++
            },

            onFailure = { error ->

                errorMessage =
                    error.message
                        ?: "Failed to complete quest"

                completingQuestId = null
            }
        )
    }


    // ========================================================
    // SCREEN UI
    // ========================================================

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


        // ----------------------------------------------------
        // HEADER
        // ----------------------------------------------------

        item {

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
                            if (showHistory)
                                "Quest History"
                            else
                                "Quests",

                        fontSize =
                            30.sp,

                        fontWeight =
                            FontWeight.Bold
                    )

                    Text(
                        text =
                            if (showHistory)
                                "Your completed journey."
                            else
                                "Complete quests. Build your life.",

                        fontSize =
                            14.sp,

                        color =
                            Color(0xFF77747F)
                    )
                }

                IconButton(

                    onClick = {
                        refreshKey++
                    }

                ) {

                    Icon(
                        imageVector =
                            Icons.Default.Refresh,

                        contentDescription =
                            "Refresh"
                    )
                }
            }
        }


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        if (errorMessage != null) {

            item {

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

                    Column(
                        modifier =
                            Modifier.padding(16.dp)
                    ) {

                        Text(

                            text =
                                errorMessage!!,

                            color =
                                Color(0xFFC62828),

                            fontSize =
                                13.sp
                        )

                        Spacer(
                            modifier =
                                Modifier.height(8.dp)
                        )

                        TextButton(

                            onClick = {

                                errorMessage = null

                                refreshKey++
                            }

                        ) {

                            Text("Retry")
                        }
                    }
                }
            }
        }


        // ----------------------------------------------------
        // TODAY'S PROGRESS
        // ----------------------------------------------------

        if (!showHistory) {

            item {

                val completedToday =
                    history.count {

                        it.completedAt
                            .startsWith(
                                java.time.LocalDate
                                    .now()
                                    .toString()
                            )
                    }

                val total =
                    quests.size +
                        completedToday

                val progress =
                    if (total == 0)
                        0f
                    else
                        completedToday.toFloat() /
                            total.toFloat()

                Card(

                    modifier =
                        Modifier.fillMaxWidth(),

                    shape =
                        RoundedCornerShape(22.dp),

                    colors =
                        CardDefaults.cardColors(
                            containerColor =
                                Color(0xFF6750E8)
                        )
                ) {

                    Column(
                        modifier =
                            Modifier.padding(20.dp)
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
                                        "TODAY'S PROGRESS",

                                    fontSize =
                                        12.sp,

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
                                        "$completedToday / $total completed",

                                    fontSize =
                                        24.sp,

                                    fontWeight =
                                        FontWeight.Bold,

                                    color =
                                        Color.White
                                )
                            }

                            Icon(

                                imageVector =
                                    Icons.Default.CheckCircle,

                                contentDescription =
                                    null,

                                tint =
                                    Color.White,

                                modifier =
                                    Modifier.size(38.dp)
                            )
                        }

                        Spacer(
                            modifier =
                                Modifier.height(16.dp)
                        )

                        LinearProgressIndicator(

                            progress = {
                                progress
                            },

                            modifier =
                                Modifier
                                    .fillMaxWidth()
                                    .height(8.dp),

                            color =
                                Color.White,

                            trackColor =
                                Color.White.copy(
                                    alpha = 0.22f
                                )
                        )
                    }
                }
            }
        }


        // ----------------------------------------------------
        // ACTION BUTTONS
        // ----------------------------------------------------

        item {

            Row(

                modifier =
                    Modifier.fillMaxWidth(),

                horizontalArrangement =
                    Arrangement.spacedBy(10.dp)
            ) {

                Button(

                    onClick = {
                        showAddDialog = true
                    },

                    modifier =
                        Modifier.weight(1f),

                    shape =
                        RoundedCornerShape(14.dp),

                    colors =
                        ButtonDefaults.buttonColors(
                            containerColor =
                                Color(0xFF6750E8)
                        )
                ) {

                    Icon(

                        imageVector =
                            Icons.Default.Add,

                        contentDescription =
                            null,

                        modifier =
                            Modifier.size(18.dp)
                    )

                    Spacer(
                        modifier =
                            Modifier.width(5.dp)
                    )

                    Text("Add Quest")
                }


                OutlinedButton(

                    onClick = {
                        showHistory =
                            !showHistory
                    },

                    modifier =
                        Modifier.weight(1f),

                    shape =
                        RoundedCornerShape(14.dp)
                ) {

                    Icon(

                        imageVector =
                            Icons.Default.History,

                        contentDescription =
                            null,

                        modifier =
                            Modifier.size(18.dp)
                    )

                    Spacer(
                        modifier =
                            Modifier.width(5.dp)
                    )

                    Text(

                        if (showHistory)
                            "Active"
                        else
                            "History"
                    )
                }
            }
        }


        // ====================================================
        // HISTORY
        // ====================================================

        if (showHistory) {

            item {

                Text(

                    text =
                        "Completed Quests",

                    fontSize =
                        21.sp,

                    fontWeight =
                        FontWeight.Bold
                )
            }


            if (isHistoryLoading) {

                item {

                    Row(

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(30.dp),

                        horizontalArrangement =
                            Arrangement.Center
                    ) {

                        CircularProgressIndicator()
                    }
                }
            }


            if (
                !isHistoryLoading &&
                history.isEmpty()
            ) {

                item {

                    EmptyHistoryCard()
                }
            }


            items(

                items =
                    history,

                key = {
                    it.id
                }

            ) { item ->

                HistoryCard(
                    item = item
                )
            }

        } else {


            // =================================================
            // ACTIVE QUESTS
            // =================================================

            item {

                Text(

                    text =
                        "Today's Quests",

                    fontSize =
                        21.sp,

                    fontWeight =
                        FontWeight.Bold
                )
            }


            if (isLoading) {

                item {

                    Row(

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(30.dp),

                        horizontalArrangement =
                            Arrangement.Center
                    ) {

                        CircularProgressIndicator()
                    }
                }
            }


            if (
                !isLoading &&
                quests.isEmpty()
            ) {

                item {

                    EmptyQuestCard(

                        onAdd = {
                            showAddDialog = true
                        }
                    )
                }
            }


            items(

                items =
                    quests,

                key = {
                    it.id
                }

            ) { quest ->

                QuestCard(

                    quest =
                        quest,

                    isCompleting =
                        completingQuestId ==
                            quest.id,

                    onComplete = {

                        if (
                            completingQuestId ==
                            null
                        ) {

                            completingQuestId =
                                quest.id
                        }
                    }
                )
            }
        }
    }


    // ========================================================
    // ADD QUEST DIALOG
    // ========================================================

    if (showAddDialog) {

        AddQuestDialog(

            isCreating =
                isCreating,

            onDismiss = {

                if (!isCreating) {

                    showAddDialog =
                        false
                }
            },

            onCreate = { request ->

                /*
                 * IMPORTANT:
                 *
                 * We do NOT call the API here.
                 *
                 * We simply store the request.
                 *
                 * The LaunchedEffect above will perform
                 * the actual API request.
                 */

                pendingCreateQuest =
                    request
            }
        )
    }
}


// ============================================================
// QUEST CARD
// ============================================================

@Composable
private fun QuestCard(

    quest: QuestUi,

    isCompleting: Boolean,

    onComplete: () -> Unit

) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(20.dp),

        elevation =
            CardDefaults.cardElevation(
                defaultElevation = 1.dp
            )
    ) {

        Column(

            modifier =
                Modifier.padding(18.dp)
        ) {

            Row(

                verticalAlignment =
                    Alignment.Top
            ) {

                Card(

                    modifier =
                        Modifier.size(46.dp),

                    shape =
                        RoundedCornerShape(14.dp),

                    colors =
                        CardDefaults.cardColors(
                            containerColor =
                                Color(0xFFEDE9FF)
                        )
                ) {

                    Icon(

                        imageVector =
                            Icons.Default.Star,

                        contentDescription =
                            null,

                        tint =
                            Color(0xFF6750E8),

                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
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
                            quest.title,

                        fontSize =
                            17.sp,

                        fontWeight =
                            FontWeight.Bold
                    )


                    if (
                        quest.description.isNotBlank()
                    ) {

                        Spacer(
                            modifier =
                                Modifier.height(4.dp)
                        )

                        Text(

                            text =
                                quest.description,

                            fontSize =
                                13.sp,

                            color =
                                Color(0xFF77747F)
                        )
                    }


                    Spacer(
                        modifier =
                            Modifier.height(8.dp)
                    )


                    Row(

                        horizontalArrangement =
                            Arrangement.spacedBy(8.dp)
                    ) {

                        InfoChip(
                            text =
                                quest.difficulty
                        )

                        InfoChip(
                            text =
                                quest.attribute
                        )
                    }
                }
            }


            Spacer(
                modifier =
                    Modifier.height(16.dp)
            )


            Row(

                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                RewardText(
                    text =
                        "+${quest.xp} XP",

                    color =
                        Color(0xFF6750E8)
                )

                Spacer(
                    modifier =
                        Modifier.size(10.dp)
                )

                RewardText(
                    text =
                        "+${quest.gold} Gold",

                    color =
                        Color(0xFFD88A00)
                )

                Spacer(
                    modifier =
                        Modifier.weight(1f)
                )


                Button(

                    onClick =
                        onComplete,

                    enabled =
                        !isCompleting,

                    shape =
                        RoundedCornerShape(12.dp),

                    colors =
                        ButtonDefaults.buttonColors(
                            containerColor =
                                Color(0xFF6750E8)
                        )
                ) {

                    if (isCompleting) {

                        CircularProgressIndicator(

                            modifier =
                                Modifier.size(18.dp),

                            color =
                                Color.White,

                            strokeWidth =
                                2.dp
                        )

                    } else {

                        Icon(

                            imageVector =
                                Icons.Default.Check,

                            contentDescription =
                                null,

                            modifier =
                                Modifier.size(18.dp)
                        )

                        Spacer(
                            modifier =
                                Modifier.size(5.dp)
                        )

                        Text("Complete")
                    }
                }
            }
        }
    }
}


// ============================================================
// ADD QUEST DIALOG
// ============================================================

@Composable
private fun AddQuestDialog(

    isCreating: Boolean,

    onDismiss: () -> Unit,

    onCreate:
        (CreateQuestRequest) -> Unit

) {

    var title by remember {
        mutableStateOf("")
    }

    var description by remember {
        mutableStateOf("")
    }

    var category by remember {
        mutableStateOf("")
    }

    var difficulty by remember {
        mutableStateOf("EASY")
    }

    var attribute by remember {
        mutableStateOf("DISCIPLINE")
    }

    var xpReward by remember {
        mutableStateOf("25")
    }

    var goldReward by remember {
        mutableStateOf("10")
    }

    var attributeReward by remember {
        mutableStateOf("1")
    }


    val valid =

        title.isNotBlank() &&

        category.isNotBlank() &&

        (xpReward.toIntOrNull() ?: 0) >= 1 &&

        (goldReward.toIntOrNull() ?: -1) >= 0 &&

        (attributeReward.toIntOrNull() ?: 0) >= 1


    AlertDialog(

        onDismissRequest =
            onDismiss,


        title = {

            Text(

                text =
                    "Create Quest",

                fontWeight =
                    FontWeight.Bold
            )
        },


        text = {

            LazyColumn(

                verticalArrangement =
                    Arrangement.spacedBy(10.dp)
            ) {

                item {

                    OutlinedTextField(

                        value =
                            title,

                        onValueChange = {
                            title = it
                        },

                        label = {
                            Text("Title")
                        },

                        singleLine = true,

                        modifier =
                            Modifier.fillMaxWidth()
                    )
                }


                item {

                    OutlinedTextField(

                        value =
                            description,

                        onValueChange = {
                            description = it
                        },

                        label = {
                            Text("Description")
                        },

                        modifier =
                            Modifier.fillMaxWidth()
                    )
                }


                item {

                    OutlinedTextField(

                        value =
                            category,

                        onValueChange = {
                            category = it
                        },

                        label = {
                            Text("Category")
                        },

                        placeholder = {
                            Text(
                                "Study, Fitness, Personal..."
                            )
                        },

                        singleLine = true,

                        modifier =
                            Modifier.fillMaxWidth()
                    )
                }


                item {

                    Text(

                        text =
                            "Difficulty",

                        fontWeight =
                            FontWeight.SemiBold
                    )
                }


                item {

                    Row(

                        horizontalArrangement =
                            Arrangement.spacedBy(6.dp)
                    ) {

                        listOf(
                            "EASY",
                            "MEDIUM",
                            "HARD",
                            "EPIC"
                        ).forEach { option ->

                            FilterChip(

                                selected =
                                    difficulty ==
                                        option,

                                onClick = {

                                    difficulty =
                                        option
                                },

                                label = {

                                    Text(option)
                                }
                            )
                        }
                    }
                }


                item {

                    Text(

                        text =
                            "Attribute",

                        fontWeight =
                            FontWeight.SemiBold
                    )
                }


                item {

                    Column {

                        Row(

                            horizontalArrangement =
                                Arrangement.spacedBy(5.dp)
                        ) {

                            listOf(
                                "STRENGTH",
                                "INTELLECT"
                            ).forEach { option ->

                                FilterChip(

                                    selected =
                                        attribute ==
                                            option,

                                    onClick = {

                                        attribute =
                                            option
                                    },

                                    label = {

                                        Text(
                                            option
                                                .lowercase()
                                                .replaceFirstChar {
                                                    it.uppercase()
                                                }
                                        )
                                    }
                                )
                            }
                        }


                        Row(

                            horizontalArrangement =
                                Arrangement.spacedBy(5.dp)
                        ) {

                            listOf(
                                "DISCIPLINE",
                                "CREATIVITY"
                            ).forEach { option ->

                                FilterChip(

                                    selected =
                                        attribute ==
                                            option,

                                    onClick = {

                                        attribute =
                                            option
                                    },

                                    label = {

                                        Text(
                                            option
                                                .lowercase()
                                                .replaceFirstChar {
                                                    it.uppercase()
                                                }
                                        )
                                    }
                                )
                            }
                        }
                    }
                }


                item {

                    Row(

                        horizontalArrangement =
                            Arrangement.spacedBy(8.dp)
                    ) {

                        OutlinedTextField(

                            value =
                                xpReward,

                            onValueChange = {
                                xpReward = it
                            },

                            label = {
                                Text("XP")
                            },

                            singleLine = true,

                            modifier =
                                Modifier.weight(1f)
                        )


                        OutlinedTextField(

                            value =
                                goldReward,

                            onValueChange = {
                                goldReward = it
                            },

                            label = {
                                Text("Gold")
                            },

                            singleLine = true,

                            modifier =
                                Modifier.weight(1f)
                        )
                    }
                }


                item {

                    OutlinedTextField(

                        value =
                            attributeReward,

                        onValueChange = {
                            attributeReward = it
                        },

                        label = {
                            Text(
                                "Attribute Points"
                            )
                        },

                        singleLine = true,

                        modifier =
                            Modifier.fillMaxWidth()
                    )
                }
            }
        },


        confirmButton = {

            Button(

                onClick = {

                    onCreate(

                        CreateQuestRequest(

                            title =
                                title.trim(),

                            description =
                                description.trim(),

                            category =
                                category.trim(),

                            difficulty =
                                difficulty,

                            attribute =
                                attribute,

                            xpReward =
                                xpReward.toInt(),

                            goldReward =
                                goldReward.toInt(),

                            attributeReward =
                                attributeReward.toInt()
                        )
                    )
                },

                enabled =
                    valid &&
                    !isCreating
            ) {

                if (isCreating) {

                    CircularProgressIndicator(

                        modifier =
                            Modifier.size(18.dp),

                        strokeWidth =
                            2.dp
                    )

                } else {

                    Text(
                        "Create Quest"
                    )
                }
            }
        },


        dismissButton = {

            TextButton(

                onClick =
                    onDismiss,

                enabled =
                    !isCreating
            ) {

                Text("Cancel")
            }
        }
    )
}


// ============================================================
// EMPTY QUEST CARD
// ============================================================

@Composable
private fun EmptyQuestCard(
    onAdd: () -> Unit
) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(22.dp),

        colors =
            CardDefaults.cardColors(
                containerColor =
                    Color(0xFFF4F1FF)
            )
    ) {

        Column(

            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(28.dp),

            horizontalAlignment =
                Alignment.CenterHorizontally
        ) {

            Text(
                text =
                    "⚔️",

                fontSize =
                    42.sp
            )

            Spacer(
                modifier =
                    Modifier.height(10.dp)
            )

            Text(

                text =
                    "No active quests",

                fontSize =
                    18.sp,

                fontWeight =
                    FontWeight.Bold
            )

            Spacer(
                modifier =
                    Modifier.height(5.dp)
            )

            Text(

                text =
                    "Create your first quest and start progressing.",

                fontSize =
                    13.sp,

                color =
                    Color(0xFF77747F)
            )

            Spacer(
                modifier =
                    Modifier.height(14.dp)
            )

            Button(

                onClick =
                    onAdd,

                shape =
                    RoundedCornerShape(12.dp)
            ) {

                Icon(

                    imageVector =
                        Icons.Default.Add,

                    contentDescription =
                        null,

                    modifier =
                        Modifier.size(18.dp)
                )

                Spacer(
                    modifier =
                        Modifier.size(5.dp)
                )

                Text(
                    "Create Quest"
                )
            }
        }
    }
}


// ============================================================
// EMPTY HISTORY
// ============================================================

@Composable
private fun EmptyHistoryCard() {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(22.dp)
    ) {

        Column(

            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(28.dp),

            horizontalAlignment =
                Alignment.CenterHorizontally
        ) {

            Text(
                text =
                    "📜",

                fontSize =
                    38.sp
            )

            Spacer(
                modifier =
                    Modifier.height(8.dp)
            )

            Text(

                text =
                    "No completed quests yet",

                fontSize =
                    17.sp,

                fontWeight =
                    FontWeight.Bold
            )

            Spacer(
                modifier =
                    Modifier.height(5.dp)
            )

            Text(

                text =
                    "Complete a quest and it will appear here.",

                fontSize =
                    13.sp,

                color =
                    Color(0xFF77747F)
            )
        }
    }
}


// ============================================================
// HISTORY CARD
// ============================================================

@Composable
private fun HistoryCard(
    item: HistoryUi
) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(18.dp)
    ) {

        Row(

            modifier =
                Modifier.padding(17.dp),

            verticalAlignment =
                Alignment.CenterVertically
        ) {

            Icon(

                imageVector =
                    Icons.Default.CheckCircle,

                contentDescription =
                    null,

                tint =
                    Color(0xFF00A37A),

                modifier =
                    Modifier.size(30.dp)
            )

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
                        item.title,

                    fontWeight =
                        FontWeight.Bold
                )

                Spacer(
                    modifier =
                        Modifier.height(3.dp)
                )

                Text(

                    text =
                        "+${item.xp} XP  •  +${item.gold} Gold",

                    fontSize =
                        12.sp,

                    color =
                        Color(0xFF77747F)
                )

                if (
                    item.completedAt.isNotBlank()
                ) {

                    Text(

                        text =
                            item.completedAt
                                .replace(
                                    "T",
                                    " "
                                )
                                .take(19),

                        fontSize =
                            11.sp,

                        color =
                            Color(0xFF99969F)
                    )
                }
            }
        }
    }
}


// ============================================================
// INFO CHIP
// ============================================================

@Composable
private fun InfoChip(
    text: String
) {

    Text(

        text =
            text,

        fontSize =
            10.sp,

        fontWeight =
            FontWeight.Bold,

        color =
            Color(0xFF6750E8)
    )
}


// ============================================================
// REWARD TEXT
// ============================================================

@Composable
private fun RewardText(

    text: String,

    color: Color

) {

    Text(

        text =
            text,

        fontSize =
            12.sp,

        fontWeight =
            FontWeight.Bold,

        color =
            color
    )
}