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
}