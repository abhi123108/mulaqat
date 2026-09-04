import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email: email.trim() }
      );

      setMessage(
        response.data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );

      setEmail("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlow}></div>

      <div style={styles.container}>
        {/* LEFT BRANDING */}
        <div style={styles.brandSection}>
          <img
            src="/mulaqat-logo-horizontal.png"
            alt="Mulaqat"
            style={styles.logo}
          />

          <div style={styles.brandContent}>
            <div style={styles.badge}>ACCOUNT RECOVERY</div>

            <h1 style={styles.brandTitle}>
              Get back to
              <br />
              <span style={styles.gradientText}>your account.</span>
            </h1>

            <p style={styles.brandDescription}>
              Forgot your password? No worries. Enter your registered
              email address and we'll help you securely reset it.
            </p>

            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <div style={styles.iconCircle}>✉</div>
                <div>
                  <strong style={styles.infoTitle}>
                    Check your inbox
                  </strong>
                  <p style={styles.infoText}>
                    We'll send a secure password reset link.
                  </p>
                </div>
              </div>

              <div style={styles.infoItem}>
                <div style={styles.iconCircle}>🔐</div>
                <div>
                  <strong style={styles.infoTitle}>
                    Secure recovery
                  </strong>
                  <p style={styles.infoText}>
                    Your account remains protected throughout the process.
                  </p>
                </div>
              </div>

              <div style={styles.infoItem}>
                <div style={styles.iconCircle}>✓</div>
                <div>
                  <strong style={styles.infoTitle}>
                    Quick & simple
                  </strong>
                  <p style={styles.infoText}>
                    Reset your password in just a few steps.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.brandFooter}>
            <span>Secure authentication</span>
            <span style={styles.dot}>•</span>
            <span>Mulaqat</span>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div style={styles.formSection}>
          <div style={styles.formCard}>
            <div style={styles.iconContainer}>
              <span>✉</span>
            </div>

            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Forgot your password?</h2>

              <p style={styles.formSubtitle}>
                Enter the email associated with your Mulaqat account.
              </p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span style={styles.alertIcon}>!</span>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div style={styles.successBox}>
                <span style={styles.successIcon}>✓</span>
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>

                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✉</span>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                    style={styles.input}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span>
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <span style={styles.arrow}>→</span>
                  </>
                )}
              </button>
            </form>

            <div style={styles.loginLinkContainer}>
              <span style={styles.loginText}>
                Remember your password?
              </span>

              <button
                type="button"
                onClick={() => navigate("/login")}
                style={styles.loginLink}
                disabled={loading}
              >
                Back to login
              </button>
            </div>

            <div style={styles.secureNote}>
              <span>🛡️</span>
              <span>Your account security is our priority</span>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          input:focus {
            outline: none;
          }

          input::placeholder {
            color: #64748b;
          }

          button {
            font-family: inherit;
          }

          @media (max-width: 800px) {
            .forgot-container {
              grid-template-columns: 1fr !important;
            }

            .forgot-brand {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg, #070b14 0%, #0b1120 50%, #080d18 100%)",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  backgroundGlow: {
    position: "absolute",
    width: "650px",
    height: "650px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 70%)",
    top: "-280px",
    left: "-220px",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    minHeight: "650px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "rgba(15, 23, 42, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "28px",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(20px)",
    position: "relative",
    zIndex: 1,
  },

  brandSection: {
    padding: "48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(10,15,27,0.8))",
    borderRight: "1px solid rgba(148, 163, 184, 0.1)",
  },

  logo: {
    width: "155px",
    height: "auto",
    objectFit: "contain",
  },

  brandContent: {
    maxWidth: "430px",
  },

  badge: {
    display: "inline-flex",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    color: "#60a5fa",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    marginBottom: "22px",
  },

  brandTitle: {
    fontSize: "48px",
    lineHeight: "1.08",
    letterSpacing: "-1.8px",
    margin: "0 0 20px",
    fontWeight: "750",
  },

  gradientText: {
    background:
      "linear-gradient(90deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  brandDescription: {
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: "1.7",
    maxWidth: "390px",
    margin: 0,
  },

  infoList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    marginTop: "32px",
  },

  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  iconCircle: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    borderRadius: "11px",
    background: "rgba(59, 130, 246, 0.09)",
    border: "1px solid rgba(96, 165, 250, 0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#60a5fa",
    fontSize: "15px",
  },

  infoTitle: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "13px",
    marginBottom: "3px",
  },

  infoText: {
    margin: 0,
    color: "#64748b",
    fontSize: "11px",
  },

  brandFooter: {
    color: "#475569",
    fontSize: "12px",
    display: "flex",
    gap: "8px",
  },

  dot: {
    color: "#334155",
  },

  formSection: {
    padding: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(7, 12, 22, 0.55)",
  },

  formCard: {
    width: "100%",
    maxWidth: "430px",
  },

  iconContainer: {
    width: "52px",
    height: "52px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(96, 165, 250, 0.18)",
    color: "#60a5fa",
    fontSize: "22px",
    marginBottom: "22px",
  },

  formHeader: {
    marginBottom: "28px",
  },

  formTitle: {
    margin: "0 0 8px",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.7px",
  },

  formSubtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "rgba(248, 113, 113, 0.08)",
    border: "1px solid rgba(248, 113, 113, 0.18)",
    color: "#fca5a5",
    fontSize: "13px",
  },

  alertIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(248, 113, 113, 0.15)",
    color: "#f87171",
    fontWeight: "700",
    flexShrink: 0,
  },

  successBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    marginBottom: "20px",
    borderRadius: "12px",
    background: "rgba(52, 211, 153, 0.08)",
    border: "1px solid rgba(52, 211, 153, 0.18)",
    color: "#6ee7b7",
    fontSize: "13px",
  },

  successIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(52, 211, 153, 0.15)",
    color: "#34d399",
    fontWeight: "700",
    flexShrink: 0,
  },

  inputGroup: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "9px",
  },

  inputWrapper: {
    height: "52px",
    display: "flex",
    alignItems: "center",
    borderRadius: "12px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(100, 116, 139, 0.22)",
  },

  inputIcon: {
    marginLeft: "15px",
    fontSize: "15px",
    opacity: 0.6,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    border: "none",
    background: "transparent",
    color: "#f8fafc",
    padding: "0 15px",
    fontSize: "14px",
  },

  submitButton: {
    width: "100%",
    height: "52px",
    border: "none",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 10px 25px rgba(59, 130, 246, 0.18)",
  },

  arrow: {
    fontSize: "18px",
  },

  spinner: {
    width: "17px",
    height: "17px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  loginLinkContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    marginTop: "24px",
    fontSize: "13px",
  },

  loginText: {
    color: "#64748b",
  },

  loginLink: {
    border: "none",
    background: "transparent",
    color: "#60a5fa",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },

  secureNote: {
    marginTop: "26px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(100, 116, 139, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#475569",
    fontSize: "11px",
  },
};

export default ForgotPassword;