const express = require("express");
const validateForm = require("../controllers/validateForm");
const { limiter } = require("../controllers/rateLimiter");
const router = express.Router();
const {
  handlelogin,
  handlepost,
  registrationAttempt,
} = require("../controllers/authController");

router
  .route("/login")
  .get(handlelogin)
  .post(limiter(60, 10), validateForm, handlepost);
router.post("/register", limiter(60, 4), validateForm, registrationAttempt);
module.exports = router;
