const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/auth.middleware");

const express = require("express");
const router = express.Router();


router.get("/test", (req, res) => {
    res.json({
        message: "Auth route is working"
    });
});

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticate, authController.me);

module.exports = router;