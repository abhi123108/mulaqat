import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });

    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", formData);

      setMessage(response.data.message);

      setFormData({
        name: "",
        email: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;

    if (!password) {
      return {
        label: "",
        width: "0%",
        className: "",
      };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        label: "Weak password",
        width: "25%",
        className: "weak",
      };
    }

    if (score === 2) {
      return {
        label: "Fair password",
        width: "50%",
        className: "fair",
      };
    }

    if (score === 3) {
      return {
        label: "Good password",
        width: "75%",
        className: "good",
      };
    }

    return {
      label: "Strong password",
      width: "100%",
      className: "strong",
    };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="register-page">
      <style>{`
        .register-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(79, 70, 229, 0.14),
              transparent 32%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(37, 99, 235, 0.10),
              transparent 30%
            ),
            #090d16;
          color: #f8fafc;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          box-sizing: border-box;
        }

        .register-container {
          width: 100%;
          max-width: 1080px;
          min-height: 650px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.88);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
        }

        .register-brand-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              rgba(30, 41, 59, 0.92),
              rgba(15, 23, 42, 0.96)
            );
          border-right: 1px solid rgba(148, 163, 184, 0.10);
        }

        .register-brand-panel::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          top: -100px;
          right: -80px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.12);
          filter: blur(5px);
        }

        .register-brand-panel::after {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          bottom: -100px;
          left: -80px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.10);
        }

        .brand-content {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: block;
          width: 190px;
          max-width: 100%;
          height: auto;
          margin-bottom: 42px;
          object-fit: contain;
          object-position: left center;
        }

        .brand-title {
          max-width: 430px;
          margin: 0 0 18px;
          font-size: 42px;
          line-height: 1.08;
          letter-spacing: -1.6px;
          font-weight: 750;
          color: #f8fafc;
        }

        .brand-title span {
          color: #818cf8;
        }

        .brand-description {
          max-width: 420px;
          margin: 0;
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.7;
        }

        .brand-points {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 38px;
        }

        .brand-point {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .point-icon {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.14);
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 700;
        }

        .register-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px;
          background: #0b1120;
        }

        .register-form-wrapper {
          width: 100%;
          max-width: 390px;
        }

        .form-heading {
          margin-bottom: 30px;
        }

        .form-heading h1 {
          margin: 0 0 9px;
          color: #f8fafc;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: -0.7px;
        }

        .form-heading p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          height: 50px;
          padding: 0 15px;
          border: 1px solid #253047;
          border-radius: 10px;
          outline: none;
          background: #111827;
          color: #f8fafc;
          font-size: 14px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
          box-sizing: border-box;
        }

        .form-input::placeholder {
          color: #475569;
        }

        .form-input:hover {
          border-color: #334155;
        }

        .form-input:focus {
          border-color: #6366f1;
          background: #0f172a;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        .password-input {
          padding-right: 52px;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 10px;
          width: 34px;
          height: 34px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 13px;
        }

        .password-toggle:hover {
          background: #1e293b;
          color: #cbd5e1;
        }

        .password-strength {
          margin-top: 9px;
        }

        .strength-track {
          width: 100%;
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: #1e293b;
        }

        .strength-bar {
          height: 100%;
          border-radius: inherit;
          transition:
            width 0.25s ease,
            background 0.25s ease;
        }

        .strength-bar.weak {
          background: #ef4444;
        }

        .strength-bar.fair {
          background: #f59e0b;
        }

        .strength-bar.good {
          background: #22c55e;
        }

        .strength-bar.strong {
          background: #10b981;
        }

        .strength-label {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 11px;
        }

        .submit-button {
          width: 100%;
          height: 50px;
          margin-top: 5px;
          border: 0;
          border-radius: 10px;
          background: #6366f1;
          color: #ffffff;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.20);
        }

        .submit-button:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(99, 102, 241, 0.28);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .status-message {
          margin: 18px 0 0;
          padding: 11px 13px;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1.5;
        }

        .success-message {
          border: 1px solid rgba(34, 197, 94, 0.18);
          background: rgba(34, 197, 94, 0.08);
          color: #86efac;
        }

        .error-message {
          border: 1px solid rgba(239, 68, 68, 0.18);
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
        }

        .login-link {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid #1e293b;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        .login-link button {
          margin-left: 5px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #818cf8;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .login-link button:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        .security-note {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
          color: #475569;
          font-size: 11px;
        }

        .security-icon {
          font-size: 12px;
        }

        @media (max-width: 850px) {
          .register-page {
            padding: 20px;
          }

          .register-container {
            max-width: 520px;
            grid-template-columns: 1fr;
          }

          .register-brand-panel {
            display: none;
          }

          .register-form-panel {
            padding: 42px 28px;
          }
        }

        @media (max-width: 480px) {
          .register-page {
            padding: 12px;
          }

          .register-container {
            border-radius: 18px;
          }

          .register-form-panel {
            padding: 34px 20px;
          }

          .form-heading h1 {
            font-size: 27px;
          }
        }
      `}</style>

      <div className="register-container">
        <section className="register-brand-panel">
          <div className="brand-content">
            <img
              src="/mulaqat-logo-horizontal.png"
              alt="Mulaqat"
              className="brand-logo"
            />

            <h2 className="brand-title">
              Connect. <span>Collaborate.</span> Meet.
            </h2>

            <p className="brand-description">
              Create your Mulaqat account and start having secure,
              real-time video meetings with your team.
            </p>

            <div className="brand-points">
              <div className="brand-point">
                <span className="point-icon">✓</span>
                <span>High-quality real-time video meetings</span>
              </div>

              <div className="brand-point">
                <span className="point-icon">✓</span>
                <span>Secure authentication and private meetings</span>
              </div>

              <div className="brand-point">
                <span className="point-icon">✓</span>
                <span>Built for teams and remote collaboration</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-form-panel">
          <div className="register-form-wrapper">
            <div className="form-heading">
              <h1>Create your account</h1>
              <p>
                Join Mulaqat and start connecting with your team.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full name</label>

                <input
                  id="name"
                  className="form-input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  className="form-input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>

                <div className="input-wrapper">
                  <input
                    id="password"
                    className="form-input password-input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-track">
                      <div
                        className={`strength-bar ${passwordStrength.className}`}
                        style={{
                          width: passwordStrength.width,
                        }}
                      />
                    </div>

                    <span className="strength-label">
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </button>
            </form>

            {message && (
              <p className="status-message success-message">
                {message}
              </p>
            )}

            {error && (
              <p className="status-message error-message">
                {error}
              </p>
            )}

            <div className="login-link">
              Already have an account?
              <button
                type="button"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            </div>

            <div className="security-note">
              <span className="security-icon">🔒</span>
              <span>Your account information is securely handled.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Register;