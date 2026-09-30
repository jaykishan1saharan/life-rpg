package com.jaykishan.lifetodo.ui.screens

import android.widget.Toast
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jaykishan.lifetodo.data.ApiClient
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private data class RewardUi(
    val id: String,
    val title: String,
    val description: String,
    val cost: Int,
    val icon: String,
    val owned: Boolean
)

@Composable
fun RewardsScreen(
    paddingValues: PaddingValues,
    onOpenInventory: () -> Unit
) {

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var gold by remember {
        mutableStateOf(0)
    }

    var rewards by remember {
        mutableStateOf<List<RewardUi>>(emptyList())
    }

    var purchasingId by remember {
        mutableStateOf<String?>(null)
    }

    /*
     * ===================================================
     * LOAD REWARDS
     * ===================================================
     */

    suspend fun loadRewards() {

        try {

            val token =
                FirebaseAuthManager.getIdToken()

            if (token.isNullOrBlank()) {

                Toast.makeText(
                    context,
                    "Please login again.",
                    Toast.LENGTH_SHORT
                ).show()

                return
            }

            /*
             * ---------------------------------------------------
             * GET CURRENT USER / CHARACTER
             * ---------------------------------------------------
             */

            val meResult =
                ApiClient.get(
                    "/users/me",
                    token
                )

            val meJson =
                meResult.getOrElse {
                    throw it
                }

            val meObject =
                JSONObject(meJson)

            val character =
                meObject.optJSONObject("character")

            gold =
                character?.optInt(
                    "gold",
                    0
                ) ?: 0

            /*
             * ---------------------------------------------------
             * GET REWARD SHOP
             * ---------------------------------------------------
             */

            val rewardsResult =
                ApiClient.get(
                    "/rewards",
                    token
                )

            val rewardsJson =
                rewardsResult.getOrElse {
                    throw it
                }

            val rewardsArray =
                JSONArray(rewardsJson)

            /*
             * ---------------------------------------------------
             * GET USER INVENTORY
             * ---------------------------------------------------
             */

            val inventoryResult =
                ApiClient.get(
                    "/inventory",
                    token
                )

            val inventoryJson =
                inventoryResult.getOrElse {
                    throw it
                }

            val inventoryArray =
                JSONArray(inventoryJson)

            /*
             * ---------------------------------------------------
             * FIND OWNED ITEM IDS
             * ---------------------------------------------------
             */

            val ownedItemIds =
                mutableSetOf<String>()

            for (index in 0 until inventoryArray.length()) {

                val inventoryItem =
                    inventoryArray.optJSONObject(index)
                        ?: continue

                val itemId =
                    inventoryItem.optString(
                        "item_id"
                    )

                if (itemId.isNotBlank()) {
                    ownedItemIds.add(itemId)
                }
            }

            /*
             * ---------------------------------------------------
             * MAP BACKEND REWARDS → UI
             * ---------------------------------------------------
             */

            val mappedRewards =
                mutableListOf<RewardUi>()

            for (index in 0 until rewardsArray.length()) {

                val item =
                    rewardsArray.optJSONObject(index)
                        ?: continue

                val id =
                    item.optString("id")

                if (id.isBlank()) {
                    continue
                }

                val title =
                    item.optString(
                        "name",
                        "Reward"
                    )

                val description =
                    item.optString(
                        "description",
                        "A reward from the Life RPG reward shop."
                    )

                val cost =
                    item.optInt(
                        "price",
                        0
                    )

                val type =
                    item.optString(
                        "type",
                        "ITEM"
                    )

                val metadata =
                    item.optJSONObject(
                        "metadata"
                    )

                val icon =
                    getRewardIcon(
                        metadata = metadata,
                        type = type,
                        title = title
                    )

                val owned =
                    ownedItemIds.contains(id)

                mappedRewards.add(
                    RewardUi(
                        id = id,
                        title = title,
                        description = description,
                        cost = cost,
                        icon = icon,
                        owned = owned
                    )
                )
            }

            rewards =
                mappedRewards

        } catch (error: Exception) {

            Toast.makeText(
                context,
                error.message
                    ?: "Failed to load rewards.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /*
     * ===================================================
     * INITIAL LOAD
     * ===================================================
     */

    LaunchedEffect(Unit) {

        loadRewards()
    }

    /*
     * ===================================================
     * PURCHASE REWARD
     * ===================================================
     */

    fun purchaseReward(
        reward: RewardUi
    ) {

        if (purchasingId != null) {
            return
        }

        if (reward.owned) {
            return
        }

        if (gold < reward.cost) {

            Toast.makeText(
                context,
                "Not enough gold.",
                Toast.LENGTH_SHORT
            ).show()

            return
        }

        scope.launch {

            try {

                purchasingId =
                    reward.id

                /*
                 * ------------------------------------------------
                 * GET FIREBASE ID TOKEN
                 * ------------------------------------------------
                 */

                val token =
                    FirebaseAuthManager.getIdToken()

                if (token.isNullOrBlank()) {

                    Toast.makeText(
                        context,
                        "Please login again.",
                        Toast.LENGTH_SHORT
                    ).show()

                    return@launch
                }

                /*
                 * ------------------------------------------------
                 * PURCHASE
                 * ------------------------------------------------
                 */

                val result =
                    ApiClient.post(
                        path = "/rewards/${reward.id}/purchase",
                        token = token,
                        body = JSONObject()
                    )

                val responseJson =
                    result.getOrElse {
                        throw it
                    }

                val response =
                    JSONObject(responseJson)

                /*
                 * ------------------------------------------------
                 * UPDATE GOLD FROM BACKEND
                 * ------------------------------------------------
                 */

                val updatedCharacter =
                    response.optJSONObject(
                        "character"
                    )

                if (updatedCharacter != null) {

                    gold =
                        updatedCharacter.optInt(
                            "gold",
                            gold
                        )
                }

                /*
                 * ------------------------------------------------
                 * MARK REWARD AS OWNED
                 * ------------------------------------------------
                 */

                rewards =
                    rewards.map {

                        if (it.id == reward.id) {

                            it.copy(
                                owned = true
                            )

                        } else {

                            it
                        }
                    }

                Toast.makeText(
                    context,
                    "${reward.title} redeemed successfully!",
                    Toast.LENGTH_SHORT
                ).show()

            } catch (error: Exception) {

                val message =
                    getPurchaseErrorMessage(
                        error
                    )

                Toast.makeText(
                    context,
                    message,
                    Toast.LENGTH_SHORT
                ).show()

            } finally {

                purchasingId =
                    null
            }
        }
    }

    /*
     * ===================================================
     * UI
     * ===================================================
     */

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

        /*
         * ------------------------------------------------
         * HEADER
         * ------------------------------------------------
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
                    text = "Rewards",
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(
                    modifier = Modifier.height(4.dp)
                )

                Text(
                    text =
                        "Turn your progress into real-life rewards.",
                    fontSize = 14.sp,
                    color = Color(0xFF77747F)
                )
            }

            IconButton(
                onClick = onOpenInventory
            ) {

                Icon(
                    imageVector =
                        Icons.Default.CardGiftcard,
                    contentDescription =
                        "Inventory",
                    tint =
                        Color(0xFFFFA000)
                )
            }
        }
    }

        /*
         * ------------------------------------------------
         * GOLD CARD
         * ------------------------------------------------
         */

        item {

            Card(

                modifier =
                    Modifier.fillMaxWidth(),

                shape =
                    RoundedCornerShape(22.dp),

                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            Color(0xFFFFA000)
                    )
            ) {

                Row(

                    modifier =
                        Modifier.padding(20.dp),

                    verticalAlignment =
                        Alignment.CenterVertically
                ) {

                    Column(

                        modifier =
                            Modifier.weight(1f)
                    ) {

                        Text(
                            text = "YOUR GOLD",
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
                                "${gold} 🪙",
                            fontSize = 28.sp,
                            fontWeight =
                                FontWeight.Bold,
                            color =
                                Color.White
                        )

                        Text(
                            text =
                                "Keep completing quests.",
                            fontSize = 12.sp,
                            color =
                                Color.White.copy(
                                    alpha = 0.8f
                                )
                        )
                    }

                    Icon(
                        imageVector =
                            Icons.Default.CardGiftcard,

                        contentDescription =
                            null,

                        tint =
                            Color.White,

                        modifier =
                            Modifier.size(42.dp)
                    )
                }
            }
        }

        /*
         * ------------------------------------------------
         * SECTION TITLE
         * ------------------------------------------------
         */

        item {

            Text(
                text = "Available Rewards",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        /*
         * ------------------------------------------------
         * REWARDS
         * ------------------------------------------------
         */

        items(
            items = rewards,
            key = {
                it.id
            }
        ) { reward ->

            RewardCard(

                reward = reward,

                isPurchasing =
                    purchasingId == reward.id,

                canAfford =
                    gold >= reward.cost,

                onRedeem = {
                    purchaseReward(reward)
                }
            )
        }
    }
}


/* ===================================================
   REWARD CARD
=================================================== */

@Composable
private fun RewardCard(

    reward: RewardUi,

    isPurchasing: Boolean,

    canAfford: Boolean,

    onRedeem: () -> Unit
) {

    Card(

        modifier =
            Modifier.fillMaxWidth(),

        shape =
            RoundedCornerShape(20.dp),

        colors =
            CardDefaults.cardColors(
                containerColor =
                    Color.White
            )
    ) {

        Column(

            modifier =
                Modifier.padding(18.dp)
        ) {

            /*
             * ------------------------------------------------
             * REWARD INFO
             * ------------------------------------------------
             */

            Row(
                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                Text(
                    text = reward.icon,
                    fontSize = 32.sp
                )

                Spacer(
                    modifier =
                        Modifier.size(13.dp)
                )

                Column(
                    modifier =
                        Modifier.weight(1f)
                ) {

                    Text(
                        text = reward.title,
                        fontSize = 17.sp,
                        fontWeight =
                            FontWeight.Bold
                    )

                    Spacer(
                        modifier =
                            Modifier.height(3.dp)
                    )

                    Text(
                        text =
                            reward.description,
                        fontSize = 12.sp,
                        color =
                            Color(0xFF77747F)
                    )
                }
            }

            Spacer(
                modifier =
                    Modifier.height(16.dp)
            )

            /*
             * ------------------------------------------------
             * PRICE + ACTION
             * ------------------------------------------------
             */

            Row(
                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                Text(
                    text =
                        "${reward.cost} 🪙",

                    fontWeight =
                        FontWeight.Bold,

                    color =
                        Color(0xFFD88A00)
                )

                Spacer(
                    modifier =
                        Modifier.weight(1f)
                )

                /*
                 * ALREADY OWNED
                 */

                if (reward.owned) {

                    Button(

                        onClick = {},

                        enabled = false,

                        shape =
                            RoundedCornerShape(12.dp),

                        colors =
                            ButtonDefaults.buttonColors(
                                disabledContainerColor =
                                    Color(0xFFE8E8E8),

                                disabledContentColor =
                                    Color(0xFF77747F)
                            )
                    ) {

                        Text(
                            text = "Owned"
                        )
                    }

                }

                /*
                 * CAN PURCHASE
                 */

                else if (canAfford) {

                    Button(

                        onClick = onRedeem,

                        enabled =
                            !isPurchasing,

                        shape =
                            RoundedCornerShape(12.dp),

                        colors =
                            ButtonDefaults.buttonColors(
                                containerColor =
                                    Color(0xFF6750E8)
                            )
                    ) {

                        Text(
                            text =
                                if (isPurchasing)
                                    "Redeeming..."
                                else
                                    "Redeem"
                        )
                    }

                }

                /*
                 * NOT ENOUGH GOLD
                 */

                else {

                    Icon(

                        imageVector =
                            Icons.Default.Lock,

                        contentDescription =
                            "Locked",

                        tint =
                            Color(0xFF77747F)
                    )
                }
            }
        }
    }
}


/* ===================================================
   REWARD ICON
=================================================== */

private fun getRewardIcon(

    metadata: JSONObject?,

    type: String,

    title: String
): String {

    val metadataIcon =
        metadata
            ?.optString("icon")
            ?.trim()

    if (!metadataIcon.isNullOrBlank()) {

        return metadataIcon
    }

    return when (
        type.uppercase()
    ) {

        "THEME" ->
            "🎨"

        "BADGE" ->
            "🏅"

        "ITEM" -> {

            val lowerTitle =
                title.lowercase()

            when {

                "movie" in lowerTitle ->
                    "🎬"

                "game" in lowerTitle ->
                    "🎮"

                "break" in lowerTitle ->
                    "☕"

                "food" in lowerTitle ->
                    "🍔"

                "music" in lowerTitle ->
                    "🎵"

                "book" in lowerTitle ->
                    "📚"

                else ->
                    "🎁"
            }
        }

        else ->
            "🎁"
    }
}


/* ===================================================
   PURCHASE ERROR
=================================================== */

private fun getPurchaseErrorMessage(
    error: Exception
): String {

    val message =
        error.message
            ?.trim()
            ?.lowercase()
            ?: ""

    return when {

        "not enough gold" in message ->
            "Not enough gold."

        "reward already owned" in message ->
            "You already own this reward."

        "reward not found" in message ->
            "This reward is no longer available."

        "character not found" in message ->
            "Character not found. Please login again."

        "unauthorized" in message ->
            "Please login again."

        else ->
            error.message
                ?: "Purchase failed. Please try again."
    }
}