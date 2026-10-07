package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit
) {

    val coroutineScope =
        rememberCoroutineScope()

    var showDeleteDialog by remember {
        mutableStateOf(false)
    }

    var isDeleting by remember {
        mutableStateOf(false)
    }

    var deleteError by remember {
        mutableStateOf<String?>(null)
    }

    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(
            start = 20.dp,
            top = 20.dp,
            end = 20.dp,
            bottom = 24.dp
        ),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {

        item {

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {

                IconButton(
                    onClick = onBack
                ) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back"
                    )
                }

                Column {

                    Text(
                        text = "Settings",
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Manage your Life Easy preferences",
                        fontSize = 14.sp,
                        color = Color(0xFF77747F)
                    )
                }
            }
        }

        item {

            SettingsItem(
                icon = {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = null
                    )
                },
                title = "Notifications",
                subtitle = "Manage reminders and alerts"
            )
        }

        item {

            SettingsItem(
                icon = {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null
                    )
                },
                title = "About Life Easy",
                subtitle = "Version 1.0"
            )
        }

        /*
         * =====================================================
         * DELETE ACCOUNT
         * =====================================================
         */

        item {

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                )
            ) {

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(17.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = null,
                        tint = Color(0xFFD32F2F)
                    )

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 13.dp)
                    ) {

                        Text(
                            text = "Delete Account",
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFD32F2F)
                        )

                        Text(
                            text = "Permanently delete your Life Easy account",
                            fontSize = 12.sp,
                            color = Color(0xFF77747F)
                        )
                    }

                    IconButton(
                        onClick = {
                            if (!isDeleting) {
                                deleteError = null
                                showDeleteDialog = true
                            }
                        }
                    ) {

                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Account",
                            tint = Color(0xFFD32F2F)
                        )
                    }
                }
            }
        }

        /*
         * =====================================================
         * LOGOUT
         * =====================================================
         */

        item {

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color.White
                )
            ) {

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(17.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {

                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        tint = Color(0xFFD32F2F)
                    )

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 13.dp)
                    ) {

                        Text(
                            text = "Logout",
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFD32F2F)
                        )

                        Text(
                            text = "Sign out of your Life Easy account",
                            fontSize = 12.sp,
                            color = Color(0xFF77747F)
                        )
                    }

                    IconButton(
                        onClick = onLogout
                    ) {
                        Icon(
                            imageVector = Icons.Default.Logout,
                            contentDescription = "Logout",
                            tint = Color(0xFFD32F2F)
                        )
                    }
                }
            }
        }
    }

    /*
     * =========================================================
     * DELETE ACCOUNT CONFIRMATION
     * =========================================================
     */

    if (showDeleteDialog) {

        AlertDialog(
            onDismissRequest = {
                if (!isDeleting) {
                    showDeleteDialog = false
                }
            },

            icon = {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = Color(0xFFD32F2F)
                )
            },

            title = {
                Text(
                    text = "Delete Account?"
                )
            },

            text = {

                Column {

                    Text(
                        text = "This action cannot be undone."
                    )

                    androidx.compose.foundation.layout.Spacer(
                        modifier = Modifier.padding(
                            top = 4.dp
                        )
                    )

                    Text(
                        text = "Your character, quests, rewards, inventory, hydration data and other account data will be permanently deleted.",
                        fontSize = 14.sp,
                        color = Color(0xFF77747F)
                    )

                    deleteError?.let { error ->

                        androidx.compose.foundation.layout.Spacer(
                            modifier = Modifier.padding(
                                top = 8.dp
                            )
                        )

                        Text(
                            text = error,
                            fontSize = 13.sp,
                            color = Color(0xFFD32F2F)
                        )
                    }
                }
            },

            confirmButton = {

                TextButton(
                    enabled = !isDeleting,
                    onClick = {

                        isDeleting = true
                        deleteError = null

                        coroutineScope.launch {

                            try {

                                /*
                                 * Firebase account deletion.
                                 *
                                 * Firebase onDelete trigger will
                                 * clean the corresponding backend
                                 * account/data.
                                 */

                                FirebaseAuthManager
                                    .deleteAccount()
                                    

                                showDeleteDialog = false
                                isDeleting = false

                                onLogout()

                            } catch (error: Exception) {

                                isDeleting = false

                                deleteError =
                                    error.message
                                        ?: "Failed to delete account."
                            }
                        }
                    }
                ) {

                    if (isDeleting) {

                        CircularProgressIndicator(
                            modifier = Modifier.padding(end = 8.dp),
                            strokeWidth = 2.dp
                        )

                    } else {

                        Text(
                            text = "Delete"
                        )
                    }
                }
            },

            dismissButton = {

                TextButton(
                    enabled = !isDeleting,
                    onClick = {
                        showDeleteDialog = false
                        deleteError = null
                    }
                ) {

                    Text(
                        text = "Cancel"
                    )
                }
            }
        )
    }
}

@Composable
private fun SettingsItem(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String
) {

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        )
    ) {

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(17.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {

            icon()

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 13.dp)
            ) {

                Text(
                    text = title,
                    fontWeight = FontWeight.SemiBold
                )

                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = Color(0xFF77747F)
                )
            }
        }
    }
}