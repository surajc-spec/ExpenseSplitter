const authController = require("../controllers/auth.controller");

const express = require("express");
const router = express.Router();


router.get("/test", (req, res) => {
    res.json({
        message: "Auth route is working"
    });
});

router.post("/register", authController.register);

module.exports = router;