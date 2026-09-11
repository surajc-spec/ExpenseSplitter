const redis = require("../db/redis");

const createRateLimiter = ({ keyPrefix, limit, windowSeconds }) => {
    return async (req, res, next) => {
        try {
            const ip = req.ip;
            const key = `${keyPrefix}:${ip}`;

            const currentCount = await redis.incr(key);

            if (currentCount === 1) {
                await redis.expire(key, windowSeconds);
            }

            if (currentCount > limit) {
                const ttl = await redis.ttl(key);

                return res.status(429).json({
                    message: "Too many requests. Please try again later.",
                    retryAfter: ttl
                });
            }

            next();
        } catch (error) {
            console.error("Rate limiter error:", error);

            // Fail open: if Redis is unavailable,
            // don't make the entire API unavailable.
            next();
        }
    };
};

const loginRateLimiter = createRateLimiter({
    keyPrefix: "rate_limit:login",
    limit: 5,
    windowSeconds: 60
});

const registerRateLimiter = createRateLimiter({
    keyPrefix: "rate_limit:register",
    limit: 5,
    windowSeconds: 60
});

const expenseRateLimiter = createRateLimiter({
    keyPrefix: "rate_limit:expense",
    limit: 30,
    windowSeconds: 60
});

const settlementRateLimiter = createRateLimiter({
    keyPrefix: "rate_limit:settlement",
    limit: 10,
    windowSeconds: 60
});

module.exports = {
    loginRateLimiter,
    registerRateLimiter,
    expenseRateLimiter,
    settlementRateLimiter
};