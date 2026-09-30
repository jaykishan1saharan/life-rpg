package com.jaykishan.lifetodo.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.jaykishan.lifetodo.ui.AppScreen

@Composable
fun BottomNavigationBar(
    currentScreen: AppScreen,
    onScreenSelected: (AppScreen) -> Unit
) {

    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 8.dp
    ) {

        NavigationBarItem(
            selected = currentScreen == AppScreen.HOME,
            onClick = {
                onScreenSelected(AppScreen.HOME)
            },
            icon = {
                Icon(
                    Icons.Default.Home,
                    contentDescription = "Home"
                )
            },
            label = {
                Text("Home")
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF6750E8),
                selectedTextColor = Color(0xFF6750E8),
                indicatorColor = Color(0xFFEAE6FF)
            )
        )

        NavigationBarItem(
            selected = currentScreen == AppScreen.QUESTS,
            onClick = {
                onScreenSelected(AppScreen.QUESTS)
            },
            icon = {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = "Quests"
                )
            },
            label = {
                Text("Quests")
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF6750E8),
                selectedTextColor = Color(0xFF6750E8),
                indicatorColor = Color(0xFFEAE6FF)
            )
        )

        NavigationBarItem(
            selected = currentScreen == AppScreen.HYDRATION,
            onClick = {
                onScreenSelected(AppScreen.HYDRATION)
            },
            icon = {
                Icon(
                    Icons.Default.WaterDrop,
                    contentDescription = "Water"
                )
            },
            label = {
                Text("Water")
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF2196F3),
                selectedTextColor = Color(0xFF2196F3),
                indicatorColor = Color(0xFFE3F2FD)
            )
        )

        NavigationBarItem(
            selected = currentScreen == AppScreen.REWARDS,
            onClick = {
                onScreenSelected(AppScreen.REWARDS)
            },
            icon = {
                Icon(
                    Icons.Default.CardGiftcard,
                    contentDescription = "Rewards"
                )
            },
            label = {
                Text("Rewards")
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFFFFA000),
                selectedTextColor = Color(0xFFFFA000),
                indicatorColor = Color(0xFFFFF3D6)
            )
        )

        NavigationBarItem(
            selected = currentScreen == AppScreen.PROFILE,
            onClick = {
                onScreenSelected(AppScreen.PROFILE)
            },
            icon = {
                Icon(
                    Icons.Default.Person,
                    contentDescription = "Profile"
                )
            },
            label = {
                Text("Profile")
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF6750E8),
                selectedTextColor = Color(0xFF6750E8),
                indicatorColor = Color(0xFFEAE6FF)
            )
        )
    }
}