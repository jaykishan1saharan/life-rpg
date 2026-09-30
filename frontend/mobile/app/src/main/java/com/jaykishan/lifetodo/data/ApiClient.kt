package com.jaykishan.lifetodo.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {

    private const val BASE_URL =
        "https://life-rpg-zn66.onrender.com"

    // =========================================================
    // GET
    // =========================================================

    suspend fun get(
        path: String,
        token: String
    ): Result<String> {

        return withContext(Dispatchers.IO) {

            try {

                val connection =
                    URL("$BASE_URL$path")
                        .openConnection() as HttpURLConnection

                connection.requestMethod = "GET"

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                val status =
                    connection.responseCode

                val stream =
                    if (status in 200..299) {
                        connection.inputStream
                    } else {
                        connection.errorStream
                    }

                val body =
                    stream
                        ?.bufferedReader()
                        ?.use { it.readText() }
                        ?: ""

                connection.disconnect()

                if (status in 200..299) {

                    Result.success(body)

                } else {

                    Result.failure(
                        Exception(
                            "API error $status: $body"
                        )
                    )
                }

            } catch (error: Exception) {

                Result.failure(error)
            }
        }
    }


    // =========================================================
    // POST
    // =========================================================

    suspend fun post(
        path: String,
        token: String,
        body: JSONObject
    ): Result<String> {

        return withContext(Dispatchers.IO) {

            try {

                val connection =
                    URL("$BASE_URL$path")
                        .openConnection() as HttpURLConnection

                connection.requestMethod = "POST"

                connection.doOutput = true

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                connection.outputStream
                    .bufferedWriter()
                    .use {
                        it.write(body.toString())
                    }

                val status =
                    connection.responseCode

                val stream =
                    if (status in 200..299) {
                        connection.inputStream
                    } else {
                        connection.errorStream
                    }

                val response =
                    stream
                        ?.bufferedReader()
                        ?.use { it.readText() }
                        ?: ""

                connection.disconnect()

                if (status in 200..299) {

                    Result.success(response)

                } else {

                    Result.failure(
                        Exception(
                            "API error $status: $response"
                        )
                    )
                }

            } catch (error: Exception) {

                Result.failure(error)
            }
        }
    }


    // =========================================================
    // PATCH
    // =========================================================

    suspend fun patch(
        path: String,
        token: String,
        body: JSONObject
    ): Result<String> {

        return withContext(Dispatchers.IO) {

            try {

                val connection =
                    URL("$BASE_URL$path")
                        .openConnection() as HttpURLConnection

                connection.requestMethod = "PATCH"

                connection.doOutput = true

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout = 15000
                connection.readTimeout = 15000

                connection.outputStream
                    .bufferedWriter()
                    .use {
                        it.write(body.toString())
                    }

                val status =
                    connection.responseCode

                val stream =
                    if (status in 200..299) {
                        connection.inputStream
                    } else {
                        connection.errorStream
                    }

                val response =
                    stream
                        ?.bufferedReader()
                        ?.use { it.readText() }
                        ?: ""

                connection.disconnect()

                if (status in 200..299) {

                    Result.success(response)

                } else {

                    Result.failure(
                        Exception(
                            "API error $status: $response"
                        )
                    )
                }

            } catch (error: Exception) {

                Result.failure(error)
            }
        }
    }
}