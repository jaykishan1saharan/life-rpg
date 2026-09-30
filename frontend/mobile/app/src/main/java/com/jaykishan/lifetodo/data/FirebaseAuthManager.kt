package com.jaykishan.lifetodo.data

import com.google.firebase.auth.FirebaseAuth
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

    fun signOut() {

        auth.signOut()
    }
}