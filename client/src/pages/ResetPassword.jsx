import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return 0;

    let strength = 0;

    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return Math.min(strength, 4);
  };

  const passwordStrength = getPasswordStrength();

  const strengthText = {
    0: "",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/reset-password/${token}`,
        { password }
      );

      setMessage(response.data.message || "Password reset successful.");

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-background">
        <div className="reset-glow reset-glow-one"></div>
        <div className="reset-glow reset-glow-two"></div>
      </div>

      <div className="reset-container">
        {/* Branding Section */}
        <div className="reset-brand">
          <div className="brand-content">
            <img
              src="/mulaqat-logo-horizontal.png"
              alt="Mulaqat"
              className="reset-logo"
            />

            <div className="brand-badge">
              <span className="badge-dot"></span>
              Secure account recovery
            </div>

            <h1>
              Create a new
              <span> password.</span>
            </h1>

            <p>
              Choose a strong password to secure your Mulaqat account and
              continue connecting with your team.
            </p>

            <div className="security-points">
              <div className="security-point">
                <div className="security-icon">✓</div>
                <div>
                  <strong>Secure your account</strong>
                  <span>Protect your personal information</span>
                </div>
              </div>

              <div className="security-point">
                <div className="security-icon">✓</div>
                <div>
                  <strong>Use a strong password</strong>
                  <span>Combine letters, numbers and symbols</span>
                </div>
              </div>

              <div className="security-point">
                <div className="security-icon">✓</div>
                <div>
                  <strong>You're almost there</strong>
                  <span>Set your password and sign in</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="reset-form-section">
          <div className="reset-card">
            <div className="reset-header">
              <div className="reset-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  <circle cx="12" cy="15.5" r="1" />
                  <path d="M12 16.5v2" />
                </svg>
              </div>

              <h2>Reset your password</h2>

              <p>
                Enter a new password below to secure your account.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* New Password */}
              <div className="field-group">
                <label htmlFor="password">New Password</label>

                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    disabled={loading}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.8 6a11.8 11.8 0 0 1-3.1 3.4" />
                        <path d="M6.1 6.1C4.3 7.2 3.2 8.8 2.2 10c1.3 2 4.8 6 9.8 6 1 0 2-.2 2.9-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>

                {password && (
                  <div className="strength-wrapper">
                    <div className="strength-bars">
                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={
                            bar <= passwordStrength
                              ? "strength-bar active"
                              : "strength-bar"
                          }
                        ></span>
                      ))}
                    </div>

                    <span
                      className={`strength-text strength-${passwordStrength}`}
                    >
                      {strengthText[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm Password</label>

                <div className="password-wrapper">
                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={loading}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    disabled={loading}
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.8 6a11.8 11.8 0 0 1-3.1 3.4" />
                        <path d="M6.1 6.1C4.3 7.2 3.2 8.8 2.2 10c1.3 2 4.8 6 9.8 6 1 0 2-.2 2.9-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2.2 12s3.5-6 9.8-6 9.8 6 9.8 6-3.5 6-9.8 6-9.8-6-9.8-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="form-message error-message">
                  <span className="message-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {message && (
                <div className="form-message success-message">
                  <span className="message-icon">✓</span>
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="reset-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="back-login">
              <button
                type="button"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                <span>←</span>
                Back to Login
              </button>
            </div>

            <div className="reset-security">
              <span className="lock-small">⌑</span>
              Your password is securely transmitted
            </div>
          </div>

          <p className="copyright">
            © {new Date().getFullYear()} Mulaqat. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .reset-page {
          min-height: 100vh;
          width: 100%;
          background: #080b12;
          color: #f5f7fb;
          font-family: Inter, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          overflow: hidden;
          position: relative;
        }

        .reset-background {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .reset-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
        }

        .reset-glow-one {
          width: 420px;
          height: 420px;
          background: #5b7cff;
          top: -180px;
          left: -100px;
        }

        .reset-glow-two {
          width: 380px;
          height: 380px;
          background: #7c4dff;
          bottom: -180px;
          right: -100px;
        }

        .reset-container {
          min-height: 100vh;
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 0.9fr;
          position: relative;
          z-index: 1;
        }

        /* Branding */

        .reset-brand {
          display: flex;
          align-items: center;
          padding: 70px 70px 70px 80px;
        }

        .brand-content {
          max-width: 560px;
        }

        .reset-logo {
          width: 170px;
          height: auto;
          display: block;
          margin-bottom: 46px;
        }

        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 13px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: #aeb7ca;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2px;
          margin-bottom: 24px;
        }

        .badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #61d98b;
          box-shadow: 0 0 12px rgba(97, 217, 139, 0.7);
        }

        .brand-content h1 {
          font-size: clamp(44px, 5vw, 70px);
          line-height: 1.02;
          letter-spacing: -3px;
          margin: 0 0 24px;
          font-weight: 700;
        }

        .brand-content h1 span {
          display: block;
          background: linear-gradient(100deg, #7894ff, #a783ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .brand-content > p {
          color: #8993a8;
          font-size: 16px;
          line-height: 1.75;
          max-width: 500px;
          margin: 0 0 38px;
        }

        .security-points {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .security-point {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .security-icon {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.16);
          color: #8197ff;
          font-size: 13px;
          font-weight: 700;
        }

        .security-point strong {
          display: block;
          color: #dfe4ee;
          font-size: 13px;
          margin-bottom: 3px;
        }

        .security-point span {
          color: #737d91;
          font-size: 12px;
        }

        /* Form section */

        .reset-form-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 55px;
        }

        .reset-card {
          width: 100%;
          max-width: 480px;
          padding: 38px;
          border-radius: 22px;
          background: rgba(17, 21, 31, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.085);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(20px);
        }

        .reset-header {
          margin-bottom: 30px;
        }

        .reset-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(104, 128, 255, 0.1);
          border: 1px solid rgba(104, 128, 255, 0.17);
          color: #8196ff;
          margin-bottom: 20px;
        }

        .reset-icon svg {
          width: 23px;
          height: 23px;
        }

        .reset-header h2 {
          margin: 0 0 9px;
          font-size: 26px;
          letter-spacing: -0.7px;
          font-weight: 680;
        }

        .reset-header p {
          margin: 0;
          color: #7f899d;
          font-size: 13px;
          line-height: 1.6;
        }

        .field-group {
          margin-bottom: 20px;
        }

        .field-group label {
          display: block;
          color: #c8ceda;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .password-wrapper {
          position: relative;
        }

        .password-wrapper input {
          width: 100%;
          height: 50px;
          padding: 0 48px 0 15px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          outline: none;
          background: rgba(5, 8, 14, 0.7);
          color: #f0f3f8;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .password-wrapper input::placeholder {
          color: #535d70;
        }

        .password-wrapper input:focus {
          border-color: rgba(112, 137, 255, 0.7);
          box-shadow: 0 0 0 3px rgba(112, 137, 255, 0.09);
        }

        .password-wrapper input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 13px;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: #6f798c;
          cursor: pointer;
          padding: 0;
        }

        .password-toggle:hover {
          color: #b5bfd0;
        }

        .password-toggle svg {
          width: 18px;
          height: 18px;
        }

        .strength-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
        }

        .strength-bars {
          flex: 1;
          display: flex;
          gap: 4px;
        }

        .strength-bar {
          height: 3px;
          flex: 1;
          border-radius: 5px;
          background: #252b37;
        }

        .strength-bar.active {
          background: #7188ff;
        }

        .strength-text {
          min-width: 43px;
          text-align: right;
          font-size: 10px;
          color: #7f899d;
        }

        .strength-4 {
          color: #70d594;
        }

        .strength-3 {
          color: #9bb0ff;
        }

        .strength-2 {
          color: #d5ad63;
        }

        .strength-1 {
          color: #df7777;
        }

        .form-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 12px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.45;
          margin: 4px 0 17px;
        }

        .error-message {
          color: #f0a2a2;
          background: rgba(210, 71, 71, 0.08);
          border: 1px solid rgba(210, 71, 71, 0.15);
        }

        .success-message {
          color: #8cdbad;
          background: rgba(71, 190, 115, 0.08);
          border: 1px solid rgba(71, 190, 115, 0.15);
        }

        .message-icon {
          width: 17px;
          height: 17px;
          flex: 0 0 17px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          margin-top: 1px;
        }

        .error-message .message-icon {
          border: 1px solid rgba(240, 162, 162, 0.45);
        }

        .success-message .message-icon {
          border: 1px solid rgba(140, 219, 173, 0.45);
        }

        .reset-button {
          width: 100%;
          height: 50px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(135deg, #667eea, #7564e8);
          color: white;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow: 0 10px 25px rgba(92, 100, 220, 0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .reset-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 13px 30px rgba(92, 100, 220, 0.3);
        }

        .reset-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .button-arrow {
          font-size: 18px;
          line-height: 0;
        }

        .spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .back-login {
          text-align: center;
          margin-top: 22px;
        }

        .back-login button {
          border: 0;
          background: transparent;
          color: #858fa3;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .back-login button:hover {
          color: #b9c2d2;
        }

        .back-login span {
          margin-right: 6px;
        }

        .reset-security {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin-top: 27px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.055);
          color: #555f72;
          font-size: 10px;
        }

        .lock-small {
          font-size: 13px;
          color: #687286;
        }

        .copyright {
          margin: 22px 0 0;
          color: #4d5668;
          font-size: 10px;
          text-align: center;
        }

        @media (max-width: 950px) {
          .reset-container {
            grid-template-columns: 1fr;
          }

          .reset-brand {
            display: none;
          }

          .reset-form-section {
            min-height: 100vh;
            padding: 30px 20px;
          }

          .reset-card {
            max-width: 460px;
          }
        }

        @media (max-width: 520px) {
          .reset-form-section {
            padding: 20px 15px;
          }

          .reset-card {
            padding: 28px 22px;
            border-radius: 18px;
          }

          .reset-header h2 {
            font-size: 23px;
          }
        }
      `}</style>
    </div>
  );
}

export default ResetPassword;