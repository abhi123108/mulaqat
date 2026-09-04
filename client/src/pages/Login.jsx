import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", formData);

      const token = response.data.token;

      localStorage.setItem("mulaqat_token", token);

      if (response.data.user) {
        localStorage.setItem(
          "mulaqat_user",
          JSON.stringify(response.data.user)
        );
      }

      navigate("/");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          background:
            radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.16), transparent 32%),
            radial-gradient(circle at 85% 80%, rgba(14, 165, 233, 0.10), transparent 30%),
            #090b12;
          color: #f8fafc;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Helvetica, Arial, sans-serif;
        }

        .login-brand-panel {
          position: relative;
          width: 50%;
          min-height: 100vh;
          padding: 56px 7%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          background:
            linear-gradient(145deg, rgba(20, 24, 39, 0.92), rgba(9, 11, 18, 0.98));
        }

        .login-brand-panel::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.12);
          filter: blur(80px);
          top: -180px;
          left: -150px;
          pointer-events: none;
        }

        .login-brand-panel::after {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.08);
          filter: blur(80px);
          bottom: -170px;
          right: -130px;
          pointer-events: none;
        }

        .brand-content,
        .brand-footer {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          width: 190px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .brand-copy {
          max-width: 500px;
          margin-top: auto;
          margin-bottom: auto;
          padding: 80px 0;
        }

        .brand-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .brand-eyebrow::before {
          content: "";
          width: 28px;
          height: 1px;
          background: #818cf8;
        }

        .brand-copy h1 {
          margin: 0;
          max-width: 480px;
          font-size: clamp(42px, 4vw, 64px);
          line-height: 1.05;
          letter-spacing: -0.045em;
          font-weight: 700;
        }

        .brand-copy h1 span {
          color: #a5b4fc;
        }

        .brand-copy p {
          margin: 24px 0 0;
          max-width: 460px;
          color: #94a3b8;
          font-size: 16px;
          line-height: 1.75;
        }

        .brand-footer {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #64748b;
          font-size: 13px;
        }

        .secure-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.08);
        }

        .login-form-panel {
          width: 50%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 7%;
          background: rgba(7, 9, 15, 0.72);
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 42px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 22px;
          background: rgba(17, 20, 30, 0.82);
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
          backdrop-filter: blur(18px);
        }

        .login-header {
          margin-bottom: 30px;
        }

        .login-header h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
          letter-spacing: -0.025em;
          font-weight: 700;
        }

        .login-header p {
          margin: 9px 0 0;
          color: #8491a7;
          font-size: 14px;
          line-height: 1.6;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 19px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          color: #d7deea;
          font-size: 13px;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #64748b;
          pointer-events: none;
        }

        .login-input {
          width: 100%;
          height: 50px;
          padding: 0 15px 0 43px;
          border: 1px solid #293142;
          border-radius: 11px;
          outline: none;
          background: #0d111a;
          color: #f8fafc;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .login-input::placeholder {
          color: #536075;
        }

        .login-input:hover {
          border-color: #3a4558;
        }

        .login-input:focus {
          border-color: #818cf8;
          background: #0f1420;
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.11);
        }

        .password-input {
          padding-right: 48px;
        }

        .password-toggle {
          position: absolute;
          top: 50%;
          right: 13px;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s, background 0.2s;
        }

        .password-toggle:hover {
          color: #cbd5e1;
          background: rgba(255, 255, 255, 0.05);
        }

        .form-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: -5px;
        }

        .forgot-button,
        .create-account-button {
          border: 0;
          padding: 0;
          background: transparent;
          color: #a5b4fc;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .forgot-button:hover,
        .create-account-button:hover {
          color: #c7d2fe;
          text-decoration: underline;
        }

        .login-submit {
          width: 100%;
          height: 50px;
          margin-top: 2px;
          border: 0;
          border-radius: 11px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.22);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(79, 70, 229, 0.30);
        }

        .login-submit:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 24px 0;
          color: #566176;
          font-size: 12px;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #252c39;
        }

        .google-button {
          width: 100%;
          height: 50px;
          border: 1px solid #30394a;
          border-radius: 11px;
          background: #111620;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          transition: border-color 0.2s, background 0.2s, transform 0.2s;
        }

        .google-button:hover {
          border-color: #465267;
          background: #161b26;
          transform: translateY(-1px);
        }

        .google-icon {
          width: 18px;
          height: 18px;
        }

        .signup-text {
          margin: 27px 0 0;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }

        .error-message {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 19px;
          padding: 12px 13px;
          border: 1px solid rgba(248, 113, 113, 0.22);
          border-radius: 10px;
          background: rgba(127, 29, 29, 0.16);
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.5;
        }

        .error-icon {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          margin-top: 1px;
        }

        @media (max-width: 900px) {
          .login-brand-panel {
            padding: 48px 5%;
          }

          .login-form-panel {
            padding: 40px 5%;
          }

          .login-card {
            padding: 34px;
          }
        }

        @media (max-width: 800px) {
          .login-brand-panel {
            display: none;
          }

          .login-form-panel {
            width: 100%;
            padding: 28px 20px;
          }

          .login-card {
            max-width: 460px;
          }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 28px 22px;
            border-radius: 18px;
          }

          .login-header h2 {
            font-size: 26px;
          }
        }
      `}</style>

      <div className="login-page">
        <section className="login-brand-panel">
          <div className="brand-content">
            <img
              src="/mulaqat-logo-horizontal.png"
              alt="Mulaqat"
              className="brand-logo"
            />
          </div>

          <div className="brand-copy">
            <div className="brand-eyebrow">
              Modern video collaboration
            </div>

            <h1>
              Meet. Connect.
              <br />
              <span>Collaborate.</span>
            </h1>

            <p>
              Secure, reliable video meetings designed to keep your
              conversations focused and your team connected.
            </p>
          </div>

          <div className="brand-footer">
            <span className="secure-dot" />
            Secure connection
          </div>
        </section>

        <main className="login-form-panel">
          <div className="login-card">
            <div className="login-header">
              <h2>Welcome back</h2>
              <p>Sign in to continue to your Mulaqat workspace.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  Email address
                </label>

                <div className="input-wrapper">
                  <svg
                    className="input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>

                  <input
                    id="login-email"
                    className="login-input"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="login-password">
                  Password
                </label>

                <div className="input-wrapper">
                  <svg
                    className="input-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>

                  <input
                    id="login-password"
                    className="login-input password-input"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 8a12.7 12.7 0 0 1-3.1 5.1" />
                        <path d="M6.6 6.6C4.6 7.9 3.4 10 2.5 12c1 4 4.5 8 9.5 8 1.1 0 2.1-.2 3-.5" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <button
                  type="button"
                  className="forgot-button"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <svg
                className="google-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.75Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.53 13.83A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.83V7.64H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.36l3.24-2.53Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.23 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.71 5.39l3.24 2.53C7.3 7.86 9.46 6.14 12 6.14Z"
                />
              </svg>
              Continue with Google
            </button>

            <p className="signup-text">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="create-account-button"
                onClick={() => navigate("/register")}
              >
                Create an account
              </button>
            </p>

            {error && (
              <div className="error-message" role="alert">
                <svg
                  className="error-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16.5h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;
