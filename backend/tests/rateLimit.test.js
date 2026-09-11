require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");
const redis = require("../src/db/redis");
const {
    loginRateLimiter,
    registerRateLimiter,
    expenseRateLimiter,
    settlementRateLimiter
} = require("../src/middleware/rateLimit.middleware");

describe("Redis IP Rate Limiting Tests", () => {
    beforeEach(async () => {
        // Cleanup test keys before each test
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
    });

    afterAll(async () => {
        // Final cleanup of test keys and close Redis connection
        const keys = await redis.keys("rate_limit:*");
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await redis.quit();
    });

    // ---------------------------------------------------------
    // A. LOGIN RATE LIMIT
    // ---------------------------------------------------------
    test("A. LOGIN RATE LIMIT: allows 5 requests per minute per IP and returns 429 on 6th request with retryAfter", async () => {
        for (let i = 1; i <= 5; i++) {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ email: "invalid_user@example.com", password: "wrong_password" });

            expect(res.statusCode).toBe(401); // Reaches controller
        }

        const res6 = await request(app)
            .post("/api/auth/login")
            .send({ email: "invalid_user@example.com", password: "wrong_password" });

        expect(res6.statusCode).toBe(429);
        expect(res6.body.message).toBe("Too many requests. Please try again later.");
        expect(typeof res6.body.retryAfter).toBe("number");
        expect(res6.body.retryAfter).toBeGreaterThan(0);
    });

    // ---------------------------------------------------------
    // B. REGISTER RATE LIMIT
    // ---------------------------------------------------------
    test("B. REGISTER RATE LIMIT: allows 5 requests per minute per IP and returns 429 on 6th request", async () => {
        for (let i = 1; i <= 5; i++) {
            const res = await request(app)
                .post("/api/auth/register")
                .send({}); // Invalid request, reaches controller validation (400)

            expect(res.statusCode).toBe(400);
        }

        const res6 = await request(app)
            .post("/api/auth/register")
            .send({});

        expect(res6.statusCode).toBe(429);
        expect(res6.body.message).toBe("Too many requests. Please try again later.");
    });

    // ---------------------------------------------------------
    // C. EXPENSE RATE LIMIT
    // ---------------------------------------------------------
    test("C. EXPENSE RATE LIMIT: allows 30 requests per minute per IP and returns 429 on 31st request", async () => {
        const mockReq = { ip: "192.168.1.110" };
        let status;
        let body;
        const mockRes = {
            status: (code) => { status = code; return mockRes; },
            json: (data) => { body = data; return mockRes; }
        };
        const next = jest.fn();

        for (let i = 0; i < 30; i++) {
            await expenseRateLimiter(mockReq, mockRes, next);
        }
        expect(next).toHaveBeenCalledTimes(30);

        await expenseRateLimiter(mockReq, mockRes, next);
        expect(status).toBe(429);
        expect(body.message).toBe("Too many requests. Please try again later.");
        expect(typeof body.retryAfter).toBe("number");
    });

    // ---------------------------------------------------------
    // D. SETTLEMENT RATE LIMIT
    // ---------------------------------------------------------
    test("D. SETTLEMENT RATE LIMIT: allows 10 requests per minute per IP and returns 429 on 11th request", async () => {
        const mockReq = { ip: "192.168.1.120" };
        let status;
        let body;
        const mockRes = {
            status: (code) => { status = code; return mockRes; },
            json: (data) => { body = data; return mockRes; }
        };
        const next = jest.fn();

        for (let i = 0; i < 10; i++) {
            await settlementRateLimiter(mockReq, mockRes, next);
        }
        expect(next).toHaveBeenCalledTimes(10);

        await settlementRateLimiter(mockReq, mockRes, next);
        expect(status).toBe(429);
        expect(body.message).toBe("Too many requests. Please try again later.");
        expect(typeof body.retryAfter).toBe("number");
    });

    // ---------------------------------------------------------
    // E. IP ISOLATION
    // ---------------------------------------------------------
    test("E. IP ISOLATION: requests from IP A do not consume rate-limit counter for IP B", async () => {
        const reqA = { ip: "192.168.1.100" };
        const reqB = { ip: "192.168.1.200" };

        let statusA, bodyA;
        const resA = {
            status: (code) => { statusA = code; return resA; },
            json: (data) => { bodyA = data; return resA; }
        };
        const resB = {
            status: (code) => resB,
            json: (data) => resB
        };

        const nextA = jest.fn();
        const nextB = jest.fn();

        // 1. Consume 5 requests for IP A
        for (let i = 0; i < 5; i++) {
            await loginRateLimiter(reqA, resA, nextA);
        }
        expect(nextA).toHaveBeenCalledTimes(5);

        // 2. 6th request for IP A is blocked
        await loginRateLimiter(reqA, resA, nextA);
        expect(statusA).toBe(429);
        expect(bodyA.message).toBe("Too many requests. Please try again later.");

        // 3. Request for IP B must still be allowed
        await loginRateLimiter(reqB, resB, nextB);
        expect(nextB).toHaveBeenCalledTimes(1);

        // Clean up test keys
        await redis.del("rate_limit:login:192.168.1.100");
        await redis.del("rate_limit:login:192.168.1.200");
    });

    // ---------------------------------------------------------
    // F. WINDOW EXPIRATION
    // ---------------------------------------------------------
    test("F. WINDOW EXPIRATION: request counter resets after window expiration", async () => {
        const req = { ip: "192.168.1.150" };
        let status;
        const resMock = {
            status: (code) => { status = code; return resMock; },
            json: () => resMock
        };
        const next = jest.fn();

        // Consume limit of 5 for login
        for (let i = 0; i < 5; i++) {
            await loginRateLimiter(req, resMock, next);
        }
        expect(next).toHaveBeenCalledTimes(5);

        // 6th request blocked
        await loginRateLimiter(req, resMock, next);
        expect(status).toBe(429);

        // Delete Redis key to simulate window expiration
        await redis.del("rate_limit:login:192.168.1.150");

        // Next request should be allowed again
        next.mockClear();
        await loginRateLimiter(req, resMock, next);
        expect(next).toHaveBeenCalledTimes(1);
    });

    // ---------------------------------------------------------
    // G. REDIS FAILURE / FAIL-OPEN
    // ---------------------------------------------------------
    test("G. REDIS FAILURE / FAIL-OPEN: calls next() when Redis operations fail", async () => {
        const req = { ip: "192.168.1.180" };
        const resMock = {};
        const next = jest.fn();

        // Spy on redis.incr and simulate a Redis failure
        const incrSpy = jest.spyOn(redis, "incr").mockRejectedValueOnce(new Error("Redis Connection Failure"));

        await loginRateLimiter(req, resMock, next);

        // Fail-open: next() called despite Redis error
        expect(next).toHaveBeenCalledTimes(1);

        incrSpy.mockRestore();
    });

    // ---------------------------------------------------------
    // H. REDIS KEY ISOLATION
    // ---------------------------------------------------------
    test("H. REDIS KEY ISOLATION: different rate limiters use isolated Redis key prefixes", async () => {
        const req = { ip: "192.168.1.220" };
        const resMock = {};
        const next = jest.fn();

        // Exhaust login rate limit (5 requests)
        for (let i = 0; i < 5; i++) {
            await loginRateLimiter(req, resMock, next);
        }

        const loginKeyExists = await redis.exists("rate_limit:login:192.168.1.220");
        const registerKeyExists = await redis.exists("rate_limit:register:192.168.1.220");

        expect(loginKeyExists).toBe(1);
        expect(registerKeyExists).toBe(0); // Distinct key namespace!

        // Exhausting login limit does NOT block register endpoint
        next.mockClear();
        await registerRateLimiter(req, resMock, next);
        expect(next).toHaveBeenCalledTimes(1);

        // Clean up test keys
        await redis.del("rate_limit:login:192.168.1.220");
        await redis.del("rate_limit:register:192.168.1.220");
    });
});
