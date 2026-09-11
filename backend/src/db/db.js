const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Auto-initialize required tables if missing on hosted database
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                idempotency_key VARCHAR(255) NOT NULL,
                request_hash TEXT NOT NULL,
                response_status INTEGER NOT NULL,
                response_body JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, group_id, idempotency_key)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id UUID,
                metadata JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.warn("DB auto-init warning:", err.message);
    }
};

initDb();

module.exports = pool;  