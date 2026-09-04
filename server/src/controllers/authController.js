const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");

// ==============================
// REGISTER USER
// ==============================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// ==============================
// LOGIN USER
// ==============================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ==============================
// GET CURRENT USER
// ==============================
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -emailChangeOtp"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        googleAvatar:
          user.googleAvatar || "",
      },
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to get current user",
    });
  }
};

// ==============================
// FORGOT PASSWORD
// ==============================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Don't reveal whether an account exists.
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      });
    }

    // Generate cryptographically secure raw token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only hashed token in MongoDB.
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;

    // Token expires after 15 minutes.
    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    // Create reset link using the RAW token.
    if (!process.env.FRONTEND_URL) {
  throw new Error(
    "FRONTEND_URL is not configured"
  );
}

const resetUrl =
  `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send reset email.
    await sendPasswordResetEmail(user.email, resetUrl);

    console.log("Password reset email sent to:", user.email);

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ==============================
// RESET PASSWORD
// ==============================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Hash token received from reset URL.
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid, non-expired token.
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password.
    const salt = await bcrypt.genSalt(12);

    user.password = await bcrypt.hash(password, salt);

    // Immediately invalidate reset token.
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// ==============================
// UPDATE PROFILE
// ==============================
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be at least 2 characters",
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        message:
          "Name cannot exceed 50 characters",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.name = trimmedName;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        googleAvatar:
          user.googleAvatar || "",
      },
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update profile",
    });
  }
};


// ==============================
// SEND EMAIL CHANGE OTP
// ==============================
const sendEmailChangeOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required",
      });
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (normalizedEmail === user.email) {
      return res.status(400).json({
        success: false,
        message: "New email must be different from your current email",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store only hashed OTP
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.emailChangeOtp = hashedOtp;
    user.emailChangeOtpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );
    user.pendingEmail = normalizedEmail;

    await user.save();

    // Temporary development logging.
    // Remove this before production.
    console.log(
      `Email change OTP for ${normalizedEmail}: ${otp}`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send email change OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP",
    });
  }
};


// ==============================
// VERIFY EMAIL CHANGE OTP
// ==============================
const verifyEmailChangeOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      !user.emailChangeOtp ||
      !user.emailChangeOtpExpires ||
      !user.pendingEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "No email change request found",
      });
    }

    if (user.emailChangeOtpExpires < new Date()) {
      user.emailChangeOtp = null;
      user.emailChangeOtpExpires = null;
      user.pendingEmail = null;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    if (hashedOtp !== user.emailChangeOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const existingUser = await User.findOne({
      email: user.pendingEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    user.email = user.pendingEmail;

    user.emailChangeOtp = null;
    user.emailChangeOtpExpires = null;
    user.pendingEmail = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Verify email OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP",
    });
  }
};


// ==============================
// CHANGE PASSWORD
// ==============================
const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Google users may not have a local password
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Password change is not available for Google accounts",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};


// ==============================
// DELETE ACCOUNT
// ==============================
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Local account
    if (user.password) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password",
        });
      }
    }

    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete account",
    });
  }
};

//Upadte Profile photo

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile picture",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const avatarUrl =
      `/uploads/avatars/${req.file.filename}`;

    user.avatar = avatarUrl;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Profile picture updated successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        googleAvatar:
          user.googleAvatar || "",
      },
    });
  } catch (error) {
    console.error(
      "Profile photo update error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update profile picture",
    });
  }
};

//Google profile

const useGoogleProfilePhoto = async (
  req,
  res
) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.googleAvatar) {
      return res.status(400).json({
        success: false,
        message:
          "No Google profile picture is available for this account",
      });
    }

    user.avatar = user.googleAvatar;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Google profile picture applied successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        googleAvatar:
          user.googleAvatar,
      },
    });
  } catch (error) {
    console.error(
      "Google profile photo error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to use Google profile picture",
    });
  }
};

// ==============================
// EXPORTS
// ==============================
module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updateProfile,
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
  changePassword,
  deleteAccount,
  updateProfilePhoto,
  useGoogleProfilePhoto,
};