const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("../config/passport");

const {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==============================
// LOCAL AUTHENTICATION
// ==============================

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", protect, getCurrentUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token", resetPassword);

// ==============================
// GOOGLE AUTHENTICATION
// ==============================

// Start Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      "http://localhost:5173/login?error=google_auth_failed",
  }),
  (req, res) => {
    try {
      const token = jwt.sign(
        {
          userId: req.user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      const user = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
      };

      const params = new URLSearchParams({
        token,
        user: JSON.stringify(user),
      });

      return res.redirect(
        `http://localhost:5173/auth/google/callback?${params.toString()}`
      );
    } catch (error) {
      console.error("Google JWT error:", error);

      return res.redirect(
        "http://localhost:5173/login?error=google_auth_failed"
      );
    }
  }
);

module.exports = router;