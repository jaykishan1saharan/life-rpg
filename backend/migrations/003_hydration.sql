--- Migration: 003_hydration.sql

--- hydration_settings table 


CREATE TABLE IF NOT EXISTS hydration_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    daily_goal_ml INTEGER NOT NULL DEFAULT 3000
        CHECK (daily_goal_ml > 0),

    reminder_mode TEXT NOT NULL DEFAULT 'SMART'
        CHECK (
            reminder_mode IN (
                'SMART',
                'INTERVAL',
                'CUSTOM',
                'HYBRID'
            )
        ),

    interval_minutes INTEGER,

    wake_time TIME NOT NULL DEFAULT '08:00',

    sleep_time TIME NOT NULL DEFAULT '23:00',

    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    snooze_minutes INTEGER NOT NULL DEFAULT 15,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--- hydration_logs table 

CREATE TABLE IF NOT EXISTS hydration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    amount_ml INTEGER NOT NULL
        CHECK (amount_ml > 0),

    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    source TEXT NOT NULL DEFAULT 'MANUAL'
        CHECK (
            source IN (
                'MANUAL',
                'REMINDER',
                'QUICK_ADD'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--- hydration_reminder_times table

CREATE TABLE IF NOT EXISTS hydration_reminder_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    reminder_time TIME NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, reminder_time)
);

CREATE INDEX IF NOT EXISTS idx_hydration_reminder_times_user
ON hydration_reminder_times (user_id);



--- hydration_reminder_events table

CREATE TABLE IF NOT EXISTS hydration_reminder_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    reminder_key TEXT NOT NULL,

    reminder_date DATE NOT NULL,

    reminder_time TIME NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'SENT',
                'DRANK',
                'SNOOZED',
                'DISMISSED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    sent_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    UNIQUE(
        user_id,
        reminder_key,
        reminder_date
    )
);

CREATE INDEX IF NOT EXISTS idx_hydration_reminder_events_user_date
ON hydration_reminder_events (
    user_id,
    reminder_date
);

CREATE INDEX IF NOT EXISTS idx_hydration_reminder_events_status
ON hydration_reminder_events (
    status
);



--- hydration_push_devices table

CREATE TABLE IF NOT EXISTS hydration_push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    fcm_token TEXT NOT NULL,

    device_type TEXT NOT NULL DEFAULT 'WEB'
        CHECK (device_type IN ('WEB')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_hydration_push_devices_user
ON hydration_push_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_hydration_push_devices_active
ON hydration_push_devices(user_id, is_active);



--- Add snoozed_until column to hydration_reminder_events table

ALTER TABLE hydration_reminder_events
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;



--- Indexes for hydration_logs table

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date
ON hydration_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user
ON hydration_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_hydration_reminder_events_snoozed
ON hydration_reminder_events (status, snoozed_until);