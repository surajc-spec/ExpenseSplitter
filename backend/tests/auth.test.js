const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../src/app");
const pool = require("../src/db/db");
const redis = require("../src/db/redis");

describe("Authentication Integration & Security Tests", () => {
    const testEmail = "auth_test_user@example.com";
    const testPassword = "password123";
    const testName = "Auth Test User";
    let createdUserId;

    beforeAll(async () => {
        // Cleanup previous test user if exists
        await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
    });

    beforeEach(async () => {
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });

    afterAll(async () => {
        // Cleanup created test user
        await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await pool.end();
        await redis.quit();
    });

      
    // 1. REGISTRATION
      
    describe("POST /api/auth/register", () => {
        test("should register a new user with hashed password and return 201", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    name: testName,
                    email: testEmail,
                    password: testPassword
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("User registered successfully");
            expect(res.body.user).toBeDefined();
            expect(res.body.user.id).toBeDefined();
            expect(res.body.user.email).toBe(testEmail);
            expect(res.body.user.password_hash).toBeUndefined(); // Security: Never expose password_hash in response!

            createdUserId = res.body.user.id;

            // Verify DB: password must be stored hashed via bcrypt, NOT plaintext
            const dbCheck = await pool.query("SELECT password_hash FROM users WHERE email = $1", [testEmail]);
            expect(dbCheck.rows.length).toBe(1);
            const isMatch = await bcrypt.compare(testPassword, dbCheck.rows[0].password_hash);
            expect(isMatch).toBe(true);
            expect(dbCheck.rows[0].password_hash).not.toBe(testPassword);
        });

        test("should reject registration with duplicate email with 409", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    name: testName,
                    email: testEmail,
                    password: testPassword
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toBe("Email already registered");
        });

        test("should reject registration missing name, email, or password with 400", async () => {
            const resMissingName = await request(app)
                .post("/api/auth/register")
                .send({
                    email: "another@example.com",
                    password: "password123"
                });
            expect(resMissingName.statusCode).toBe(400);

            const resMissingEmail = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "Name",
                    password: "password123"
                });
            expect(resMissingEmail.statusCode).toBe(400);

            const resMissingPassword = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "Name",
                    email: "another@example.com"
                });
            expect(resMissingPassword.statusCode).toBe(400);
        });
    });

      
    // 2. LOGIN
      
    describe("POST /api/auth/login", () => {
        test("should log in successfully with valid credentials and set HTTP-only cookie", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testEmail,
                    password: testPassword
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Login successful");
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testEmail);

            // Verify HTTP-only cookie header
            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const tokenCookie = cookies.find(c => c.startsWith("token="));
            expect(tokenCookie).toBeDefined();
            expect(tokenCookie).toContain("HttpOnly");
        });

        test("should reject login with wrong password with 401", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testEmail,
                    password: "wrongpassword"
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Invalid email or password");
        });

        test("should reject login with non-existent email with 401", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "nonexistent_email_12345@example.com",
                    password: testPassword
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Invalid email or password");
        });

        test("should reject login missing email or password with 400", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: testEmail
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Email and password are required");
        });
    });

      
    // 3. AUTHENTICATED SESSION / ME & LOGOUT
      
    describe("GET /api/auth/me & POST /api/auth/logout", () => {
        test("should return current user details when authenticated via session cookie", async () => {
            const agent = request.agent(app);

            // 1. Log in
            await agent
                .post("/api/auth/login")
                .send({ email: testEmail, password: testPassword });

            // 2. Request /me
            const meRes = await agent.get("/api/auth/me");
            expect(meRes.statusCode).toBe(200);
            expect(meRes.body.user).toBeDefined();
            expect(meRes.body.user.userId).toBe(createdUserId);
        });

        test("should reject /me request when unauthenticated with 401", async () => {
            const res = await request(app).get("/api/auth/me");
            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Authentication required");
        });

        test("should reject /me request with invalid token cookie with 401", async () => {
            const res = await request(app)
                .get("/api/auth/me")
                .set("Cookie", ["token=invalid_jwt_token_string"]);

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Invalid or expired token");
        });

        test("should log out successfully and clear authentication cookie", async () => {
            const agent = request.agent(app);

            await agent.post("/api/auth/login").send({ email: testEmail, password: testPassword });

            const logoutRes = await agent.post("/api/auth/logout");
            expect(logoutRes.statusCode).toBe(200);
            expect(logoutRes.body.message).toBe("Logout successful");

            // Verify /me fails after logout
            const meRes = await agent.get("/api/auth/me");
            expect(meRes.statusCode).toBe(401);
        });
    });
});
