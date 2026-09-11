const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");

const express = require("express");
const router = express.Router();
const {
    loginRateLimiter,
    registerRateLimiter
}  = require("../middleware/rateLimit.middleware");

router.get("/test", (req, res) => {
    res.json({
        message: "Auth route is working"
    });
});


router.post("/register",registerRateLimiter, authController.register);
router.post("/login",loginRateLimiter, authController.login);
router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.me);

module.exports = router;