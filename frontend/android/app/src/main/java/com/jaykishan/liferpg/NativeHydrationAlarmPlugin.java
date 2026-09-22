package com.jaykishan.liferpg;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

@CapacitorPlugin(
        name = "NativeHydrationAlarm"
)
public class NativeHydrationAlarmPlugin
        extends Plugin {

    @PluginMethod
    public void schedule(
            PluginCall call
    ) {

        try {

            JSONArray alarms =
                    call.getArray("alarms");

            if (alarms == null) {
                call.reject(
                        "alarms array is required."
                );
                return;
            }

            if (
                    !HydrationAlarmScheduler
                            .canScheduleExactAlarms(
                                    getContext()
                            )
            ) {

                call.reject(
                        "Exact alarm permission is not enabled."
                );

                return;
            }

            HydrationAlarmScheduler
                    .scheduleAlarms(
                            getContext(),
                            alarms
                    );

            JSObject result =
                    new JSObject();

            result.put(
                    "scheduled",
                    alarms.length()
            );

            result.put(
                    "exact",
                    true
            );

            call.resolve(result);

        } catch (Exception error) {

            android.util.Log.e(
                    "NativeHydrationAlarm",
                    "Schedule failed",
                    error
            );

            call.reject(
                    error.getMessage() != null
                            ? error.getMessage()
                            : "Failed to schedule hydration alarms."
            );
        }
    }

    @PluginMethod
    public void cancelAll(
            PluginCall call
    ) {

        try {

            HydrationAlarmScheduler
                    .cancelAllAlarms(
                            getContext()
                    );

            call.resolve();

        } catch (Exception error) {

            call.reject(
                    error.getMessage() != null
                            ? error.getMessage()
                            : "Failed to cancel alarms."
            );
        }
    }

    @PluginMethod
    public void canScheduleExactAlarms(
            PluginCall call
    ) {

        boolean allowed =
                HydrationAlarmScheduler
                        .canScheduleExactAlarms(
                                getContext()
                        );

        JSObject result =
                new JSObject();

        result.put(
                "allowed",
                allowed
        );

        call.resolve(result);
    }

    @PluginMethod
    public void openExactAlarmSettings(
            PluginCall call
    ) {

        try {

            HydrationAlarmScheduler
                    .openExactAlarmSettings(
                            getContext()
                    );

            call.resolve();

        } catch (Exception error) {

            call.reject(
                    error.getMessage() != null
                            ? error.getMessage()
                            : "Unable to open alarm settings."
            );
        }
    }

    @PluginMethod
public void getPendingAction(
        PluginCall call
) {

    android.content.SharedPreferences prefs =
            getContext().getSharedPreferences(
                    "hydration_alarm_action",
                    android.content.Context.MODE_PRIVATE
            );

    String action =
            prefs.getString(
                    "pending_action",
                    null
            );

    if (action == null) {
        call.resolve();
        return;
    }

    int amountMl =
            prefs.getInt(
                    "amount_ml",
                    250
            );

    int alarmId =
            prefs.getInt(
                    "alarm_id",
                    0
            );

    long triggerAt =
            prefs.getLong(
                    "trigger_at",
                    0L
            );

    int snoozeMinutes =
            prefs.getInt(
                    "snooze_minutes",
                    15
            );

    JSObject result =
            new JSObject();

    result.put(
            "action",
            action
    );

    result.put(
            "amountMl",
            amountMl
    );

    result.put(
            "alarmId",
            alarmId
    );

    result.put(
            "triggerAt",
            triggerAt
    );

    result.put(
            "snoozeMinutes",
            snoozeMinutes
    );

    /*
     * Consume the pending action.
     *
     * This prevents the same native
     * notification action from executing
     * twice after app restart.
     */
    prefs.edit()
            .clear()
            .apply();

    call.resolve(
            result
    );
}


}