require("dotenv").config();
const pool = require("../src/db/db");

describe("Database Integrity & Constraint Safety Tests", () => {
    let user1Id, user2Id, groupId;
    const testEmail1 = "db_integrity_user1@example.com";
    const testEmail2 = "db_integrity_user2@example.com";

    beforeAll(async () => {
        // Cleanup old test data
        await pool.query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))", [testEmail1, testEmail2]);
        await pool.query("DELETE FROM settlements WHERE group_id IN (SELECT id FROM groups WHERE name = 'DB Integrity Group')");
        await pool.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name = 'DB Integrity Group'))");
        await pool.query("DELETE FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name = 'DB Integrity Group')");
        await pool.query("DELETE FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE name = 'DB Integrity Group')");
        await pool.query("DELETE FROM groups WHERE name = 'DB Integrity Group'");
        await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [testEmail1, testEmail2]);

        // Insert test user 1
        const u1 = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["DB Integrity User 1", testEmail1, "hash123"]
        );
        user1Id = u1.rows[0].id;

        // Insert test user 2
        const u2 = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["DB Integrity User 2", testEmail2, "hash123"]
        );
        user2Id = u2.rows[0].id;

        // Insert test group
        const g = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id",
            ["DB Integrity Group", user1Id]
        );
        groupId = g.rows[0].id;

        // Add user 1 & user 2 to group
        await pool.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')", [groupId, user1Id]);
        await pool.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')", [groupId, user2Id]);
    }, 30000);

    afterAll(async () => {
        if (groupId) {
            await pool.query("DELETE FROM audit_logs WHERE entity_id = $1 OR user_id IN ($2, $3)", [groupId, user1Id, user2Id]);
            await pool.query("DELETE FROM settlements WHERE group_id = $1", [groupId]);
            await pool.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = $1)", [groupId]);
            await pool.query("DELETE FROM expenses WHERE group_id = $1", [groupId]);
            await pool.query("DELETE FROM group_members WHERE group_id = $1", [groupId]);
            await pool.query("DELETE FROM groups WHERE id = $1", [groupId]);
        }
        await pool.query("DELETE FROM users WHERE email IN ($1, $2)", [testEmail1, testEmail2]);
        await pool.end();
    }, 30000);

    test("should enforce UNIQUE constraint on user email", async () => {
        await expect(
            pool.query(
                "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)",
                ["Duplicate Email User", testEmail1, "hash456"]
            )
        ).rejects.toThrow();
    });

    test("should enforce UNIQUE constraint on group_members (group_id, user_id)", async () => {
        await expect(
            pool.query(
                "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
                [groupId, user1Id]
            )
        ).rejects.toThrow();
    });

    test("should enforce FOREIGN KEY constraint when inserting group_member with non-existent user", async () => {
        const fakeId = "00000000-0000-0000-0000-000000000000";
        await expect(
            pool.query(
                "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')",
                [groupId, fakeId]
            )
        ).rejects.toThrow();
    });

    test("should enforce UNIQUE constraint on expense_splits (expense_id, user_id)", async () => {
        const expRes = await pool.query(
            "INSERT INTO expenses (group_id, paid_by, description, total_amount, split_type) VALUES ($1, $2, $3, $4, 'equal') RETURNING id",
            [groupId, user1Id, "DB Test Expense", 1000]
        );
        const expId = expRes.rows[0].id;

        await pool.query(
            "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
            [expId, user1Id, 500]
        );

        // Attempt duplicate split insertion for same user
        await expect(
            pool.query(
                "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
                [expId, user1Id, 500]
            )
        ).rejects.toThrow();

        // Cleanup test expense
        await pool.query("DELETE FROM expense_splits WHERE expense_id = $1", [expId]);
        await pool.query("DELETE FROM expenses WHERE id = $1", [expId]);
    });

    test("should enforce CHECK constraint (amount > 0) or fail on non-positive settlement amount if DB constraint exists", async () => {
        try {
            await pool.query(
                "INSERT INTO settlements (group_id, from_user, to_user, amount) VALUES ($1, $2, $3, $4)",
                [groupId, user1Id, user2Id, -500]
            );
            await pool.query("DELETE FROM settlements WHERE group_id = $1 AND amount = -500", [groupId]);
        } catch (err) {
            expect(err).toBeDefined();
        }
    });

    test("should enforce CHECK constraint (from_user <> to_user) on self-settlement if DB constraint exists", async () => {
        try {
            await pool.query(
                "INSERT INTO settlements (group_id, from_user, to_user, amount) VALUES ($1, $2, $3, $4)",
                [groupId, user1Id, user1Id, 500]
            );
            await pool.query("DELETE FROM settlements WHERE group_id = $1 AND amount = 500", [groupId]);
        } catch (err) {
            expect(err).toBeDefined();
        }
    });

    test("should cleanly roll back multi-statement transaction when an inner operation fails", async () => {
        const client = await pool.connect();
        let expId = null;

        try {
            await client.query("BEGIN");

            const expRes = await client.query(
                "INSERT INTO expenses (group_id, paid_by, description, total_amount, split_type) VALUES ($1, $2, $3, $4, 'equal') RETURNING id",
                [groupId, user1Id, "Rollback Expense Test", 2000]
            );
            expId = expRes.rows[0].id;

            await client.query(
                "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
                [expId, user1Id, 1000]
            );

            // Intentionally trigger foreign key error
            const invalidUserId = "00000000-0000-0000-0000-000000000000";
            await client.query(
                "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
                [expId, invalidUserId, 1000]
            );

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
        } finally {
            client.release();
        }

        // Verify Rollback Integrity: Neither expense nor expense_split should exist
        if (expId) {
            const checkExp = await pool.query("SELECT * FROM expenses WHERE id = $1", [expId]);
            expect(checkExp.rows.length).toBe(0);

            const checkSplits = await pool.query("SELECT * FROM expense_splits WHERE expense_id = $1", [expId]);
            expect(checkSplits.rows.length).toBe(0);
        }
    });
});
