const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/db/db");
const redis = require("../src/db/redis");

describe("Group Management & RBAC Integration Tests", () => {
    let adminUserId;
    let memberUserId;
    let otherUserId;
    let nonMemberUserId;
    let testGroupId;

    const passwordPlain = "grouptest123";
    const emailAdmin = "group_test_admin@example.com";
    const emailMember = "group_test_member@example.com";
    const emailOther = "group_test_other@example.com";
    const emailNonMember = "group_test_nonmember@example.com";

    let agentAdmin;
    let agentMember;
    let agentNonMember;

    beforeEach(async () => {
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });

    beforeAll(async () => {
        // Cleanup previous test data
        await pool.query("DELETE FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Group RBAC Test%')");
        await pool.query("DELETE FROM groups WHERE name LIKE 'Group RBAC Test%'");
        await pool.query("DELETE FROM users WHERE email IN ($1, $2, $3, $4)", [emailAdmin, emailMember, emailOther, emailNonMember]);

        // Create test users
        const hash = await bcrypt.hash(passwordPlain, 10);

        const resA = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Group Admin", emailAdmin, hash]);
        adminUserId = resA.rows[0].id;

        const resM = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Group Member", emailMember, hash]);
        memberUserId = resM.rows[0].id;

        const resO = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Other Member", emailOther, hash]);
        otherUserId = resO.rows[0].id;

        const resNM = await pool.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id", ["Non Member", emailNonMember, hash]);
        nonMemberUserId = resNM.rows[0].id;

        // Login agents
        agentAdmin = request.agent(app);
        agentMember = request.agent(app);
        agentNonMember = request.agent(app);

        await agentAdmin.post("/api/auth/login").send({ email: emailAdmin, password: passwordPlain });
        await agentMember.post("/api/auth/login").send({ email: emailMember, password: passwordPlain });
        await agentNonMember.post("/api/auth/login").send({ email: emailNonMember, password: passwordPlain });
    }, 30000);

    afterAll(async () => {
        // Cleanup created groups and users
        await pool.query("DELETE FROM group_members WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'Group RBAC Test%')");
        await pool.query("DELETE FROM groups WHERE name LIKE 'Group RBAC Test%'");
        await pool.query("DELETE FROM users WHERE email IN ($1, $2, $3, $4)", [emailAdmin, emailMember, emailOther, emailNonMember]);
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await pool.end();
        await redis.quit();
    });

      
    // 1. CREATE GROUP
      
    describe("POST /api/groups", () => {
        test("should create group and assign creator as admin in group_members", async () => {
            const res = await agentAdmin
                .post("/api/groups")
                .send({ name: "Group RBAC Test 1" });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Group created successfully");
            expect(res.body.group).toBeDefined();
            expect(res.body.group.name).toBe("Group RBAC Test 1");

            testGroupId = res.body.group.id;

            // Verify DB: creator must be admin in group_members
            const memberCheck = await pool.query(
                "SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2",
                [testGroupId, adminUserId]
            );
            expect(memberCheck.rows.length).toBe(1);
            expect(memberCheck.rows[0].role).toBe("admin");
        });

        test("should reject group creation missing name with 400", async () => {
            const res = await agentAdmin.post("/api/groups").send({});
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Group name is required");
        });

        test("should reject unauthenticated group creation with 401", async () => {
            const res = await request(app).post("/api/groups").send({ name: "Unauth Group" });
            expect(res.statusCode).toBe(401);
        });
    });

      
    // 2. ADD MEMBER
      
    describe("POST /api/groups/:groupId/members", () => {
        test("should allow group admin to add member by email with 201", async () => {
            const res = await agentAdmin
                .post(`/api/groups/${testGroupId}/members`)
                .send({ email: emailMember });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Member added successfully");
            expect(res.body.member.email).toBe(emailMember);
        });

        test("should reject adding member if requester is a regular member (not admin) with 403", async () => {
            const res = await agentMember
                .post(`/api/groups/${testGroupId}/members`)
                .send({ email: emailOther });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Only group admins can add members");
        });

        test("should reject adding user who is already a member with 409", async () => {
            const res = await agentAdmin
                .post(`/api/groups/${testGroupId}/members`)
                .send({ email: emailMember });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe("User is already a member");
        });

        test("should reject adding non-existent user email with 404", async () => {
            const res = await agentAdmin
                .post(`/api/groups/${testGroupId}/members`)
                .send({ email: "ghost_nonexistent@example.com" });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("User not found");
        });
    });

      
    // 3. GET MEMBERS & MY GROUPS
      
    describe("GET /api/groups/:groupId/members & GET /api/groups", () => {
        test("should allow member to view group member list", async () => {
            const res = await agentMember.get(`/api/groups/${testGroupId}/members`);
            expect(res.statusCode).toBe(200);
            expect(res.body.group.id).toBe(testGroupId);
            expect(res.body.members.length).toBe(2);
        });

        test("should forbid non-member from viewing group members with 403", async () => {
            const res = await agentNonMember.get(`/api/groups/${testGroupId}/members`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("You are not a member of this group");
        });

        test("should return list of user's joined groups in GET /api/groups", async () => {
            const res = await agentMember.get("/api/groups");
            expect(res.statusCode).toBe(200);
            expect(res.body.groups.some(g => g.id === testGroupId)).toBe(true);
        });
    });

      
    // 4. UPDATE MEMBER ROLE
      
    describe("PUT /api/groups/:groupId/members/:userId/role", () => {
        test("should allow admin to promote regular member to admin", async () => {
            const res = await agentAdmin
                .put(`/api/groups/${testGroupId}/members/${memberUserId}/role`)
                .send({ role: "admin" });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Member role updated successfully");
            expect(res.body.member.role).toBe("admin");
        });

        test("should reject admin changing their own role with 400", async () => {
            const res = await agentAdmin
                .put(`/api/groups/${testGroupId}/members/${adminUserId}/role`)
                .send({ role: "member" });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You cannot change your own role");
        });

        test("should demote member back to regular role", async () => {
            const res = await agentAdmin
                .put(`/api/groups/${testGroupId}/members/${memberUserId}/role`)
                .send({ role: "member" });

            expect(res.statusCode).toBe(200);
            expect(res.body.member.role).toBe("member");
        });
    });

      
    // 5. REMOVE MEMBER & LEAVE GROUP
      
    describe("DELETE /api/groups/:groupId/members/:userId & LEAVE", () => {
        test("should prevent admin from removing themselves with 400", async () => {
            const res = await agentAdmin.delete(`/api/groups/${testGroupId}/members/${adminUserId}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Group admin cannot remove themselves");
        });

        test("should prevent group creator from leaving group with 400", async () => {
            const res = await agentAdmin.delete(`/api/groups/${testGroupId}/leave`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Group creator cannot leave the group");
        });

        test("should allow regular member to leave group", async () => {
            const res = await agentMember.delete(`/api/groups/${testGroupId}/leave`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("You left the group successfully");
        });
    });

      
    // 6. OWNERSHIP TRANSFER
      
    describe("PUT /api/groups/:groupId/ownership", () => {
        beforeEach(async () => {
            // Ensure memberUserId is added back to group for ownership transfer test
            const check = await pool.query("SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2", [testGroupId, memberUserId]);
            if (check.rows.length === 0) {
                await pool.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')", [testGroupId, memberUserId]);
            }
        });

        test("should reject ownership transfer to non-member with 400", async () => {
            const res = await agentAdmin
                .put(`/api/groups/${testGroupId}/ownership`)
                .send({ userId: nonMemberUserId });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("New owner must be a member of the group");
        });

        test("should allow group owner to transfer ownership to existing member", async () => {
            const res = await agentAdmin
                .put(`/api/groups/${testGroupId}/ownership`)
                .send({ userId: memberUserId });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Group ownership transferred successfully");

            // Verify DB: created_by updated in groups table
            const groupCheck = await pool.query("SELECT created_by FROM groups WHERE id = $1", [testGroupId]);
            expect(groupCheck.rows[0].created_by).toBe(memberUserId);
        });
    });
});
