import nodemailer from "nodemailer";

/**
 * Build an SMTP transporter from environment variables.
 * @returns {import("nodemailer").Transporter}
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send a one-time sign-in code to the user's email.
 * @param {string} to
 * @param {string} code
 * @param {"signin"|"register"} purpose
 * @returns {Promise<void>}
 */
export async function sendOtpEmail(to, code, purpose = "signin") {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USERNAME;
  if (!from) {
    throw new Error("EMAIL_FROM is not set");
  }

  const transporter = getTransporter();
  const action = purpose === "register" ? "finish creating your account" : "sign in";

  await transporter.sendMail({
    from,
    to,
    subject: `${code} — your PROWPLUS Impact Wall code`,
    text: [
      `Your one-time code to ${action}:`,
      "",
      code,
      "",
      "This code expires in 10 minutes.",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 420px; color: #101828;">
        <p style="font-size: 15px;">Your one-time code to ${action}:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.2em; margin: 24px 0;">${code}</p>
        <p style="font-size: 13px; color: #667085;">Expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
