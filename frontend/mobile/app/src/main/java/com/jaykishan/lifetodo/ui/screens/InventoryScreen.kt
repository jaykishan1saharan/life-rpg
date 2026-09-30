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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CardGiftcard
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
import org.json.JSONArray
import org.json.JSONObject

private data class InventoryItemUi(
    val id: String,
    val name: String,
    val description: String,
    val type: String,
    val icon: String
)

@Composable
fun InventoryScreen(
    paddingValues: PaddingValues,
    onBack: () -> Unit
) {

    val context = LocalContext.current

    var items by remember {
        mutableStateOf<List<InventoryItemUi>>(emptyList())
    }

    LaunchedEffect(Unit) {

        try {

            val token =
                FirebaseAuthManager.getIdToken()

            if (token.isNullOrBlank()) {

                Toast.makeText(
                    context,
                    "Please login again.",
                    Toast.LENGTH_SHORT
                ).show()

                return@LaunchedEffect
            }

            val result =
                ApiClient.get(
                    path = "/inventory",
                    token = token
                )

            val response =
                result.getOrElse { throw it }

            val array =
                JSONArray(response)

            val mappedItems =
                mutableListOf<InventoryItemUi>()

            for (index in 0 until array.length()) {

                val item =
                    array.optJSONObject(index)
                        ?: continue

                val id =
                    item.optString("id")

                if (id.isBlank()) {
                    continue
                }

                val name =
                    item.optString(
                        "name",
                        "Reward"
                    )

                val description =
                    item.optString(
                        "description",
                        "A purchased reward."
                    )

                val type =
                    item.optString(
                        "type",
                        "ITEM"
                    )

                val metadata =
                    item.optJSONObject("metadata")

                val icon =
                    getInventoryIcon(
                        metadata = metadata,
                        type = type,
                        name = name
                    )

                mappedItems.add(
                    InventoryItemUi(
                        id = id,
                        name = name,
                        description = description,
                        type = type,
                        icon = icon
                    )
                )
            }

            items = mappedItems

        } catch (error: Exception) {

            Toast.makeText(
                context,
                error.message
                    ?: "Failed to load inventory.",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

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

        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
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

                Column {

                    Text(
                        text = "Inventory",
                        fontSize = 30.sp,
                        fontWeight =
                            FontWeight.Bold
                    )

                    Text(
                        text =
                            "Your owned rewards.",
                        fontSize = 14.sp,
                        color =
                            Color(0xFF77747F)
                    )
                }
            }
        }

        if (items.isEmpty()) {

            item {

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
                            Modifier
                                .fillMaxWidth()
                                .padding(24.dp),

                        horizontalAlignment =
                            Alignment.CenterHorizontally
                    ) {

                        Text(
                            text = "🎒",
                            fontSize = 42.sp
                        )

                        Spacer(
                            modifier =
                                Modifier.height(10.dp)
                        )

                        Text(
                            text =
                                "Inventory is empty",
                            fontSize = 18.sp,
                            fontWeight =
                                FontWeight.Bold
                        )

                        Spacer(
                            modifier =
                                Modifier.height(4.dp)
                        )

                        Text(
                            text =
                                "Visit Rewards to unlock your first item.",
                            fontSize = 13.sp,
                            color =
                                Color(0xFF77747F)
                        )
                    }
                }
            }

        } else {

            item {

                Text(
                    text = "Your Collection",
                    fontSize = 20.sp,
                    fontWeight =
                        FontWeight.Bold
                )
            }

            items(
                items = items,
                key = { it.id }
            ) { item ->

                InventoryCard(
                    item = item
                )
            }
        }
    }
}

@Composable
private fun InventoryCard(
    item: InventoryItemUi
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

            Row(
                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                Text(
                    text = item.icon,
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
                        text = item.name,
                        fontSize = 17.sp,
                        fontWeight =
                            FontWeight.Bold
                    )

                    Spacer(
                        modifier =
                            Modifier.height(3.dp)
                    )

                    Text(
                        text = item.description,
                        fontSize = 12.sp,
                        color =
                            Color(0xFF77747F)
                    )
                }
            }

            Spacer(
                modifier =
                    Modifier.height(14.dp)
            )

            Row(
                verticalAlignment =
                    Alignment.CenterVertically
            ) {

                Text(
                    text = item.type,
                    fontSize = 11.sp,
                    fontWeight =
                        FontWeight.Bold,
                    color =
                        Color(0xFF6750E8)
                )

                Spacer(
                    modifier =
                        Modifier.weight(1f)
                )

                Icon(
                    imageVector =
                        Icons.Default.CardGiftcard,
                    contentDescription =
                        null,
                    tint =
                        Color(0xFFFFA000),
                    modifier =
                        Modifier.size(22.dp)
                )
            }
        }
    }
}

private fun getInventoryIcon(
    metadata: JSONObject?,
    type: String,
    name: String
): String {

    val metadataIcon =
        metadata
            ?.optString("icon")
            ?.trim()

    if (!metadataIcon.isNullOrBlank()) {
        return metadataIcon
    }

    return when (type.uppercase()) {

        "THEME" -> "🎨"

        "BADGE" -> "🏅"

        "ITEM" -> {

            val lowerName =
                name.lowercase()

            when {

                "movie" in lowerName ->
                    "🎬"

                "game" in lowerName ->
                    "🎮"

                "break" in lowerName ->
                    "☕"

                "food" in lowerName ->
                    "🍔"

                "music" in lowerName ->
                    "🎵"

                "book" in lowerName ->
                    "📚"

                else ->
                    "🎁"
            }
        }

        else -> "🎁"
    }
}