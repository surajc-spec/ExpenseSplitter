require("dotenv").config();
const request = require("supertest");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const app = require("../src/app");
const pool = require("../src/db/db");
const redis = require("../src/db/redis");

describe("Settlement Integration & Idempotency Tests", () => {
    let testUserAId;
    let testUserBId;
    let nonMemberId;
    let testGroupId;
    let concurrentGroupId;

    const passwordPlain = "testpassword123";
    const emailA = "settlement_test_user_a@example.com";
    const emailB = "settlement_test_user_b@example.com";
    const emailNonMember = "settlement_test_nonmember@example.com";

    let agentA;
    let agentB;
    let agentNonMember;

    beforeEach(async () => {
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });

    beforeAll(async () => {
        // 1. CLEANUP PREVIOUS TEST DATA
        await pool.query(
            "DELETE FROM idempotency_keys WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Test Settlement Group%')"
        );
        await pool.query(
            "DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3))",
            [emailA, emailB, emailNonMember]
        );
        await pool.query(
            "DELETE FROM settlements WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Test Settlement Group%')"
        );
        await pool.query(
            "DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Test Settlement Group%'))"
        );
        await pool.query(
            "DELETE FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Test Settlement Group%')"
        );
        await pool.query(
            "DELETE FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Test Settlement Group%')"
        );
        await pool.query(
            "DELETE FROM groups WHERE name LIKE 'Test Settlement Group%'"
        );
        await pool.query(
            "DELETE FROM users WHERE email IN ($1, $2, $3)",
            [emailA, emailB, emailNonMember]
        );

        // 2. CREATE DEDICATED TEST USERS
        const passwordHash = await bcrypt.hash(passwordPlain, 10);

        const resA = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["Test User A", emailA, passwordHash]
        );
        testUserAId = resA.rows[0].id;

        const resB = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["Test User B", emailB, passwordHash]
        );
        testUserBId = resB.rows[0].id;

        const resNM = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
            ["Non Member User", emailNonMember, passwordHash]
        );
        nonMemberId = resNM.rows[0].id;

        // 3. CREATE MAIN TEST GROUP
        const groupRes = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id",
            ["Test Settlement Group 1", testUserBId]
        );
        testGroupId = groupRes.rows[0].id;

        await pool.query(
            "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'admin')",
            [testGroupId, testUserAId, testUserBId]
        );

        // Add Expense: User B paid ₹2,000 (200000 paise), split equal -> User A owes User B ₹1,000 (100000 paise)
        const expenseRes = await pool.query(
            "INSERT INTO expenses (group_id, paid_by, description, total_amount, split_type) VALUES ($1, $2, 'Group Dinner', 200000, 'equal') RETURNING id",
            [testGroupId, testUserBId]
        );
        const expenseId = expenseRes.rows[0].id;

        await pool.query(
            "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, 100000), ($1, $3, 100000)",
            [expenseId, testUserAId, testUserBId]
        );

        // 4. CREATE CONCURRENT TEST GROUP
        const concurrentGroupRes = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id",
            ["Test Settlement Group Concurrent", testUserBId]
        );
        concurrentGroupId = concurrentGroupRes.rows[0].id;

        await pool.query(
            "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'admin')",
            [concurrentGroupId, testUserAId, testUserBId]
        );

        const concExpenseRes = await pool.query(
            "INSERT INTO expenses (group_id, paid_by, description, total_amount, split_type) VALUES ($1, $2, 'Concurrent Outing', 200000, 'equal') RETURNING id",
            [concurrentGroupId, testUserBId]
        );
        const concExpenseId = concExpenseRes.rows[0].id;

        await pool.query(
            "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, 100000), ($1, $3, 100000)",
            [concExpenseId, testUserAId, testUserBId]
        );

        // 5. INITIALIZE AGENTS AND LOG IN
        agentA = request.agent(app);
        agentB = request.agent(app);
        agentNonMember = request.agent(app);

        await agentA.post("/api/auth/login").send({ email: emailA, password: passwordPlain });
        await agentB.post("/api/auth/login").send({ email: emailB, password: passwordPlain });
        await agentNonMember.post("/api/auth/login").send({ email: emailNonMember, password: passwordPlain });
    }, 30000);

    afterAll(async () => {
        if (testGroupId || concurrentGroupId) {
            await pool.query("DELETE FROM idempotency_keys WHERE group_id IN ($1, $2)", [testGroupId, concurrentGroupId]);
            await pool.query("DELETE FROM settlements WHERE group_id IN ($1, $2)", [testGroupId, concurrentGroupId]);
            await pool.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN ($1, $2))", [testGroupId, concurrentGroupId]);
            await pool.query("DELETE FROM expenses WHERE group_id IN ($1, $2)", [testGroupId, concurrentGroupId]);
            await pool.query("DELETE FROM group_members WHERE group_id IN ($1, $2)", [testGroupId, concurrentGroupId]);
            await pool.query("DELETE FROM groups WHERE id IN ($1, $2)", [testGroupId, concurrentGroupId]);
        }
        await pool.query("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2, $3))", [emailA, emailB, emailNonMember]);
        await pool.query("DELETE FROM users WHERE email IN ($1, $2, $3)", [emailA, emailB, emailNonMember]);
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await pool.end();
        await redis.quit();
    }, 30000);

    // ---------------------------------------------------------
    // 1. Existing Settlement Base & Auth Tests
    // ---------------------------------------------------------

    test("should reject unauthenticated settlement request with 401", async () => {
        const response = await request(app)
            .post(`/api/groups/${testGroupId}/settlements`)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "50000" });

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBe("Authentication required");
    });

    test("should login successfully with dedicated test account", async () => {
        const loginAgent = request.agent(app);
        const response = await loginAgent.post("/api/auth/login").send({ email: emailA, password: passwordPlain });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Login successful");
        expect(response.body.user.email).toBe(emailA);
    });

    test("should reject settlement request from a non-group member with 403 when Idempotency-Key is provided", async () => {
        const response = await agentNonMember
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", "key-nonmember-test")
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "50000" });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toBe("You are not a member of this group");
    });

    test("should reject settlement in invalid direction with 400 when Idempotency-Key is provided", async () => {
        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", "key-invalid-dir-test")
            .send({ fromUser: testUserBId, toUser: testUserAId, amount: "50000" });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Invalid settlement direction");
    });

    test("should reject zero or negative settlement amount with 400 when Idempotency-Key is provided", async () => {
        const resZero = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", "key-zero-amt-test")
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "0" });

        expect(resZero.statusCode).toBe(400);
        expect(resZero.body.message).toBe("Amount must be greater than zero");

        const resNegative = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", "key-neg-amt-test")
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "-50000" });

        expect(resNegative.statusCode).toBe(400);
        expect(resNegative.body.message).toBe("Amount must be greater than zero");
    });

    test("should reject settlement exceeding outstanding debt with 400 when Idempotency-Key is provided", async () => {
        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", "key-overpay-test")
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "150000" });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Settlement amount exceeds outstanding debt");
    });

    // ---------------------------------------------------------
    // 2. Missing & Invalid Idempotency-Key Header Tests
    // ---------------------------------------------------------

    test("should reject settlement request missing Idempotency-Key header with 400 and create 0 DB records", async () => {
        const initialSettlementCount = (await pool.query("SELECT COUNT(*) FROM settlements WHERE group_id = $1", [testGroupId])).rows[0].count;
        const initialAuditCount = (await pool.query("SELECT COUNT(*) FROM audit_logs WHERE user_id = $1", [testUserAId])).rows[0].count;
        const initialIdempotencyCount = (await pool.query("SELECT COUNT(*) FROM idempotency_keys WHERE group_id = $1", [testGroupId])).rows[0].count;

        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Idempotency-Key header is required");

        const postSettlementCount = (await pool.query("SELECT COUNT(*) FROM settlements WHERE group_id = $1", [testGroupId])).rows[0].count;
        const postAuditCount = (await pool.query("SELECT COUNT(*) FROM audit_logs WHERE user_id = $1", [testUserAId])).rows[0].count;
        const postIdempotencyCount = (await pool.query("SELECT COUNT(*) FROM idempotency_keys WHERE group_id = $1", [testGroupId])).rows[0].count;

        expect(postSettlementCount).toBe(initialSettlementCount);
        expect(postAuditCount).toBe(initialAuditCount);
        expect(postIdempotencyCount).toBe(initialIdempotencyCount);
    });

    test("should reject Idempotency-Key longer than 255 characters with 400", async () => {
        const longKey = "a".repeat(256);
        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", longKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Idempotency-Key must not exceed 255 characters");
    });

    // ---------------------------------------------------------
    // 3. First Request Creation & DB Atomic Persistence
    // ---------------------------------------------------------

    let createdSettlementId;
    const firstRequestKey = "test-key-first-req-100";

    test("should process first valid settlement request with Idempotency-Key and return 201", async () => {
        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", firstRequestKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "20000" }); // Settle ₹200

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Settlement recorded successfully");
        expect(response.body.settlement).toBeDefined();
        expect(response.body.settlement.amount).toBe("20000");

        createdSettlementId = response.body.settlement.id;

        // Verify settlement record in DB
        const settlementCheck = await pool.query("SELECT * FROM settlements WHERE id = $1", [createdSettlementId]);
        expect(settlementCheck.rows.length).toBe(1);

        // Verify audit log record in DB
        const auditCheck = await pool.query("SELECT * FROM audit_logs WHERE entity_id = $1", [createdSettlementId]);
        expect(auditCheck.rows.length).toBe(1);
        expect(auditCheck.rows[0].action).toBe("SETTLEMENT_RECORDED");

        // Verify idempotency record in DB
        const idempotencyCheck = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [firstRequestKey]);
        expect(idempotencyCheck.rows.length).toBe(1);
        expect(idempotencyCheck.rows[0].response_status).toBe(201);
        expect(idempotencyCheck.rows[0].response_body.settlement.id).toBe(createdSettlementId);
    });

    // ---------------------------------------------------------
    // 4. Exact Retry (Same Key + Same Request)
    // ---------------------------------------------------------

    test("should return cached response for exact retry with same Idempotency-Key without duplicate DB records", async () => {
        const response = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", firstRequestKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "20000" });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Settlement recorded successfully");
        expect(response.body.settlement.id).toBe(createdSettlementId);

        // Verify direct DB counts: NO 2nd settlement, NO 2nd audit log, exactly ONE idempotency record
        const settlementCount = (await pool.query("SELECT COUNT(*) FROM settlements WHERE group_id = $1 AND from_user = $2 AND to_user = $3 AND amount = '20000'", [testGroupId, testUserAId, testUserBId])).rows[0].count;
        expect(parseInt(settlementCount, 10)).toBe(1);

        const auditCount = (await pool.query("SELECT COUNT(*) FROM audit_logs WHERE entity_id = $1", [createdSettlementId])).rows[0].count;
        expect(parseInt(auditCount, 10)).toBe(1);

        const idempotencyCount = (await pool.query("SELECT COUNT(*) FROM idempotency_keys WHERE idempotency_key = $1", [firstRequestKey])).rows[0].count;
        expect(parseInt(idempotencyCount, 10)).toBe(1);
    });

    // ---------------------------------------------------------
    // 5. Same Key + Different Request (Amount Change)
    // ---------------------------------------------------------

    test("should reject request with same Idempotency-Key but different amount with 409 Conflict", async () => {
        const diffAmtKey = "test-key-diff-amt-200";

        // First request: ₹100 (10000 paise)
        const res1 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", diffAmtKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" });
        expect(res1.statusCode).toBe(201);

        // Second request with same key but different amount: ₹150 (15000 paise)
        const res2 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", diffAmtKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "15000" });

        expect(res2.statusCode).toBe(409);
        expect(res2.body.message).toBe("Idempotency-Key has already been used for a different request");

        // DB Integrity check: Only 1 settlement created for this key
        const settlementCount = (await pool.query("SELECT COUNT(*) FROM settlements WHERE group_id = $1 AND amount IN ('10000', '15000')", [testGroupId])).rows[0].count;
        expect(parseInt(settlementCount, 10)).toBe(1);
    });

    // ---------------------------------------------------------
    // 6. Same Key + Different Settlement Direction
    // ---------------------------------------------------------

    test("should reject request with same Idempotency-Key but different direction (fromUser/toUser) with 409 Conflict", async () => {
        const diffDirKey = "test-key-diff-dir-300";

        // First request: A pays B ₹100
        const res1 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", diffDirKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" });
        expect(res1.statusCode).toBe(201);

        // Second request with same key but reversed direction: B pays A ₹100
        const res2 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", diffDirKey)
            .send({ fromUser: testUserBId, toUser: testUserAId, amount: "10000" });

        expect(res2.statusCode).toBe(409);
        expect(res2.body.message).toBe("Idempotency-Key has already been used for a different request");
    });

    // ---------------------------------------------------------
    // 7. Different Keys
    // ---------------------------------------------------------

    test("should process two legitimate settlement requests with different Idempotency-Keys independently", async () => {
        const key1 = "test-diff-key-alpha";
        const key2 = "test-diff-key-beta";

        const res1 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", key1)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" }); // Settle ₹100
        expect(res1.statusCode).toBe(201);

        const res2 = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", key2)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" }); // Settle another ₹100
        expect(res2.statusCode).toBe(201);

        expect(res1.body.settlement.id).not.toBe(res2.body.settlement.id);

        // Verify DB records for key1 and key2
        const checkKey1 = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [key1]);
        const checkKey2 = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [key2]);
        expect(checkKey1.rows.length).toBe(1);
        expect(checkKey2.rows.length).toBe(1);
    });

    // ---------------------------------------------------------
    // 8. Concurrent Same-Key Requests
    // ---------------------------------------------------------

    test("should ensure concurrent requests with the SAME Idempotency-Key produce exactly ONE financial settlement and ONE idempotency record", async () => {
        const concurrentSameKey = "conc-same-key-unique-999";
        const amount = "10000";

        const agentA1 = request.agent(app);
        const agentA2 = request.agent(app);

        await agentA1.post("/api/auth/login").send({ email: emailA, password: passwordPlain });
        await agentA2.post("/api/auth/login").send({ email: emailA, password: passwordPlain });

        const [res1, res2] = await Promise.all([
            agentA1
                .post(`/api/groups/${testGroupId}/settlements`)
                .set("Idempotency-Key", concurrentSameKey)
                .send({ fromUser: testUserAId, toUser: testUserBId, amount }),
            agentA2
                .post(`/api/groups/${testGroupId}/settlements`)
                .set("Idempotency-Key", concurrentSameKey)
                .send({ fromUser: testUserAId, toUser: testUserBId, amount })
        ]);

        // Both responses must return valid 201 status (one created, second replayed) or expected status
        expect([201]).toContain(res1.statusCode);
        expect([201]).toContain(res2.statusCode);

        // Verify database directly: Exactly ONE financial settlement and ONE idempotency key record inserted
        const idempotencyDbCheck = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [concurrentSameKey]);
        expect(idempotencyDbCheck.rows.length).toBe(1);

        const settlementId = idempotencyDbCheck.rows[0].response_body.settlement.id;
        const settlementDbCheck = await pool.query("SELECT * FROM settlements WHERE id = $1", [settlementId]);
        expect(settlementDbCheck.rows.length).toBe(1);
    });

    // ---------------------------------------------------------
    // 9. Concurrent Different-Key Requests
    // ---------------------------------------------------------

    test("should prevent race conditions on concurrent full settlements with DIFFERENT Idempotency-Keys via advisory lock", async () => {
        const amountToSettle = "100000"; // ₹1,000 full settlement on concurrentGroupId

        const agentA1 = request.agent(app);
        const agentA2 = request.agent(app);

        await agentA1.post("/api/auth/login").send({ email: emailA, password: passwordPlain });
        await agentA2.post("/api/auth/login").send({ email: emailA, password: passwordPlain });

        const [res1, res2] = await Promise.all([
            agentA1
                .post(`/api/groups/${concurrentGroupId}/settlements`)
                .set("Idempotency-Key", "conc-diff-key-1")
                .send({ fromUser: testUserAId, toUser: testUserBId, amount: amountToSettle }),
            agentA2
                .post(`/api/groups/${concurrentGroupId}/settlements`)
                .set("Idempotency-Key", "conc-diff-key-2")
                .send({ fromUser: testUserAId, toUser: testUserBId, amount: amountToSettle })
        ]);

        const statusCodes = [res1.statusCode, res2.statusCode].sort();

        // Exactly one request succeeds (201) and one is rejected (400 - no outstanding debt remaining)
        expect(statusCodes).toEqual([201, 400]);

        const successfulRes = res1.statusCode === 201 ? res1 : res2;
        const rejectedRes = res1.statusCode === 400 ? res1 : res2;

        expect(successfulRes.body.message).toBe("Settlement recorded successfully");
        expect(["No outstanding debt exists between these users", "Settlement amount exceeds outstanding debt"]).toContain(rejectedRes.body.message);

        // DB Verification: Total settled amount must equal exactly ₹1,000 (100000 paise), not ₹2,000
        const dbCheck = await pool.query("SELECT SUM(amount) AS total_settled FROM settlements WHERE group_id = $1", [concurrentGroupId]);
        expect(dbCheck.rows[0].total_settled).toBe("100000");
    });

    // ---------------------------------------------------------
    // 10. Audit + Idempotency + Settlement Transaction Atomicity
    // ---------------------------------------------------------

    test("should cleanly roll back settlement, audit log, and idempotency key when an inner transaction step fails", async () => {
        const client = await pool.connect();
        const testKeyRollback = "test-rollback-atomicity-key";
        let settlementId = null;

        try {
            await client.query("BEGIN");

            // 1. Insert settlement inside transaction
            const settlementRes = await client.query(
                "INSERT INTO settlements (group_id, from_user, to_user, amount) VALUES ($1, $2, $3, $4) RETURNING id",
                [testGroupId, testUserAId, testUserBId, 5000]
            );
            settlementId = settlementRes.rows[0].id;

            // 2. Insert idempotency record
            await client.query(
                "INSERT INTO idempotency_keys (user_id, group_id, idempotency_key, request_hash, response_status, response_body) VALUES ($1, $2, $3, $4, $5, $6)",
                [testUserAId, testGroupId, testKeyRollback, "hash123", 201, { message: "test" }]
            );

            // 3. Force failure via invalid FK in audit log
            const invalidUserId = "00000000-0000-0000-0000-000000000000";
            await client.query(
                "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)",
                [invalidUserId, "SETTLEMENT_RECORDED", "settlement", settlementId]
            );

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
        } finally {
            client.release();
        }

        // Verify zero orphan records
        const checkSettlement = await pool.query("SELECT * FROM settlements WHERE id = $1", [settlementId]);
        expect(checkSettlement.rows.length).toBe(0);

        const checkIdempotency = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [testKeyRollback]);
        expect(checkIdempotency.rows.length).toBe(0);
    });

    // ---------------------------------------------------------
    // 11. Idempotency + Audit Consistency & Direct DB Verification
    // ---------------------------------------------------------

    test("should maintain strict foreign-key and JSONB consistency between settlements, audit_logs, and idempotency_keys", async () => {
        const consistencyKey = "consistency-check-key-777";
        const res = await agentA
            .post(`/api/groups/${testGroupId}/settlements`)
            .set("Idempotency-Key", consistencyKey)
            .send({ fromUser: testUserAId, toUser: testUserBId, amount: "5000" });

        expect(res.statusCode).toBe(201);
        const settlementId = res.body.settlement.id;

        // Query direct PostgreSQL tables
        const auditRes = await pool.query("SELECT * FROM audit_logs WHERE entity_id = $1", [settlementId]);
        expect(auditRes.rows.length).toBe(1);
        expect(auditRes.rows[0].user_id).toBe(testUserAId);
        expect(auditRes.rows[0].entity_type).toBe("settlement");

        const idempotencyRes = await pool.query("SELECT * FROM idempotency_keys WHERE idempotency_key = $1", [consistencyKey]);
        expect(idempotencyRes.rows.length).toBe(1);
        expect(idempotencyRes.rows[0].response_body.settlement.id).toBe(settlementId);
        expect(idempotencyRes.rows[0].user_id).toBe(testUserAId);
        expect(idempotencyRes.rows[0].group_id).toBe(testGroupId);
    });

    // ---------------------------------------------------------
    // 12. Request Hash Verification
    // ---------------------------------------------------------

    test("should generate distinct SHA-256 request hashes for different payloads and identical hash for identical payload", () => {
        const payload1 = JSON.stringify({ fromUser: testUserAId, toUser: testUserBId, amount: "10000" });
        const payload2 = JSON.stringify({ fromUser: testUserAId, toUser: testUserBId, amount: "20000" });
        const payload3 = JSON.stringify({ fromUser: testUserBId, toUser: testUserAId, amount: "10000" });

        const hash1 = crypto.createHash("sha256").update(payload1).digest("hex");
        const hash1Dup = crypto.createHash("sha256").update(payload1).digest("hex");
        const hash2 = crypto.createHash("sha256").update(payload2).digest("hex");
        const hash3 = crypto.createHash("sha256").update(payload3).digest("hex");

        expect(hash1).toBe(hash1Dup);
        expect(hash1).not.toBe(hash2);
        expect(hash1).not.toBe(hash3);
    });
});