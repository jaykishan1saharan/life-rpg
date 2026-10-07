package com.jaykishan.lifetodo.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import com.jaykishan.lifetodo.data.FirebaseAuthManager
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {

    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var email by remember {
        mutableStateOf("")
    }

    var password by remember {
        mutableStateOf("")
    }

    var isLoading by remember {
        mutableStateOf(false)
    }

    var isGoogleLoading by remember {
        mutableStateOf(false)
    }

    var errorMessage by remember {
        mutableStateOf<String?>(null)
    }

    var isRegisterMode by remember {
        mutableStateOf(false)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),

        horizontalAlignment = Alignment.CenterHorizontally,

        verticalArrangement = Arrangement.Center
    ) {

        Text(
            text = "Life Easy TODO",
            style = MaterialTheme.typography.headlineMedium
        )

        Spacer(
            modifier = Modifier.height(8.dp)
        )

        Text(
            text = if (isRegisterMode)
                "Create your account"
            else
                "Welcome back"
        )

        Spacer(
            modifier = Modifier.height(32.dp)
        )

        OutlinedTextField(
            value = email,

            onValueChange = {
                email = it
                errorMessage = null
            },

            modifier = Modifier.fillMaxWidth(),

            label = {
                Text("Email")
            },

            singleLine = true
        )

        Spacer(
            modifier = Modifier.height(12.dp)
        )

        OutlinedTextField(
            value = password,

            onValueChange = {
                password = it
                errorMessage = null
            },

            modifier = Modifier.fillMaxWidth(),

            label = {
                Text("Password")
            },

            singleLine = true,

            visualTransformation =
                PasswordVisualTransformation()
        )

        Spacer(
            modifier = Modifier.height(20.dp)
        )

        if (errorMessage != null) {

            Text(
                text = errorMessage!!,
                color = MaterialTheme.colorScheme.error
            )

            Spacer(
                modifier = Modifier.height(12.dp)
            )
        }

        Button(
            onClick = {

                if (email.isBlank()) {

                    errorMessage = "Enter your email"
                    return@Button
                }

                if (password.isBlank()) {

                    errorMessage = "Enter your password"
                    return@Button
                }

                if (password.length < 6) {

                    errorMessage =
                        "Password must be at least 6 characters"

                    return@Button
                }

                isLoading = true
                errorMessage = null
            },

            modifier = Modifier.fillMaxWidth(),

            enabled =
                !isLoading &&
                !isGoogleLoading
        ) {

            if (isLoading) {

                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp)
                )

            } else {

                Text(
                    text = if (isRegisterMode)
                        "Create Account"
                    else
                        "Login"
                )
            }
        }

        LaunchedEffect(
            isLoading
        ) {

            if (!isLoading) {
                return@LaunchedEffect
            }

            val result =
                if (isRegisterMode) {

                    FirebaseAuthManager.signUp(
                        email = email,
                        password = password
                    )

                } else {

                    FirebaseAuthManager.signIn(
                        email = email,
                        password = password
                    )
                }

            result.fold(

                onSuccess = {

                    isLoading = false
                    onLoginSuccess()
                },

                onFailure = { error ->

                    isLoading = false

                    errorMessage =
                        error.message
                            ?: "Authentication failed"
                }
            )
        }

        Spacer(
            modifier = Modifier.height(20.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {

            HorizontalDivider(
                modifier = Modifier.weight(1f)
            )

            Text(
                text = "  OR  ",
                style = MaterialTheme.typography.bodySmall
            )

            HorizontalDivider(
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(
            modifier = Modifier.height(16.dp)
        )

        OutlinedButton(
            onClick = {

                if (isGoogleLoading) {
                    return@OutlinedButton
                }

                errorMessage = null
                isGoogleLoading = true

                scope.launch {

                    val result =
                        FirebaseAuthManager.signInWithGoogle(
                            context
                        )

                    result.fold(

                        onSuccess = {

                            isGoogleLoading = false
                            onLoginSuccess()
                        },

                        onFailure = { error ->

                            isGoogleLoading = false

                            errorMessage =
                                error.message
                                    ?: "Google Sign-In failed"
                        }
                    )
                }
            },

            modifier = Modifier.fillMaxWidth(),

            enabled =
                !isLoading &&
                !isGoogleLoading
        ) {

            if (isGoogleLoading) {

                CircularProgressIndicator(
                    modifier = Modifier.height(20.dp)
                )

            } else {

                Text(
                    text = "G",
                    fontWeight = FontWeight.Bold
                )

                Spacer(
                    modifier = Modifier.height(0.dp)
                )

                Text(
                    text = "  Continue with Google"
                )
            }
        }

        Spacer(
            modifier = Modifier.height(12.dp)
        )

        TextButton(
            onClick = {

                isRegisterMode =
                    !isRegisterMode

                errorMessage = null
            },

            enabled =
                !isLoading &&
                !isGoogleLoading
        ) {

            Text(
                text = if (isRegisterMode)
                    "Already have an account? Login"
                else
                    "Don't have an account? Create one"
            )
        }
    }
}