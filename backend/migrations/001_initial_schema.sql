-- ==========================================
-- LIFE RPG - INITIAL DATABASE SCHEMA
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Firebase Authentication UID
    firebase_uid TEXT NOT NULL UNIQUE,

    email VARCHAR(255) NOT NULL UNIQUE,

    display_name VARCHAR(100),

    avatar_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- CHARACTERS
-- ==========================================

CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE CASCADE,

    level INTEGER NOT NULL DEFAULT 1,

    total_xp INTEGER NOT NULL DEFAULT 0,

    gold INTEGER NOT NULL DEFAULT 0,

    strength INTEGER NOT NULL DEFAULT 0,

    intellect INTEGER NOT NULL DEFAULT 0,

    discipline INTEGER NOT NULL DEFAULT 0,

    creativity INTEGER NOT NULL DEFAULT 0,

    current_streak INTEGER NOT NULL DEFAULT 0,

    longest_streak INTEGER NOT NULL DEFAULT 0,

    last_activity_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT characters_level_positive
        CHECK (level >= 1),

    CONSTRAINT characters_xp_positive
        CHECK (total_xp >= 0),

    CONSTRAINT characters_gold_positive
        CHECK (gold >= 0),

    CONSTRAINT characters_strength_positive
        CHECK (strength >= 0),

    CONSTRAINT characters_intellect_positive
        CHECK (intellect >= 0),

    CONSTRAINT characters_discipline_positive
        CHECK (discipline >= 0),

    CONSTRAINT characters_creativity_positive
        CHECK (creativity >= 0),

    CONSTRAINT characters_current_streak_positive
        CHECK (current_streak >= 0),

    CONSTRAINT characters_longest_streak_positive
        CHECK (longest_streak >= 0)
);


-- ==========================================
-- QUESTS
-- ==========================================

CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    category VARCHAR(50) NOT NULL,

    difficulty VARCHAR(20) NOT NULL
        CHECK (
            difficulty IN (
                'EASY',
                'MEDIUM',
                'HARD',
                'EPIC'
            )
        ),

    attribute VARCHAR(30) NOT NULL
        CHECK (
            attribute IN (
                'STRENGTH',
                'INTELLECT',
                'DISCIPLINE',
                'CREATIVITY'
            )
        ),

    xp_reward INTEGER NOT NULL,

    gold_reward INTEGER NOT NULL,

    attribute_reward INTEGER NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quests_xp_positive
        CHECK (xp_reward > 0),

    CONSTRAINT quests_gold_positive
        CHECK (gold_reward >= 0),

    CONSTRAINT quests_attribute_reward_positive
        CHECK (attribute_reward > 0)
);


-- ==========================================
-- QUEST COMPLETIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS quest_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quest_id UUID NOT NULL
        REFERENCES quests(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    xp_earned INTEGER NOT NULL,

    gold_earned INTEGER NOT NULL,

    attribute VARCHAR(30) NOT NULL
        CHECK (
            attribute IN (
                'STRENGTH',
                'INTELLECT',
                'DISCIPLINE',
                'CREATIVITY'
            )
        ),

    attribute_points INTEGER NOT NULL,

    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quest_completions_xp_positive
        CHECK (xp_earned >= 0),

    CONSTRAINT quest_completions_gold_positive
        CHECK (gold_earned >= 0),

    CONSTRAINT quest_completions_attribute_points_positive
        CHECK (attribute_points >= 0)
);


-- ==========================================
-- ACTIVITY LOGS
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(150) NOT NULL,

    description TEXT,

    xp_change INTEGER NOT NULL DEFAULT 0,

    gold_change INTEGER NOT NULL DEFAULT 0,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==========================================
-- SHOP ITEMS
-- ==========================================

CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    description TEXT,

    type VARCHAR(30) NOT NULL
        CHECK (
            type IN (
                'ITEM',
                'THEME',
                'BADGE'
            )
        ),

    price INTEGER NOT NULL,

    image_url TEXT,

    metadata JSONB,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT shop_items_price_positive
        CHECK (price >= 0)
);


-- ==========================================
-- INVENTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    item_id UUID NOT NULL
        REFERENCES shop_items(id)
        ON DELETE CASCADE,

    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, item_id)
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
    ON users(firebase_uid);

CREATE INDEX IF NOT EXISTS idx_quests_user_id
    ON quests(user_id);

CREATE INDEX IF NOT EXISTS idx_quest_completions_user_id
    ON quest_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_quest_completions_quest_id
    ON quest_completions(quest_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
    ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id
    ON inventory(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_unique_quest_completion
ON quest_completions (quest_id, user_id);


-- ==========================================
-- END OF LIFE RPG INITIAL SCHEMA
-- ==========================================


ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS is_equipped BOOLEAN NOT NULL DEFAULT FALSE;