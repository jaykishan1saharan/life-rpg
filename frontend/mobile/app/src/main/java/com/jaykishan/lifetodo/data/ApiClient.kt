package com.jaykishan.lifetodo.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {

    private const val BASE_URL =
        "https://life-rpg-zn66.onrender.com"

    /*
     * =========================================================
     * NETWORK TIMEOUTS
     * =========================================================
     *
     * Render Free can take a while to wake up after being idle.
     *
     * Old:
     * connect = 15 sec
     * read    = 15 sec
     *
     * New:
     * connect = 30 sec
     * read    = 90 sec
     */

    private const val CONNECT_TIMEOUT = 30_000
    private const val READ_TIMEOUT = 90_000


    /*
     * =========================================================
     * SIMPLE IN-MEMORY GET CACHE
     * =========================================================
     *
     * This cache lives only while the app process is alive.
     *
     * Example:
     *
     * Home:
     * GET /users/me
     *       ↓
     * backend
     *
     * Go to Profile:
     * GET /users/me
     *       ↓
     * CACHE HIT
     *       ↓
     * no network request
     *
     */

    private val getCache =
        mutableMapOf<String, String>()

    private val cacheLock =
        Any()


    /*
     * These endpoints must always be fresh.
     *
     * Especially hydration next-reminder because the
     * countdown depends on the latest reminder.
     */

    private val noCachePaths =
        setOf(
            "/hydration/next-reminder"
        )


    /*
     * =========================================================
     * GET
     * =========================================================
     */

    suspend fun get(
        path: String,
        token: String
    ): Result<String> {

        /*
         * -----------------------------------------------------
         * CACHE CHECK
         * -----------------------------------------------------
         */

        if (path !in noCachePaths) {

            synchronized(cacheLock) {

                val cached =
                    getCache[path]

                if (cached != null) {

                    return Result.success(cached)
                }
            }
        }


        /*
         * -----------------------------------------------------
         * NETWORK REQUEST
         * -----------------------------------------------------
         */

        return withContext(Dispatchers.IO) {

            try {

                val connection =
                    URL("$BASE_URL$path")
                        .openConnection() as HttpURLConnection

                connection.requestMethod =
                    "GET"

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout =
                    CONNECT_TIMEOUT

                connection.readTimeout =
                    READ_TIMEOUT


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
                        ?.use {
                            it.readText()
                        }
                        ?: ""


                connection.disconnect()


                if (status in 200..299) {

                    /*
                     * Store successful GET response.
                     *
                     * Do NOT cache dynamic endpoints.
                     */

                    if (path !in noCachePaths) {

                        synchronized(cacheLock) {

                            getCache[path] =
                                body
                        }
                    }

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


    /*
     * =========================================================
     * POST
     * =========================================================
     */

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

                connection.requestMethod =
                    "POST"

                connection.doOutput =
                    true

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout =
                    CONNECT_TIMEOUT

                connection.readTimeout =
                    READ_TIMEOUT


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
                        ?.use {
                            it.readText()
                        }
                        ?: ""


                connection.disconnect()


                if (status in 200..299) {

                    /*
                     * A successful POST can change backend data.
                     * Remove affected GET responses.
                     */

                    invalidateAfterMutation(
                        path
                    )

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


    /*
     * =========================================================
     * PATCH
     * =========================================================
     */

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

                connection.requestMethod =
                    "PATCH"

                connection.doOutput =
                    true

                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )

                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )

                connection.connectTimeout =
                    CONNECT_TIMEOUT

                connection.readTimeout =
                    READ_TIMEOUT


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
                        ?.use {
                            it.readText()
                        }
                        ?: ""


                connection.disconnect()


                if (status in 200..299) {

                    /*
                     * A successful PATCH can change cached data.
                     */

                    invalidateAfterMutation(
                        path
                    )

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


    suspend fun delete(
        path: String,
        token: String
    ): Result<String> {
    
        return withContext(Dispatchers.IO) {
        
            try {
            
                val connection =
                    URL("$BASE_URL$path")
                        .openConnection() as HttpURLConnection
    
                connection.requestMethod =
                    "DELETE"
    
                connection.setRequestProperty(
                    "Authorization",
                    "Bearer $token"
                )
    
                connection.setRequestProperty(
                    "Content-Type",
                    "application/json"
                )
    
                connection.connectTimeout =
                    CONNECT_TIMEOUT
    
                connection.readTimeout =
                    READ_TIMEOUT
    
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
                        ?.use {
                            it.readText()
                        }
                        ?: ""
    
                connection.disconnect()
    
                if (status in 200..299) {
                
                    synchronized(cacheLock) {
                        getCache.clear()
                    }
    
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


    /*
     * =========================================================
     * CACHE INVALIDATION
     * =========================================================
     */

    private fun invalidateAfterMutation(
        path: String
    ) {

        synchronized(cacheLock) {

            /*
             * -------------------------------------------------
             * QUESTS
             * -------------------------------------------------
             */

            if (
                path == "/quests" ||
                path.startsWith("/quests/")
            ) {

                getCache.remove(
                    "/quests"
                )

                getCache.remove(
                    "/quests/history"
                )

                /*
                 * Completing a quest changes:
                 * XP
                 * gold
                 * attributes
                 * level
                 * streak
                 */

                if (
                    path.endsWith("/complete")
                ) {

                    getCache.remove(
                        "/users/me"
                    )
                }
            }


            /*
             * -------------------------------------------------
             * REWARDS
             * -------------------------------------------------
             */

            if (
                path == "/rewards" ||
                path.startsWith("/rewards/")
            ) {

                getCache.remove(
                    "/rewards"
                )

                getCache.remove(
                    "/inventory"
                )

                /*
                 * Buying a reward changes gold.
                 */

                if (
                    path.endsWith("/purchase")
                ) {

                    getCache.remove(
                        "/users/me"
                    )
                }
            }


            /*
             * -------------------------------------------------
             * HYDRATION
             * -------------------------------------------------
             */

            if (
                path.startsWith("/hydration/")
            ) {

                getCache.remove(
                    "/hydration"
                )

                getCache.remove(
                    "/hydration/today"
                )

                getCache.remove(
                    "/hydration/history"
                )

                /*
                 * next-reminder is never cached,
                 * so nothing needs to be removed.
                 */
            }


            /*
             * -------------------------------------------------
             * HYDRATION SETTINGS
             * -------------------------------------------------
             */

            if (
                path == "/hydration/settings"
            ) {

                getCache.remove(
                    "/hydration"
                )

                /*
                 * next-reminder is not cached.
                 */
            }
        }
    }


    /*
     * =========================================================
     * CLEAR ALL CACHE
     * =========================================================
     *
     * Call this when the user logs out.
     */

    fun clearCache() {

        synchronized(cacheLock) {

            getCache.clear()
        }
    }
}