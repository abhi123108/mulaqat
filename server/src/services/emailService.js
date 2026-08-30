const nodemailer = require("nodemailer");

const sendPasswordResetEmail = async (email, resetUrl) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Mulaqat" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Reset your Mulaqat password",
    text: `Reset your Mulaqat password using this link: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Reset your Mulaqat password</h2>

        <p>We received a request to reset your password.</p>

        <p>
          Click the button below to create a new password.
          This link will expire in 15 minutes.
        </p>

        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #000;
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Reset Password
        </a>

        <p style="margin-top: 20px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
};