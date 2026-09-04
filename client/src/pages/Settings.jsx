import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // PROFILE
  // =========================

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [googleAvatar, setGoogleAvatar] = useState("");

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [googlePhotoLoading, setGooglePhotoLoading] =
    useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // =========================
  // EMAIL
  // =========================

  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // =========================
  // PASSWORD
  // =========================

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] =
    useState(false);

  // =========================
  // DELETE ACCOUNT
  // =========================

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // =========================
  // LOAD USER
  // =========================

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("/auth/me");

        const currentUser = response.data.user;

        setUser(currentUser);

        setName(currentUser.name || "");
        setAvatar(currentUser.avatar || "");
        setGoogleAvatar(currentUser.googleAvatar || "");

        // Keep localStorage synchronized
        localStorage.setItem(
          "mulaqat_user",
          JSON.stringify(currentUser)
        );
      } catch (error) {
        console.error("Settings user error:", error);

        localStorage.removeItem("mulaqat_token");
        localStorage.removeItem("mulaqat_user");

        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  // =========================
  // UPDATE LOCAL USER
  // =========================

  const updateStoredUser = (updatedUser) => {
    localStorage.setItem(
      "mulaqat_user",
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);
  };

  // =========================
  // PROFILE PHOTO SELECT
  // =========================

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setProfileError("");
    setProfileMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setProfileError(
        "Only JPG, PNG and WEBP images are allowed."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError(
        "Profile picture must be smaller than 5 MB."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedPhoto(file);

    const previewUrl = URL.createObjectURL(file);

    setPhotoPreview(previewUrl);
  };

  // =========================
  // CLEAN PHOTO PREVIEW
  // =========================

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // =========================
  // UPLOAD PROFILE PHOTO
  // =========================

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) {
      setProfileError(
        "Please select a profile picture first."
      );

      return;
    }

    try {
      setPhotoLoading(true);
      setProfileError("");
      setProfileMessage("");

      const formData = new FormData();

      formData.append("avatar", selectedPhoto);

      const response = await api.patch(
        "/auth/profile/photo",
        formData
      );

      const updatedUser = response.data.user;

      updateStoredUser(updatedUser);

      setAvatar(updatedUser.avatar || "");
      setGoogleAvatar(updatedUser.googleAvatar || "");

      setSelectedPhoto(null);
      setPhotoPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setProfileMessage(
        response.data.message ||
          "Profile picture updated successfully."
      );
    } catch (error) {
      console.error("Photo upload error:", error);

      setProfileError(
        error.response?.data?.message ||
          "Unable to upload profile picture."
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  // =========================
  // USE GOOGLE PROFILE PHOTO
  // =========================

  const handleUseGooglePhoto = async () => {
    try {
      setGooglePhotoLoading(true);
      setProfileError("");
      setProfileMessage("");

      const response = await api.post(
        "/auth/profile/use-google-photo"
      );

      const updatedUser = response.data.user;

      updateStoredUser(updatedUser);

      setAvatar(updatedUser.avatar || "");
      setGoogleAvatar(
        updatedUser.googleAvatar || ""
      );

      setSelectedPhoto(null);
      setPhotoPreview("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setProfileMessage(
        response.data.message ||
          "Google profile picture applied successfully."
      );
    } catch (error) {
      console.error(
        "Google profile photo error:",
        error
      );

      setProfileError(
        error.response?.data?.message ||
          "Unable to use Google profile picture."
      );
    } finally {
      setGooglePhotoLoading(false);
    }
  };

  // =========================
  // UPDATE NAME
  // =========================

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    setProfileMessage("");
    setProfileError("");

    if (!name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    if (name.trim().length < 2) {
      setProfileError(
        "Name must be at least 2 characters."
      );
      return;
    }

    if (name.trim().length > 50) {
      setProfileError(
        "Name cannot exceed 50 characters."
      );
      return;
    }

    try {
      setProfileLoading(true);

      const response = await api.patch(
        "/auth/profile",
        {
          name: name.trim(),
        }
      );

      const updatedUser = response.data.user;

      updateStoredUser(updatedUser);

      setName(updatedUser.name || "");
      setAvatar(updatedUser.avatar || "");
      setGoogleAvatar(
        updatedUser.googleAvatar || ""
      );

      setProfileMessage(
        response.data.message ||
          "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      setProfileError(
        error.response?.data?.message ||
          "Unable to update profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // =========================
  // SEND EMAIL OTP
  // =========================

  const handleSendOtp = async (e) => {
    e.preventDefault();

    setEmailMessage("");
    setEmailError("");

    if (!newEmail.trim()) {
      setEmailError(
        "Please enter your new email."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        newEmail.trim()
      )
    ) {
      setEmailError(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      newEmail.trim().toLowerCase() ===
      user?.email?.toLowerCase()
    ) {
      setEmailError(
        "New email must be different from your current email."
      );
      return;
    }

    try {
      setEmailLoading(true);

      const response = await api.post(
        "/auth/change-email/send-otp",
        {
          newEmail: newEmail.trim(),
        }
      );

      setOtpSent(true);

      setEmailMessage(
        response.data.message ||
          "OTP sent successfully."
      );
    } catch (error) {
      console.error("Send OTP error:", error);

      setEmailError(
        error.response?.data?.message ||
          "Unable to send OTP."
      );
    } finally {
      setEmailLoading(false);
    }
  };

  // =========================
  // VERIFY EMAIL OTP
  // =========================

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setEmailMessage("");
    setEmailError("");

    if (!otp.trim()) {
      setEmailError(
        "Please enter the OTP."
      );
      return;
    }

    if (otp.trim().length !== 6) {
      setEmailError(
        "OTP must contain 6 digits."
      );
      return;
    }

    try {
      setEmailLoading(true);

      const response = await api.post(
        "/auth/change-email/verify-otp",
        {
          otp: otp.trim(),
        }
      );

      const updatedUser = response.data.user;

      updateStoredUser(updatedUser);

      setNewEmail("");
      setOtp("");
      setOtpSent(false);

      setEmailMessage(
        response.data.message ||
          "Email updated successfully."
      );
    } catch (error) {
      console.error(
        "Verify OTP error:",
        error
      );

      setEmailError(
        error.response?.data?.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setEmailLoading(false);
    }
  };

  // =========================
  // CHANGE PASSWORD
  // =========================

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        "Please fill all password fields."
      );

      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "New password must be at least 6 characters."
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New passwords do not match."
      );

      return;
    }

    try {
      setPasswordLoading(true);

      const response = await api.post(
        "/auth/change-password",
        {
          currentPassword,
          newPassword,
          confirmPassword,
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        response.data.message ||
          "Password updated successfully."
      );
    } catch (error) {
      console.error(
        "Password change error:",
        error
      );

      setPasswordError(
        error.response?.data?.message ||
          "Unable to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // =========================
  // DELETE ACCOUNT
  // =========================

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    setDeleteError("");

    if (deleteConfirm !== "DELETE") {
      setDeleteError(
        'Type "DELETE" to confirm account deletion.'
      );

      return;
    }

    const confirmed = window.confirm(
      "This action is permanent. Are you sure you want to delete your account?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(true);

      await api.delete(
        "/auth/delete-account",
        {
          data: {
            password: deletePassword,
          },
        }
      );

      localStorage.removeItem("mulaqat_token");
      localStorage.removeItem("mulaqat_user");

      navigate("/login");
    } catch (error) {
      console.error(
        "Delete account error:",
        error
      );

      setDeleteError(
        error.response?.data?.message ||
          "Unable to delete account."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner}></div>

        <p style={styles.loadingText}>
          Loading settings...
        </p>
      </div>
    );
  }

  // =========================
  // AVATAR URL
  // =========================

  const displayAvatar = avatar
    ? avatar.startsWith("http")
      ? avatar
      : `${import.meta.env.VITE_BACKEND_URL}${avatar}`
    : "";

  // =========================
  // FINAL AVATAR
  // =========================

  const currentPhoto =
    photoPreview || displayAvatar;

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlow}></div>

      {/* ================= HEADER ================= */}

      <header style={styles.header}>
        <div
          style={styles.logoArea}
          onClick={() => navigate("/")}
        >
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
            style={styles.logo}
          />
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          style={styles.backButton}
        >
          ← Back to Home
        </button>
      </header>

      <main style={styles.container}>
        {/* ================= HEADING ================= */}

        <div style={styles.headingBlock}>
          <div style={styles.eyebrow}>
            ACCOUNT SETTINGS
          </div>

          <h1 style={styles.title}>
            Settings
          </h1>

          <p style={styles.subtitle}>
            Manage your profile, account security and
            preferences.
          </p>
        </div>

        {/* ================= PROFILE ================= */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Profile
              </h2>

              <p style={styles.cardSubtitle}>
                Update your personal information.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate}>
            {/* PROFILE PHOTO */}

            <div style={styles.profileTop}>
              <div style={styles.avatarWrapper}>
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt="Profile"
                    style={styles.avatar}
                  />
                ) : (
                  <div
                    style={styles.avatarFallback}
                  >
                    {user?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div style={styles.avatarInfo}>
                <h3 style={styles.avatarTitle}>
                  Profile photo
                </h3>

                <p style={styles.avatarText}>
                  Upload a JPG, PNG or WEBP image up to
                  5 MB.
                </p>

                {/* HIDDEN FILE INPUT */}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  style={{
                    display: "none",
                  }}
                />

                <div style={styles.photoActions}>
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    style={styles.secondaryButton}
                  >
                    Choose Photo
                  </button>

                  {selectedPhoto && (
                    <button
                      type="button"
                      onClick={handlePhotoUpload}
                      disabled={photoLoading}
                      style={styles.primaryButton}
                    >
                      {photoLoading
                        ? "Uploading..."
                        : "Upload Photo"}
                    </button>
                  )}

                  {googleAvatar && (
                    <button
                      type="button"
                      onClick={handleUseGooglePhoto}
                      disabled={googlePhotoLoading}
                      style={styles.secondaryButton}
                    >
                      {googlePhotoLoading
                        ? "Applying..."
                        : "Use Google Photo"}
                    </button>
                  )}
                </div>

                {selectedPhoto && (
                  <div style={styles.selectedPhotoText}>
                    Selected:{" "}
                    <strong>
                      {selectedPhoto.name}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* NAME */}

            <div style={styles.field}>
              <label style={styles.label}>
                Full name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Your full name"
                style={styles.input}
                maxLength={50}
              />
            </div>

            {/* EMAIL */}

            <div style={styles.field}>
              <label style={styles.label}>
                Current email
              </label>

              <input
                type="email"
                value={user?.email || ""}
                disabled
                style={{
                  ...styles.input,
                  ...styles.disabledInput,
                }}
              />
            </div>

            {/* PROFILE MESSAGE */}

            {profileError && (
              <div style={styles.errorBox}>
                {profileError}
              </div>
            )}

            {profileMessage && (
              <div style={styles.successBox}>
                {profileMessage}
              </div>
            )}

            {/* SAVE NAME */}

            <button
              type="submit"
              disabled={profileLoading}
              style={styles.primaryButton}
            >
              {profileLoading
                ? "Saving..."
                : "Save Profile"}
            </button>
          </form>
        </section>

        {/* ================= EMAIL ================= */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Change Email
              </h2>

              <p style={styles.cardSubtitle}>
                Your new email will be verified using an
                OTP.
              </p>
            </div>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp}>
              <div style={styles.field}>
                <label style={styles.label}>
                  New email address
                </label>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) =>
                    setNewEmail(e.target.value)
                  }
                  placeholder="newemail@example.com"
                  style={styles.input}
                />
              </div>

              {emailError && (
                <div style={styles.errorBox}>
                  {emailError}
                </div>
              )}

              {emailMessage && (
                <div style={styles.successBox}>
                  {emailMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                style={styles.primaryButton}
              >
                {emailLoading
                  ? "Sending OTP..."
                  : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={styles.otpNotice}>
                OTP has been sent for{" "}
                <strong>{newEmail}</strong>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Verification OTP
                </label>

                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  inputMode="numeric"
                  style={{
                    ...styles.input,
                    letterSpacing: "5px",
                    textAlign: "center",
                  }}
                />
              </div>

              {emailError && (
                <div style={styles.errorBox}>
                  {emailError}
                </div>
              )}

              {emailMessage && (
                <div style={styles.successBox}>
                  {emailMessage}
                </div>
              )}

              <div style={styles.buttonRow}>
                <button
                  type="submit"
                  disabled={emailLoading}
                  style={styles.primaryButton}
                >
                  {emailLoading
                    ? "Verifying..."
                    : "Verify & Update Email"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setEmailError("");
                    setEmailMessage("");
                  }}
                  style={styles.secondaryButton}
                >
                  Change Email
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ================= PASSWORD ================= */}

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>
                Change Password
              </h2>

              <p style={styles.cardSubtitle}>
                Verify your current password before
                setting a new one.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={styles.field}>
              <label style={styles.label}>
                Current password
              </label>

              <input
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                placeholder="Enter current password"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                New password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Enter new password"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Confirm new password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                style={styles.input}
              />
            </div>

            {passwordError && (
              <div style={styles.errorBox}>
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div style={styles.successBox}>
                {passwordMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              style={styles.primaryButton}
            >
              {passwordLoading
                ? "Updating..."
                : "Update Password"}
            </button>
          </form>
        </section>

        {/* ================= DANGER ZONE ================= */}

        <section
          style={{
            ...styles.card,
            ...styles.dangerCard,
          }}
        >
          <div style={styles.cardHeader}>
            <div>
              <h2
                style={{
                  ...styles.cardTitle,
                  color: "#ff6b6b",
                }}
              >
                Danger Zone
              </h2>

              <p style={styles.cardSubtitle}>
                Permanently delete your Mulaqat account.
              </p>
            </div>
          </div>

          <div style={styles.warningBox}>
            <strong>
              This action cannot be undone.
            </strong>
            <br />
            Your account will be permanently deleted.
          </div>

          <form onSubmit={handleDeleteAccount}>
            <div style={styles.field}>
              <label style={styles.label}>
                Current password
              </label>

              <input
                type="password"
                value={deletePassword}
                onChange={(e) =>
                  setDeletePassword(e.target.value)
                }
                placeholder="Enter your password"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Type DELETE to confirm
              </label>

              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) =>
                  setDeleteConfirm(e.target.value)
                }
                placeholder="DELETE"
                style={styles.input}
              />
            </div>

            {deleteError && (
              <div style={styles.errorBox}>
                {deleteError}
              </div>
            )}

            <button
              type="submit"
              disabled={deleteLoading}
              style={styles.deleteButton}
            >
              {deleteLoading
                ? "Deleting Account..."
                : "Delete Account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top right, rgba(45, 212, 191, 0.08), transparent 30%), #070b14",
    color: "#f8fafc",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  backgroundGlow: {
    position: "fixed",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "rgba(45, 212, 191, 0.045)",
    filter: "blur(100px)",
    top: "-200px",
    right: "-150px",
    pointerEvents: "none",
  },

  header: {
    height: "76px",
    padding: "0 6%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom:
      "1px solid rgba(255,255,255,0.07)",
    background: "rgba(7,11,20,0.85)",
    backdropFilter: "blur(16px)",
    position: "relative",
    zIndex: 2,
  },

  logoArea: {
    cursor: "pointer",
  },

  logo: {
    width: "145px",
    height: "auto",
    display: "block",
  },

  backButton: {
    background: "transparent",
    border:
      "1px solid rgba(255,255,255,0.12)",
    color: "#cbd5e1",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
  },

  container: {
    width: "min(900px, 92%)",
    margin: "0 auto",
    padding: "60px 0 100px",
    position: "relative",
    zIndex: 1,
  },

  headingBlock: {
    marginBottom: "34px",
  },

  eyebrow: {
    color: "#2dd4bf",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "2px",
    marginBottom: "10px",
  },

  title: {
    fontSize: "42px",
    lineHeight: "1.1",
    margin: "0 0 12px",
    fontWeight: "750",
    letterSpacing: "-1px",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: "16px",
    margin: 0,
  },

  card: {
    background:
      "linear-gradient(145deg, rgba(18,25,39,0.96), rgba(10,15,27,0.96))",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "28px",
    marginBottom: "20px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.18)",
  },

  dangerCard: {
    border:
      "1px solid rgba(255,107,107,0.20)",
  },

  cardHeader: {
    marginBottom: "24px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
  },

  cardSubtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  profileTop: {
    display: "flex",
    gap: "20px",
    alignItems: "center",
    marginBottom: "28px",
  },

  avatarWrapper: {
    flexShrink: 0,
  },

  avatar: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    objectFit: "cover",
    border:
      "2px solid rgba(45,212,191,0.4)",
  },

  avatarFallback: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #1e293b, #0f172a)",
    border:
      "2px solid rgba(45,212,191,0.35)",
    color: "#2dd4bf",
    fontSize: "30px",
    fontWeight: "700",
  },

  avatarInfo: {
    flex: 1,
    minWidth: 0,
  },

  avatarTitle: {
    margin: "0 0 5px",
    fontSize: "15px",
  },

  avatarText: {
    margin: "0 0 12px",
    color: "#64748b",
    fontSize: "13px",
  },

  photoActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },

  selectedPhotoText: {
    marginTop: "10px",
    color: "#94a3b8",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0b1220",
    border:
      "1px solid rgba(255,255,255,0.10)",
    borderRadius: "10px",
    color: "#f8fafc",
    padding: "13px 14px",
    fontSize: "14px",
    outline: "none",
  },

  disabledInput: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  primaryButton: {
    border: "none",
    borderRadius: "10px",
    background:
      "linear-gradient(135deg, #2dd4bf, #14b8a6)",
    color: "#031514",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  secondaryButton: {
    border:
      "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    background: "transparent",
    color: "#cbd5e1",
    padding: "12px 18px",
    fontSize: "14px",
    cursor: "pointer",
  },

  deleteButton: {
    border:
      "1px solid rgba(255,107,107,0.35)",
    borderRadius: "10px",
    background:
      "rgba(255,70,70,0.10)",
    color: "#ff7b7b",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  errorBox: {
    background:
      "rgba(239,68,68,0.08)",
    border:
      "1px solid rgba(239,68,68,0.18)",
    color: "#fca5a5",
    padding: "11px 13px",
    borderRadius: "9px",
    fontSize: "13px",
    marginBottom: "16px",
  },

  successBox: {
    background:
      "rgba(45,212,191,0.08)",
    border:
      "1px solid rgba(45,212,191,0.18)",
    color: "#5eead4",
    padding: "11px 13px",
    borderRadius: "9px",
    fontSize: "13px",
    marginBottom: "16px",
  },

  warningBox: {
    background:
      "rgba(245,158,11,0.07)",
    border:
      "1px solid rgba(245,158,11,0.15)",
    color: "#fbbf24",
    padding: "13px",
    borderRadius: "9px",
    fontSize: "13px",
    lineHeight: "1.6",
    marginBottom: "22px",
  },

  otpNotice: {
    background:
      "rgba(45,212,191,0.06)",
    border:
      "1px solid rgba(45,212,191,0.12)",
    color: "#94a3b8",
    padding: "12px 14px",
    borderRadius: "9px",
    fontSize: "13px",
    marginBottom: "20px",
  },

  loadingPage: {
    minHeight: "100vh",
    background: "#070b14",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
  },

  spinner: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    border:
      "3px solid rgba(255,255,255,0.10)",
    borderTop:
      "3px solid #2dd4bf",
    animation:
      "mulaqat-spin 0.8s linear infinite",
  },

  loadingText: {
    marginTop: "14px",
    fontSize: "14px",
  },
};

export default Settings;