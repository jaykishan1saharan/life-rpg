package com.jaykishan.lifetodo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.jaykishan.lifetodo.ui.components.BottomNavigationBar
import com.jaykishan.lifetodo.ui.screens.HomeScreen
import com.jaykishan.lifetodo.ui.screens.HydrationScreen
import com.jaykishan.lifetodo.ui.screens.HydrationSettingsScreen
import com.jaykishan.lifetodo.ui.screens.ProfileScreen
import com.jaykishan.lifetodo.ui.screens.QuestsScreen
import com.jaykishan.lifetodo.ui.screens.RewardsScreen
import com.jaykishan.lifetodo.ui.screens.InventoryScreen
import com.jaykishan.lifetodo.ui.screens.SettingsScreen

import com.jaykishan.lifetodo.data.ApiClient

enum class AppScreen {
    HOME,
    QUESTS,
    HYDRATION,
    HYDRATION_SETTINGS,
    REWARDS,
    INVENTORY,
    PROFILE,
    SETTINGS
}

@Composable
fun LifeEasyApp(
    onLogout: () -> Unit
) {

    var currentScreen by remember {
        mutableStateOf(AppScreen.HOME)
    }

    val colors = androidx.compose.material3.lightColorScheme(
        primary = Color(0xFF6750E8),
        onPrimary = Color.White,

        secondary = Color(0xFF00A896),
        onSecondary = Color.White,

        background = Color(0xFFF7F7FC),
        onBackground = Color(0xFF17171C),

        surface = Color.White,
        onSurface = Color(0xFF17171C),

        surfaceVariant = Color(0xFFF0EFF7),
        onSurfaceVariant = Color(0xFF66636F)
    )

    MaterialTheme(
        colorScheme = colors
    ) {

        Scaffold(
            containerColor = colors.background,

            bottomBar = {
                if (
                    currentScreen != AppScreen.SETTINGS &&
                    currentScreen != AppScreen.INVENTORY &&
                    currentScreen != AppScreen.HYDRATION_SETTINGS
                ) {
                    BottomNavigationBar(
                        currentScreen = currentScreen,
                        onScreenSelected = {
                            currentScreen = it
                        }
                    )
                }
            }
        ) { paddingValues ->

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colors.background)
            ) {

                when (currentScreen) {

                    AppScreen.HOME -> {
                        HomeScreen(paddingValues)
                    }

                    AppScreen.QUESTS -> {
                        QuestsScreen(paddingValues)
                    }

                    AppScreen.HYDRATION -> {
                        HydrationScreen(
                            paddingValues = paddingValues,
                            onOpenSettings = {
                                currentScreen = AppScreen.HYDRATION_SETTINGS
                            }
                        )
                    }

                    AppScreen.HYDRATION_SETTINGS -> {
                        HydrationSettingsScreen(
                            paddingValues = paddingValues,
                            onBack = {
                                currentScreen = AppScreen.HYDRATION
                            }
                        )
                    }

                    AppScreen.REWARDS -> {
                        RewardsScreen(
                            paddingValues = paddingValues,
                            onOpenInventory = {
                                currentScreen = AppScreen.INVENTORY
                            }
                        )
                    }

                    AppScreen.INVENTORY -> {
                        InventoryScreen(
                            paddingValues = paddingValues,
                            onBack = {
                                currentScreen = AppScreen.REWARDS
                            }
                        )
                    }

                    AppScreen.PROFILE -> ProfileScreen(
                        paddingValues = paddingValues,
                            onOpenSettings = {
                                currentScreen = AppScreen.SETTINGS
                            }
                        )

                    AppScreen.SETTINGS -> SettingsScreen(
                        onBack = {
                            currentScreen = AppScreen.PROFILE
                        },
                        onLogout = {
                            ApiClient.clearCache()
                            onLogout()
                        }
                    )
                }
            }
        }
    }
}