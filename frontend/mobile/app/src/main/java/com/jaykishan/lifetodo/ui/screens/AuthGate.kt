package com.jaykishan.lifetodo.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import com.jaykishan.lifetodo.ui.LifeEasyApp

@Composable
fun AuthGate() {

    var isLoggedIn by remember {

        mutableStateOf(
            FirebaseAuthManager.currentUser() != null
        )
    }

    if (isLoggedIn) {
    LifeEasyApp(
        onLogout = {
            FirebaseAuthManager.signOut()
            isLoggedIn = false
        }
    )
} else {
    LoginScreen(
        onLoginSuccess = {
            isLoggedIn = true
        }
    )
}
}