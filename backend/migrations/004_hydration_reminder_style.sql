ALTER TABLE hydration_settings
ADD COLUMN IF NOT EXISTS reminder_style TEXT NOT NULL DEFAULT 'NOTIFICATION'
CHECK (
    reminder_style IN (
        'NOTIFICATION',
        'FULL_SCREEN'
    )
);