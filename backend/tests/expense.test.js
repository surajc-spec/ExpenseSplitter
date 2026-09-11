const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/db/db");
const redis = require("../src/db/redis");

describe("Expense Creation & Financial Balances Integration Tests", () => {
    let userAId;
    let userBId;
    let nonMemberId;
    let groupId;

    const passwordPlain = "expensetest123";
    const emailA = "expense_test_a@example.com";
    const emailB = "expense_test_b@example.com";
    const emailNonMember = "expense_test_nonmember@example.com";

    let agentA;
    let agentNonMember;

    beforeEach(async () => {
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });

    beforeAll(async () => {
        // Cleanup previous test data
        await pool.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Expense Test Group%'))");
        await pool.query("DELETE FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Expense Test Group%')");
        await pool.query("DELETE FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Expense Test Group%')");
        await pool.query("DELETE FROM groups WHERE name LIKE 'Expense Test Group%'");
        await pool.query("DELETE FROM users WHERE email IN ($1, $2, $3)", [emailA, emailB, emailNonMember]);

        // Create test users
        const hash = await bcrypt.hash(passwordPlain, 10);
        const resA = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Expense User A", emailA, hash]);
        userAId = resA.rows[0].id;

        const resB = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Expense User B", emailB, hash]);
        userBId = resB.rows[0].id;

        const resNM = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Expense Non Member", emailNonMember, hash]);
        nonMemberId = resNM.rows[0].id;

        // Create Group
        const groupRes = await pool.query(
            "INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id",
            ["Expense Test Group 1", userAId]
        );
        groupId = groupRes.rows[0].id;

        // Add User A & User B to group
        await pool.query(
            "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'member')",
            [groupId, userAId, userBId]
        );

        // Login agents
        agentA = request.agent(app);
        agentNonMember = request.agent(app);

        await agentA.post("/api/auth/login").send({ email: emailA, password: passwordPlain });
        await agentNonMember.post("/api/auth/login").send({ email: emailNonMember, password: passwordPlain });
    }, 30000);

    afterAll(async () => {
        // Cleanup all test records
        if (groupId) {
            await pool.query("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = $1)", [groupId]);
            await pool.query("DELETE FROM expenses WHERE group_id = $1", [groupId]);
            await pool.query("DELETE FROM group_members WHERE group_id = $1", [groupId]);
            await pool.query("DELETE FROM groups WHERE id = $1", [groupId]);
        }
        await pool.query("DELETE FROM users WHERE email IN ($1, $2, $3)", [emailA, emailB, emailNonMember]);
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await pool.end();
        await redis.quit();
    });

      
    // 1. EQUAL SPLIT EXPENSE CREATION
      
    describe("POST /api/groups/:groupId/expenses (Equal Split)", () => {
        test("should create equal split expense and store integer paise records in DB", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Dinner Party",
                    totalAmount: 15000, // ₹150.00 = 15000 paise
                    splitType: "equal",
                    splits: [
                        { userId: userAId },
                        { userId: userBId }
                    ]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Expense created successfully");
            expect(res.body.expense.total_amount).toBe("15000"); // Stored as BIGINT string
            expect(res.body.splits.length).toBe(2);
            expect(res.body.splits[0].amount).toBe(7500);
            expect(res.body.splits[1].amount).toBe(7500);

            // DB Verification: sum of splits must equal expense total
            const dbExpense = await pool.query("SELECT * FROM expenses WHERE id = $1", [res.body.expense.id]);
            expect(dbExpense.rows.length).toBe(1);

            const dbSplits = await pool.query("SELECT * FROM expense_splits WHERE expense_id = $1", [res.body.expense.id]);
            expect(dbSplits.rows.length).toBe(2);
            const sumSplits = dbSplits.rows.reduce((sum, s) => sum + BigInt(s.amount), 0n);
            expect(sumSplits.toString()).toBe("15000");
        });
    });

      
    // 2. EXACT SPLIT EXPENSE CREATION
      
    describe("POST /api/groups/:groupId/expenses (Exact Split)", () => {
        test("should create exact split expense when amounts sum correctly", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Grocery Shopping",
                    totalAmount: 10000, // ₹100.00
                    splitType: "exact",
                    splits: [
                        { userId: userAId, amount: 6000 }, // ₹60.00
                        { userId: userBId, amount: 4000 }  // ₹40.00
                    ]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.expense.total_amount).toBe("10000");
        });

        test("should reject exact split when sum does not equal total amount", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Mismatched Expense",
                    totalAmount: 10000,
                    splitType: "exact",
                    splits: [
                        { userId: userAId, amount: 5000 },
                        { userId: userBId, amount: 4000 } // Total 9000 != 10000
                    ]
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Sum of split amounts must equal total amount");
        });
    });

      
    // 3. PERCENTAGE SPLIT EXPENSE CREATION
      
    describe("POST /api/groups/:groupId/expenses (Percentage Split)", () => {
        test("should create percentage split expense when percentages sum to 100%", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Cab Ride",
                    totalAmount: 20000, // ₹200.00
                    splitType: "percentage",
                    splits: [
                        { userId: userAId, percentage: 70 },
                        { userId: userBId, percentage: 30 }
                    ]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.splits[0].amount).toBe(14000);
            expect(res.body.splits[1].amount).toBe(6000);
        });

        test("should reject percentage split when percentages do not sum to 100", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Invalid Percentage",
                    totalAmount: 20000,
                    splitType: "percentage",
                    splits: [
                        { userId: userAId, percentage: 50 },
                        { userId: userBId, percentage: 40 } // Total 90% != 100%
                    ]
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Sum of percentages must equal 100");
        });
    });

      
    // 4. INPUT VALIDATIONS & AUTHORIZATION
      
    describe("Validation & Authorization Edge Cases", () => {
        test("should reject invalid split type with 400", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Test",
                    totalAmount: 10000,
                    splitType: "invalid_type",
                    splits: [{ userId: userAId }]
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Invalid split type");
        });

        test("should reject zero or negative totalAmount with 400", async () => {
            const resZero = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Test Zero",
                    totalAmount: 0,
                    splitType: "equal",
                    splits: [{ userId: userAId }]
                });
            expect(resZero.statusCode).toBe(400);

            const resNegative = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Test Negative",
                    totalAmount: -5000,
                    splitType: "equal",
                    splits: [{ userId: userAId }]
                });
            expect(resNegative.statusCode).toBe(400);
        });

        test("should reject duplicate users in splits array with 400", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Duplicate Split User",
                    totalAmount: 10000,
                    splitType: "equal",
                    splits: [
                        { userId: userAId },
                        { userId: userAId } // Duplicate userAId!
                    ]
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("A user cannot appear more than once in splits");
        });

        test("should reject expense creation from non-group member with 403", async () => {
            const res = await agentNonMember
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Non Member Expense",
                    totalAmount: 10000,
                    splitType: "equal",
                    splits: [{ userId: userAId }]
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not a member of this group");
        });

        test("should reject expense if split user is not a group member with 400", async () => {
            const res = await agentA
                .post(`/api/groups/${groupId}/expenses`)
                .send({
                    description: "Invalid Participant",
                    totalAmount: 10000,
                    splitType: "equal",
                    splits: [
                        { userId: userAId },
                        { userId: nonMemberId } // Non-member participant!
                    ]
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("All split users must be members of the group");
        });
    });

      
    // 5. FETCH EXPENSES & CALCULATED BALANCES
      
    describe("GET /api/groups/:groupId/expenses & GET /api/groups/:groupId/balances", () => {
        test("should return list of group expenses for group member", async () => {
            const res = await agentA.get(`/api/groups/${groupId}/expenses`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.expenses)).toBe(true);
            expect(res.body.expenses.length).toBeGreaterThan(0);
        });

        test("should return calculated net group balances for group member", async () => {
            const res = await agentA.get(`/api/groups/${groupId}/balances`);
            expect(res.statusCode).toBe(200);
            expect(res.body.balances).toBeDefined();

            // Sum of all net balances must equal exactly 0
            const totalBalanceSum = res.body.balances.reduce((sum, b) => sum + BigInt(b.balance), 0n);
            expect(totalBalanceSum).toBe(0n);
        });

        test("should forbid non-member from viewing group balances with 403", async () => {
            const res = await agentNonMember.get(`/api/groups/${groupId}/balances`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not a member of this group");
        });
    });
});
