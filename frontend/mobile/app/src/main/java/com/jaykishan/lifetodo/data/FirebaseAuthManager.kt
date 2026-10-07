package com.jaykishan.lifetodo.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

object FirebaseAuthManager {

    private val auth =
        FirebaseAuth.getInstance()

    fun currentUser() =
        auth.currentUser

    suspend fun getIdToken(): String? {

        val user =
            auth.currentUser
                ?: return null

        return try {

            user.getIdToken(false)
                .await()
                .token

        } catch (error: Exception) {

            null
        }
    }

    suspend fun signIn(
        email: String,
        password: String
    ): Result<Unit> {

        return try {

            auth.signInWithEmailAndPassword(
                email.trim(),
                password
            ).await()

            Result.success(Unit)

        } catch (error: Exception) {

            Result.failure(error)
        }
    }

    suspend fun signUp(
        email: String,
        password: String
    ): Result<Unit> {

        return try {

            auth.createUserWithEmailAndPassword(
                email.trim(),
                password
            ).await()

            Result.success(Unit)

        } catch (error: Exception) {

            Result.failure(error)
        }
    }

    suspend fun signInWithGoogle(
        context: Context
    ): Result<Unit> {

        return try {

            val credentialManager =
                CredentialManager.create(context)

            val googleIdOption =
                GetGoogleIdOption.Builder()
                    .setServerClientId(
                        context.getString(
                            com.jaykishan.lifetodo.R.string.default_web_client_id
                        )
                    )
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build()

            val request =
                GetCredentialRequest.Builder()
                    .addCredentialOption(
                        googleIdOption
                    )
                    .build()

            val result =
                credentialManager.getCredential(
                    context = context,
                    request = request
                )

            val credential =
                result.credential

            if (
                credential is CustomCredential &&
                credential.type ==
                GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {

                val googleIdTokenCredential =
                    GoogleIdTokenCredential.createFrom(
                        credential.data
                    )

                val firebaseCredential =
                    GoogleAuthProvider.getCredential(
                        googleIdTokenCredential.idToken,
                        null
                    )

                auth.signInWithCredential(
                    firebaseCredential
                ).await()

                Result.success(Unit)

            } else {

                Result.failure(
                    IllegalStateException(
                        "Unexpected Google credential"
                    )
                )
            }

        } catch (error: Exception) {

            Result.failure(error)
        }
    }

    /**
     * Deletes the database account first and then
     * deletes the Firebase Authentication account.
     *
     * Database deletion uses:
     * DELETE /users/me
     *
     * The backend deletes the users row by Firebase UID.
     * PostgreSQL ON DELETE CASCADE removes all
     * user-owned data.
     */
    suspend fun deleteAccount(): Result<Unit> {

        return try {

            val user =
                auth.currentUser
                    ?: return Result.failure(
                        Exception(
                            "No logged-in user found."
                        )
                    )

            // Get a fresh Firebase ID token
            val token =
                user.getIdToken(true)
                    .await()
                    .token
                    ?: return Result.failure(
                        Exception(
                            "Unable to get Firebase token."
                        )
                    )

            // -----------------------------------------
            // 1. DELETE DATABASE ACCOUNT
            // -----------------------------------------

            val databaseResult =
                ApiClient.delete(
                    path = "/users/me",
                    token = token
                )

            if (databaseResult.isFailure) {

                return Result.failure(
                    databaseResult.exceptionOrNull()
                        ?: Exception(
                            "Failed to delete account data."
                        )
                )
            }

            // -----------------------------------------
            // 2. DELETE FIREBASE ACCOUNT
            // -----------------------------------------

            user.delete().await()

            // -----------------------------------------
            // 3. CLEAR LOCAL CACHE
            // -----------------------------------------

            ApiClient.clearCache()

            Result.success(Unit)

        } catch (error: Exception) {

            Result.failure(error)
        }
    }

    fun signOut() {

        auth.signOut()
    }
}