import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

export async function sendOtpEmail(to, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <h2>OnTrip Email Verification</h2>
      <p>Your OTP is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:6px;">${otp}</div>
      <p>This OTP will expire in 10 minutes.</p>
    </div>
  `;

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Your OnTrip OTP Code",
    html,
  });
}