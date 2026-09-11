
-- Expense Splitter - Idempotency


CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    group_id UUID NOT NULL
        REFERENCES groups(id)
        ON DELETE CASCADE,

    idempotency_key VARCHAR(255) NOT NULL,

    request_hash TEXT NOT NULL,

    response_status INTEGER NOT NULL,

    response_body JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, group_id, idempotency_key)
);



-- INDEXES

CREATE INDEX idx_idempotency_keys_created_at
ON idempotency_keys(created_at);