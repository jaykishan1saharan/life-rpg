package com.jaykishan.liferpg;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class HydrationBootReceiver
        extends BroadcastReceiver {

    @Override
    public void onReceive(
            Context context,
            Intent intent
    ) {

        if (
                Intent.ACTION_BOOT_COMPLETED.equals(
                        intent.getAction()
                )
                ||
                "android.intent.action.LOCKED_BOOT_COMPLETED"
                        .equals(intent.getAction())
                ||
                Intent.ACTION_MY_PACKAGE_REPLACED.equals(
                        intent.getAction()
                )
                ||
                "android.intent.action.QUICKBOOT_POWERON"
                        .equals(intent.getAction())
        ) {

            HydrationAlarmScheduler
                    .restoreAlarms(
                            context
                    );
        }
    }
}