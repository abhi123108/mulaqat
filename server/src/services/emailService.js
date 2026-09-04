// ==============================
// BREVO EMAIL SERVICE
// ==============================

const sendPasswordResetEmail = async (
  to,
  resetUrl
) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_FROM;

    if (!apiKey) {
      throw new Error(
        "BREVO_API_KEY is not configured"
      );
    }

    if (!senderEmail) {
      throw new Error(
        "SMTP_FROM is not configured"
      );
    }

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",

        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },

        body: JSON.stringify({
          sender: {
            name: "Mulaqat",
            email: senderEmail,
          },

          to: [
            {
              email: to,
            },
          ],

          subject: "Reset your Mulaqat password",

          htmlContent: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8" />
                <title>Password Reset</title>
              </head>

              <body
                style="
                  margin: 0;
                  padding: 0;
                  background: #f5f7fb;
                  font-family: Arial, sans-serif;
                "
              >
                <div
                  style="
                    max-width: 600px;
                    margin: 40px auto;
                    background: #ffffff;
                    padding: 32px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                  "
                >
                  <h2
                    style="
                      margin-top: 0;
                      color: #111827;
                    "
                  >
                    Reset your Mulaqat password
                  </h2>

                  <p
                    style="
                      color: #4b5563;
                      font-size: 15px;
                      line-height: 1.6;
                    "
                  >
                    We received a request to reset
                    your Mulaqat account password.
                  </p>

                  <p
                    style="
                      color: #4b5563;
                      font-size: 15px;
                      line-height: 1.6;
                    "
                  >
                    Click the button below to create
                    a new password.
                  </p>

                  <div
                    style="
                      text-align: center;
                      margin: 30px 0;
                    "
                  >
                    <a
                      href="${resetUrl}"
                      style="
                        display: inline-block;
                        padding: 13px 24px;
                        background: #111827;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                      "
                    >
                      Reset Password
                    </a>
                  </div>

                  <p
                    style="
                      color: #6b7280;
                      font-size: 13px;
                      line-height: 1.5;
                    "
                  >
                    This password reset link will
                    expire in 15 minutes.
                  </p>

                  <p
                    style="
                      color: #6b7280;
                      font-size: 13px;
                      line-height: 1.5;
                    "
                  >
                    If you did not request a password
                    reset, you can safely ignore this
                    email.
                  </p>

                  <hr
                    style="
                      border: none;
                      border-top: 1px solid #e5e7eb;
                      margin: 30px 0;
                    "
                  />

                  <p
                    style="
                      color: #9ca3af;
                      font-size: 12px;
                    "
                  >
                    © Mulaqat
                  </p>
                </div>
              </body>
            </html>
          `,
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Brevo email API error:",
        response.status,
        responseText
      );

      throw new Error(
        `Brevo email API failed with status ${response.status}`
      );
    }

    let result = {};

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {};
    }

    console.log(
      "Password reset email accepted by Brevo:",
      result.messageId || "message accepted"
    );

    return result;
  } catch (error) {
    console.error(
      "Password reset email error:",
      error
    );

    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
};