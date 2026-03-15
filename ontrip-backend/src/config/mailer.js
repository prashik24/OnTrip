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

export async function sendOtpEmail(to, otp) {
  validateBrevoEnv();

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject: "Your OnTrip OTP Code",
    htmlContent: `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0b1b2a;">
        <h2 style="margin-bottom:8px;">OnTrip Email Verification</h2>
        <p style="margin:0 0 12px;">Your OTP is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0 16px;">
          ${otp}
        </div>
        <p style="margin:0 0 8px;">This OTP will expire in 10 minutes.</p>
        <p style="margin:0;color:#5b6570;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };

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
        "Failed to send OTP email through Brevo API"
    );
  }
}