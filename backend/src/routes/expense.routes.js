const express = require("express");
const expenseController = require("../controllers/expense.controller");
const authenticate = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/:groupId/expenses",
    authenticate,
    expenseController.createExpense
);

router.get(
    "/:groupId/expenses",
    authenticate,
    expenseController.getGroupExpenses
);

router.get(
    "/:groupId/balances",
    authenticate,
    expenseController.getGroupBalances
);
module.exports = router;