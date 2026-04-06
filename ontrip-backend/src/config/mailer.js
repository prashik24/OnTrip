import axios from "axios";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function validateBrevoEnv() {
  const required = [
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "BREVO_SENDER_NAME",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing Brevo environment variables: ${missing.join(", ")}`
    );
  }
}

export async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  attachments = [],
}) {
  validateBrevoEnv();

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent,
  };

  if (attachments.length > 0) {
    payload.attachment = attachments.map((item) => ({
      name: item.name,
      content: item.contentBase64,
    }));
  }

  try {
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;

    console.error("Brevo email error:", {
      status,
      data,
      message: error.message,
    });

    throw new Error(
      data?.message ||
        data?.code ||
        "Failed to send email through Brevo API"
    );
  }
}

export async function sendOtpEmail(to, otp) {
  return sendTransactionalEmail({
    to,
    subject: "Your OnTrip OTP Code",
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0b1b2a;background:#f4fbff;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid rgba(0,184,241,0.16);border-radius:18px;padding:28px;">
          <div style="font-size:28px;font-weight:800;color:#00b8f1;margin-bottom:12px;">OnTrip</div>
          <h2 style="margin:0 0 8px;">Email Verification</h2>
          <p style="margin:0 0 14px;color:#5b6570;">Your OTP is:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:6px;margin:8px 0 18px;color:#0b1b2a;">
            ${otp}
          </div>
          <p style="margin:0 0 8px;">This OTP will expire in 10 minutes.</p>
          <p style="margin:0;color:#5b6570;">If you did not request this, you can ignore this email.</p>
        </div>
      </div>
    `,
  });
}

//////////////////////////////////////////////////////////////////
// ✅ NEW FUNCTION (ADD BELOW ONLY)
//////////////////////////////////////////////////////////////////

export async function sendBroadcastEmail({
  to,
  subject,
  htmlContent,
}) {
  // Just reuse existing function (no duplication)
  return sendTransactionalEmail({
    to,
    subject,
    htmlContent,
  });
}