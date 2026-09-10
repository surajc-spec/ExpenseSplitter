const pool = require("../db/db");
const calculateEqualSplit = require("../algorithms/equalSplit");
const calculateExactSplit = require("../algorithms/exactSplit");
const calculatePercentageSplit = require("../algorithms/percentageSplit");
const calculateBalances = require("../algorithms/calculateBalances");

const createExpense = async (req, res) => {
    const client = await pool.connect();

    try {
        const { groupId } = req.params;
        const {
            description,
            totalAmount,
            splitType,
            splits
        } = req.body;

        const userId = req.user.userId;

        
        // 1. COMMON VALIDATION
        if (!description || totalAmount === undefined || !splitType || !splits) {
            return res.status(400).json({
                message: "Description, totalAmount, splitType and splits are required"
            });
        }

        if (!Array.isArray(splits) || splits.length === 0) {
            return res.status(400).json({
                message: "At least one split is required"
            });
        }

        if (!["equal", "exact", "percentage"].includes(splitType)) {
            return res.status(400).json({
                message: "Invalid split type"
            });
        }

        if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
            return res.status(400).json({
                message: "totalAmount must be a positive integer in paise"
            });
        }

        
        // 2. VALIDATE SPLIT USERS
        for (const split of splits) {
            if (!split.userId) {
                return res.status(400).json({
                    message: "Each split must contain a userId"
                });
            }
        }

        const splitUserIds = splits.map(
            split => split.userId
        );

        // Prevent duplicate users
        const uniqueUserIds = new Set(splitUserIds);

        if (uniqueUserIds.size !== splitUserIds.length) {
            return res.status(400).json({
                message: "A user cannot appear more than once in splits"
            });
        }

        
        // 3. CHECK REQUESTER IS GROUP MEMBER
        const memberCheck = await pool.query(
            `SELECT role
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        
        // 4. CHECK ALL SPLIT USERS ARE MEMBERS
        const membersResult = await pool.query(
            `SELECT user_id
             FROM group_members
             WHERE group_id = $1
             AND user_id = ANY($2::uuid[])`,
            [groupId, splitUserIds]
        );

        if (membersResult.rows.length !== splitUserIds.length) {
            return res.status(400).json({
                message: "All split users must be members of the group"
            });
        }

        
        // 5. CALCULATE SPLITS
        let calculatedSplits;

        try {
            switch (splitType) {
                case "equal":
                    calculatedSplits = calculateEqualSplit(
                        totalAmount,
                        splits
                    );
                    break;

                case "exact":
                    calculatedSplits = calculateExactSplit(
                        totalAmount,
                        splits
                    );
                    break;

                case "percentage":
                    calculatedSplits = calculatePercentageSplit(
                        totalAmount,
                        splits
                    );
                    break;
            }
        } catch (error) {
            return res.status(400).json({
                message: error.message
            });
        }

        
        // 6. DATABASE TRANSACTION
        

        await client.query("BEGIN");

        // Create expense
        const expenseResult = await client.query(
            `INSERT INTO expenses (
                group_id,
                paid_by,
                description,
                total_amount,
                split_type
             )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING
                id,
                group_id,
                paid_by,
                description,
                total_amount,
                split_type,
                created_at`,
            [
                groupId,
                userId,
                description,
                totalAmount,
                splitType
            ]
        );

        const expense = expenseResult.rows[0];

        // Create expense splits
        for (const split of calculatedSplits) {
            await client.query(
                `INSERT INTO expense_splits (
                    expense_id,
                    user_id,
                    amount
                 )
                 VALUES ($1, $2, $3)`,
                [
                    expense.id,
                    split.userId,
                    split.amount
                ]
            );
        }

        
        // 7. COMMIT
        

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Expense created successfully",
            expense,
            splits: calculatedSplits
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create expense error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });

    } finally {
        client.release();
    }
};

const getGroupExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Check whether requester is a group member
        const memberCheck = await pool.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        // Get expenses with their splits
        const result = await pool.query(
            `SELECT
                e.id,
                e.description,
                e.total_amount,
                e.split_type,
                e.paid_by,
                e.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'user_id', es.user_id,
                            'amount', es.amount
                        )
                    ) FILTER (WHERE es.id IS NOT NULL),
                    '[]'
                ) AS splits
             FROM expenses e
             LEFT JOIN expense_splits es
                 ON es.expense_id = e.id
             WHERE e.group_id = $1
             GROUP BY e.id
             ORDER BY e.created_at DESC`,
            [groupId]
        );

        return res.status(200).json({
            expenses: result.rows
        });

    } catch (error) {
        console.error("Get group expenses error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getGroupBalances = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

         
        // 1. CHECK GROUP MEMBERSHIP
         

        const memberCheck = await pool.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

         
        // 2. GET EXPENSES
         

        const expenseResult = await pool.query(
            `SELECT
                e.id,
                e.total_amount,
                e.paid_by,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'user_id', es.user_id,
                            'amount', es.amount
                        )
                    ) FILTER (WHERE es.id IS NOT NULL),
                    '[]'
                ) AS splits
             FROM expenses e
             LEFT JOIN expense_splits es
                 ON es.expense_id = e.id
             WHERE e.group_id = $1
             GROUP BY e.id`,
            [groupId]
        );

         
        // 3. CALCULATE BALANCES
         

        const balances = calculateBalances(
            expenseResult.rows
        );

        return res.status(200).json({
            balances
        });

    } catch (error) {
        console.error("Get group balances error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
module.exports = {
    createExpense,
    getGroupExpenses,
    getGroupBalances
};