require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./db/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            status: "OK",
            message: "Expense Splitter API is running",
            database: "Connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Database connection failed"
        });
    }
});

module.exports = app;