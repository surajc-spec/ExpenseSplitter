const bcrypt = require("bcrypt");
const pool = require("../db/db");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

      
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

    
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

   
        const passwordHash = await bcrypt.hash(password, 10);

    
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role, created_at`,
            [name, email, passwordHash]
        );

        // 5. Return safe user data
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    register
};