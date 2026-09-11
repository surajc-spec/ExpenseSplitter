require("dotenv").config();
const pool = require("../src/db/db");
const { createAuditLog } = require("../src/services/audit.service");

describe("Audit Logging & Transaction Atomicity Tests", () => {
    let testUserId;
    let testGroupId;
    const testEmail = "audit_test_user@example.com";

    beforeAll(async () => {
        // Cleanup old test records
        await pool.query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))", [testEmail, "audit_receiver@example.com"]);
        await pool.query("DELETE FROM settlements WHERE group_id IN (SELECT id FROM groups WHERE name = 'Audit Test Group')");
        await pool.query("DELETE FROM groups WHERE name = 'Audit Test Group'");
        await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [testEmail, "audit_receiver@example.com"]);

        // Insert test user & group
        const userRes = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["Audit Test User", testEmail, "hash123"]
        );
        testUserId = userRes.rows[0].id;

        const groupRes = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id",
            ["Audit Test Group", testUserId]
        );
        testGroupId = groupRes.rows[0].id;
    }, 30000);

    afterAll(async () => {
        if (testUserId) {
            await pool.query("DELETE FROM audit_logs WHERE user_id = $1", [testUserId]);
        }
        if (testGroupId) {
            await pool.query("DELETE FROM settlements WHERE group_id = $1", [testGroupId]);
            await pool.query("DELETE FROM groups WHERE id = $1", [testGroupId]);
        }
        if (testUserId) {
            await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [testEmail, "audit_receiver@example.com"]);
        }
        await pool.end();
    }, 30000);

    test("should insert valid audit log entry with JSONB metadata into audit_logs table", async () => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            await createAuditLog(client, {
                userId: testUserId,
                action: "TEST_ACTION",
                entityType: "group",
                entityId: testGroupId,
                metadata: { key: "value", number: 100 }
            });

            await client.query("COMMIT");

            const check = await pool.query(
                "SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'TEST_ACTION'",
                [testUserId]
            );

            expect(check.rows.length).toBe(1);
            expect(check.rows[0].entity_type).toBe("group");
            expect(check.rows[0].entity_id).toBe(testGroupId);
            expect(check.rows[0].metadata).toEqual({ key: "value", number: 100 });
        } finally {
            client.release();
        }
    });

    test("should execute transaction rollback and ensure settlement is NOT saved if audit log insertion fails", async () => {
        const client = await pool.connect();
        let settlementId = null;

        try {
            await client.query("BEGIN");

            // 1. Create a dummy secondary user so from_user <> to_user constraint is satisfied
            const user2Res = await client.query(
                "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
                ["Audit Receiver", "audit_receiver@example.com", "hash123"]
            );
            const user2Id = user2Res.rows[0].id;

            // 2. Insert settlement inside transaction
            const settlementRes = await client.query(
                `INSERT INTO settlements (group_id, from_user, to_user, amount)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [testGroupId, testUserId, user2Id, 5000]
            );

            settlementId = settlementRes.rows[0].id;

            // 3. Force audit log failure inside transaction by passing invalid foreign key user ID
            const invalidUserId = "00000000-0000-0000-0000-000000000000";

            await createAuditLog(client, {
                userId: invalidUserId, // Triggers FK constraint error in PostgreSQL
                action: "SETTLEMENT_RECORDED",
                entityType: "settlement",
                entityId: settlementId,
                metadata: {}
            });

            await client.query("COMMIT");
        } catch (error) {
            // Expected error during audit log insertion -> Trigger ROLLBACK
            await client.query("ROLLBACK");
        } finally {
            client.release();
        }

        // Verify Atomicity: If audit log insertion failed, settlement MUST NOT exist in DB
        if (settlementId) {
            const checkSettlement = await pool.query("SELECT * FROM settlements WHERE id = $1", [settlementId]);
            expect(checkSettlement.rows.length).toBe(0);
        }
    });
});
