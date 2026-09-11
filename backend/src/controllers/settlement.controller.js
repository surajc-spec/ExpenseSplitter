const pool = require("../db/db");
const crypto = require("crypto");

const calculateBalances = require("../algorithms/calculateBalances");
const settleDebts = require("../algorithms/settleDebts");
const { createAuditLog } = require("../services/audit.service");

const getSuggestedSettlements = async (req, res) => {
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

        // 2. FETCH GROUP EXPENSES
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

        // 3. CALCULATE BALANCES FROM EXPENSES
        const balances = calculateBalances(
            expenseResult.rows
        );

        // Convert balances into a Map
        const balanceMap = new Map();

        for (const balance of balances) {
            balanceMap.set(
                balance.user_id,
                BigInt(balance.balance)
            );
        }

        // 4. FETCH RECORDED SETTLEMENTS
        const settlementResult = await pool.query(
            `SELECT
                from_user,
                to_user,
                amount
             FROM settlements
             WHERE group_id = $1`,
            [groupId]
        );

        // 5. APPLY RECORDED SETTLEMENTS
        for (const settlement of settlementResult.rows) {

            const fromUser = settlement.from_user;
            const toUser = settlement.to_user;
            const amount = BigInt(settlement.amount);

            // Person who paid becomes less in debt
            balanceMap.set(
                fromUser,
                (balanceMap.get(fromUser) || 0n) + amount
            );

            // Person who received has less money owed to them
            balanceMap.set(
                toUser,
                (balanceMap.get(toUser) || 0n) - amount
            );
        }

        // 6. CONVERT MAP BACK TO BALANCE ARRAY
        const adjustedBalances = Array.from(
            balanceMap.entries()
        ).map(([userId, balance]) => ({
            user_id: userId,
            balance: balance.toString()
        }));

        // 7. CALCULATE NEW SUGGESTED SETTLEMENTS
        const settlements = settleDebts(
            adjustedBalances
        );

        // 8. RETURN RESULT
        return res.status(200).json({
            settlements
        });

    } catch (error) {
        console.error(
            "Get suggested settlements error:",
            error
        );

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const recordSettlement = async (req, res) => {

    const client = await pool.connect();

    let transactionStarted = false;

    try {

        const { groupId } = req.params;
        const userId = req.user.userId;

        const body = req.body || {};
        const {
            fromUser,
            toUser,
            amount
        } = body;


       
        // 1. VALIDATE IDEMPOTENCY KEY
       

        const idempotencyKey = req.get("Idempotency-Key");

        if (!idempotencyKey) {
            return res.status(400).json({
                message: "Idempotency-Key header is required"
            });
        }

        if (idempotencyKey.length > 255) {
            return res.status(400).json({
                message: "Idempotency-Key must not exceed 255 characters"
            });
        }


       
        // 2. VALIDATE REQUIRED FIELDS
       

        if (!fromUser || !toUser || amount === undefined) {
            return res.status(400).json({
                message: "fromUser, toUser and amount are required"
            });
        }


       
        // 3. VALIDATE USERS ARE DIFFERENT
       

        if (fromUser === toUser) {
            return res.status(400).json({
                message: "fromUser and toUser must be different"
            });
        }


       
        // 4. VALIDATE AMOUNT
       

        let settlementAmount;

        try {
            settlementAmount = BigInt(amount);
        } catch (error) {
            return res.status(400).json({
                message: "Amount must be a valid integer in paise"
            });
        }

        if (settlementAmount <= 0n) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }


       
        // 5. CREATE CANONICAL REQUEST HASH
       

        const requestData = JSON.stringify({
            fromUser,
            toUser,
            amount: settlementAmount.toString()
        });

        const requestHash = crypto
            .createHash("sha256")
            .update(requestData)
            .digest("hex");


       
        // 6. START DATABASE TRANSACTION
       

        await client.query("BEGIN");

        transactionStarted = true;


       
        // 7. ACQUIRE GROUP-LEVEL ADVISORY LOCK
       

        await client.query(
            `SELECT pg_advisory_xact_lock(
                hashtext($1::text)
             )`,
            [groupId]
        );


       
        // 8. CHECK IDEMPOTENCY KEY
       

        const idempotencyResult = await client.query(
            `SELECT
                request_hash,
                response_status,
                response_body
             FROM idempotency_keys
             WHERE user_id = $1
             AND group_id = $2
             AND idempotency_key = $3`,
            [
                userId,
                groupId,
                idempotencyKey
            ]
        );


        if (idempotencyResult.rows.length > 0) {

            const existingRequest =
                idempotencyResult.rows[0];


            // Same key but different request
            if (
                existingRequest.request_hash !==
                requestHash
            ) {

                await client.query("ROLLBACK");
                transactionStarted = false;

                return res.status(409).json({
                    message:
                        "Idempotency-Key has already been used for a different request"
                });
            }


            // Same key + same request
            // Return the original response
            await client.query("COMMIT");
            transactionStarted = false;

            return res
                .status(existingRequest.response_status)
                .json(existingRequest.response_body);
        }


       
        // 9. CHECK REQUESTER IS GROUP MEMBER
       

        const memberCheck = await client.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1
             AND user_id = $2`,
            [
                groupId,
                userId
            ]
        );

        if (memberCheck.rows.length === 0) {

            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }


       
        // 10. CHECK BOTH USERS ARE GROUP MEMBERS
       

        const usersResult = await client.query(
            `SELECT user_id
             FROM group_members
             WHERE group_id = $1
             AND (user_id = $2 OR user_id = $3)`,
            [
                groupId,
                fromUser,
                toUser
            ]
        );

        if (usersResult.rows.length !== 2) {

            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "Both users must be members of the group"
            });
        }


       
        // 11. FETCH GROUP EXPENSES
       

        const expenseResult = await client.query(
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


       
        // 12. CALCULATE EXPENSE BALANCES
       

        const balances = calculateBalances(
            expenseResult.rows
        );


       
        // 13. FIND FROM/TO USER BALANCES
       

        const fromBalance = balances.find(
            balance => balance.user_id === fromUser
        );

        const toBalance = balances.find(
            balance => balance.user_id === toUser
        );

        const fromAmount = fromBalance
            ? BigInt(fromBalance.balance)
            : 0n;

        const toAmount = toBalance
            ? BigInt(toBalance.balance)
            : 0n;


       
        // 14. VALIDATE SETTLEMENT DIRECTION
       

        if (fromAmount >= 0n || toAmount <= 0n) {

            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message: "Invalid settlement direction"
            });
        }


       
        // 15. FETCH PREVIOUS SETTLEMENTS
       

        const previousSettlementResult = await client.query(
            `SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN from_user = $2
                            AND to_user = $3
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS paid_amount,

                COALESCE(
                    SUM(
                        CASE
                            WHEN from_user = $3
                            AND to_user = $2
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS reverse_amount

             FROM settlements
             WHERE group_id = $1
             AND (
                    (from_user = $2 AND to_user = $3)
                 OR (from_user = $3 AND to_user = $2)
             )`,
            [
                groupId,
                fromUser,
                toUser
            ]
        );


        const previousSettlements =
            previousSettlementResult.rows[0];

        const previousPaidAmount =
            BigInt(previousSettlements.paid_amount);

        const previousReverseAmount =
            BigInt(previousSettlements.reverse_amount);


       
        // 16. CALCULATE NET PREVIOUS SETTLEMENT
       

        const netPreviousSettlement =
            previousPaidAmount -
            previousReverseAmount;


       
        // 17. CALCULATE OUTSTANDING DEBT
       

        const originalDebt = -fromAmount;

        const outstandingDebt =
            originalDebt -
            netPreviousSettlement;


       
        // 18. VALIDATE OUTSTANDING DEBT
       

        if (outstandingDebt <= 0n) {

            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message:
                    "No outstanding debt exists between these users"
            });
        }

        if (settlementAmount > outstandingDebt) {

            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(400).json({
                message:
                    "Settlement amount exceeds outstanding debt"
            });
        }


       
        // 19. RECORD SETTLEMENT
       

        const settlementResult = await client.query(
            `INSERT INTO settlements (
                group_id,
                from_user,
                to_user,
                amount
             )
             VALUES ($1, $2, $3, $4)
             RETURNING
                id,
                group_id,
                from_user,
                to_user,
                amount,
                created_at`,
            [
                groupId,
                fromUser,
                toUser,
                settlementAmount.toString()
            ]
        );


        const settlement =
            settlementResult.rows[0];


       
        // 20. CREATE AUDIT LOG
       

        await createAuditLog(client, {
            userId: userId,
            action: "SETTLEMENT_RECORDED",
            entityType: "settlement",
            entityId: settlement.id,
            metadata: {
                groupId,
                fromUser,
                toUser,
                amount: settlementAmount.toString()
            }
        });


       
        // 21. PREPARE RESPONSE
       

        const responseBody = {
            message: "Settlement recorded successfully",
            settlement
        };


       
        // 22. STORE IDEMPOTENCY RESULT
       

        await client.query(
            `INSERT INTO idempotency_keys (
                user_id,
                group_id,
                idempotency_key,
                request_hash,
                response_status,
                response_body
             )
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            [
                userId,
                groupId,
                idempotencyKey,
                requestHash,
                201,
                JSON.stringify(responseBody)
            ]
        );


       
        // 23. COMMIT TRANSACTION
       

        await client.query("COMMIT");

        transactionStarted = false;


       
        // 24. RETURN RESULT
       

        return res.status(201).json(responseBody);

    } catch (error) {

       
        // ROLLBACK IF TRANSACTION STARTED
       

        if (transactionStarted) {

            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError
                );
            }
        }


        console.error(
            "Record settlement error:",
            error
        );


        return res.status(500).json({
            message: error.message || "Internal server error"
        });

    } finally {

        client.release();
    }
};

module.exports = {
    getSuggestedSettlements,
    recordSettlement
};