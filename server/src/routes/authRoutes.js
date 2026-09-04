const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("../config/passport");

const uploadAvatar = require("../middleware/uploadAvatar");

const {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,

  updateProfile,
  updateProfilePhoto,
  useGoogleProfilePhoto,

  sendEmailChangeOtp,
  verifyEmailChangeOtp,

  changePassword,

  deleteAccount,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// AUTH
// ========================================

router.post(
  "/register",
  registerUser
);

router.post(
  "/login",
  loginUser
);

router.get(
  "/me",
  protect,
  getCurrentUser
);

// ========================================
// PROFILE
// ========================================

router.patch(
  "/profile",
  protect,
  updateProfile
);

// Upload custom profile picture
router.patch(
  "/profile/photo",
  protect,
  uploadAvatar.single("avatar"),
  updateProfilePhoto
);

// Restore/use Google profile picture
router.post(
  "/profile/use-google-photo",
  protect,
  useGoogleProfilePhoto
);

// ========================================
// CHANGE EMAIL
// ========================================

router.post(
  "/change-email/send-otp",
  protect,
  sendEmailChangeOtp
);

router.post(
  "/change-email/verify-otp",
  protect,
  verifyEmailChangeOtp
);

// ========================================
// CHANGE PASSWORD
// ========================================

router.post(
  "/change-password",
  protect,
  changePassword
);

// ========================================
// DELETE ACCOUNT
// ========================================

router.delete(
  "/delete-account",
  protect,
  deleteAccount
);

// ========================================
// FORGOT PASSWORD
// ========================================

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password/:token",
  resetPassword
);

// ========================================
// GOOGLE AUTH
// ========================================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

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
        avatar: req.user.avatar || "",
        googleAvatar:
          req.user.googleAvatar || "",
      };

      const params = new URLSearchParams({
        token,
        user: JSON.stringify(user),
      });

      return res.redirect(
        `http://localhost:5173/auth/google/callback?${params.toString()}`
      );
    } catch (error) {
      console.error(
        "Google JWT error:",
        error
      );

      return res.redirect(
        "http://localhost:5173/login?error=google_auth_failed"
      );
    }
  }
);

module.exports = router;