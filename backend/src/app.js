require("dotenv").config();
const redis = require("./db/redis");

const express = require("express");
const cors = require("cors");
const pool = require("./db/db");
const authRoutes = require("./routes/auth.routes");
const groupRoutes = require("./routes/group.routes");
const expenseRoutes = require("./routes/expense.routes");
const settlementRoutes = require("./routes/settlement.routes");
const cookieParser = require("cookie-parser");

const app = express();

// Trust proxy for Render / Vercel reverse proxy (for IP rate limiting and secure cookies)
app.set("trust proxy", 1);

// Configure CORS for cross-domain HTTP-only cookie credentials
app.use(
    cors({
        origin: function (origin, callback) {
            // Echo back the exact requesting origin (e.g. Vercel domain) to allow credentials mode: 'include'
            if (origin) {
                return callback(null, origin);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/groups", expenseRoutes);
app.use("/api/groups", settlementRoutes);

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "OK",
            message: "Expense Splitter API is running",
            database: "Connected",
            time: result.rows[0].now,
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Database connection failed",
        });
    }
});

module.exports = app;