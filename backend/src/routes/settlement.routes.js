const express = require("express");

const settlementController = require("../controllers/settlement.controller");
const authenticate = require("../middleware/auth.middleware");
const {
    settlementRateLimiter
} = require("../middleware/rateLimit.middleware");
const router = express.Router();

router.get(
    "/:groupId/settlements/suggested",
    authenticate,
    settlementController.getSuggestedSettlements
);

router.post(
    "/:groupId/settlements",
    authenticate,
    settlementRateLimiter,
    settlementController.recordSettlement
);
module.exports = router;