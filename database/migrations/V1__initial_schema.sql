-- ============================================
-- Expense Splitter - Initial Database Schema
-- ============================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- GROUPS
-- ============================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    created_by UUID NOT NULL
        REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- GROUP MEMBERS
-- ============================================

CREATE TABLE group_members (
    group_id UUID NOT NULL
        REFERENCES groups(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('member', 'admin')),

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_id, user_id)
);


-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES groups(id),

    paid_by UUID NOT NULL
        REFERENCES users(id),

    description VARCHAR(255) NOT NULL,

    total_amount BIGINT NOT NULL
        CHECK (total_amount > 0),

    split_type VARCHAR(20) NOT NULL
        CHECK (split_type IN ('equal', 'exact', 'percentage')),

    created_a   t TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================
-- EXPENSE SPLITS
-- ============================================

CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    expense_id UUID NOT NULL
        REFERENCES expenses(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id),

    amount BIGINT NOT NULL
        CHECK (amount >= 0),

    percentage NUMERIC(7,4),

    UNIQUE (expense_id, user_id)
);


-- ============================================
-- SETTLEMENTS
-- ============================================

CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    group_id UUID NOT NULL
        REFERENCES groups(id),

    from_user UUID NOT NULL
        REFERENCES users(id),

    to_user UUID NOT NULL
        REFERENCES users(id),

    amount BIGINT NOT NULL
        CHECK (amount > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (from_user <> to_user)
);


-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id),

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,

    entity_id UUID,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);