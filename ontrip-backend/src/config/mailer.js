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

async function sendBrevoEmail(payload) {
  validateBrevoEnv();

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

function pageShell(title, subtitle, contentHtml) {
  return `
  <div style="margin:0;padding:0;background:#f4fbff;font-family:Inter,Arial,sans-serif;color:#0b1b2a;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid rgba(0,184,241,0.15);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(10,22,35,0.06);">
        <div style="padding:22px 24px;background:linear-gradient(135deg,#4ec9f5,#00b8f1);color:#ffffff;">
          <div style="font-size:28px;font-weight:800;line-height:1.1;">OnTrip</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;">${title}</div>
          <div style="margin-top:6px;font-size:14px;opacity:0.95;">${subtitle}</div>
        </div>

        <div style="padding:24px;">
          ${contentHtml}
        </div>
      </div>

      <div style="text-align:center;color:#6b7280;font-size:12px;margin-top:14px;">
        OnTrip • Travel smarter with verified services
      </div>
    </div>
  </div>
  `;
}

function bookingSummaryHtml({ booking, provider, user }) {
  return `
    <div style="display:grid;gap:14px;">
      <div style="padding:16px;border:1px solid rgba(0,184,241,0.12);border-radius:14px;background:#ffffff;">
        <div style="font-size:18px;font-weight:700;margin-bottom:10px;">Booking Summary</div>
        <div style="font-size:14px;line-height:1.8;color:#334155;">
          <div><strong>Booking Code:</strong> ${booking.bookingCode}</div>
          <div><strong>Name:</strong> ${booking.contactName || user?.name || "-"}</div>
          <div><strong>Email:</strong> ${booking.contactEmail || user?.email || "-"}</div>
          <div><strong>Phone:</strong> ${booking.contactPhone || user?.phone || "-"}</div>
          <div><strong>Provider:</strong> ${provider?.businessName || booking.serviceTitle || "-"}</div>
          <div><strong>Service:</strong> ${booking.serviceTitle || "-"}</div>
          <div><strong>Booking Date:</strong> ${
            booking.bookingDate
              ? new Date(booking.bookingDate).toLocaleDateString()
              : "-"
          }</div>
          <div><strong>Destination:</strong> ${booking.destination || "-"}</div>
          <div><strong>Place:</strong> ${booking.place || "-"}</div>
          <div><strong>Vehicle:</strong> ${booking.selectedVehicleTitle || "-"}</div>
          <div><strong>Package:</strong> ${booking.selectedPackageTitle || "-"}</div>
          <div><strong>Days:</strong> ${booking.days || 1}</div>
          <div><strong>People:</strong> ${booking.peopleCount || 1}</div>
          <div><strong>Pricing:</strong> ${booking.pricingLabel || "-"}</div>
          <div><strong>Total Paid:</strong> ₹${Number(booking.amount || 0).toFixed(2)}</div>
          <div><strong>Payment Status:</strong> ${booking.paymentStatus || "-"}</div>
          <div><strong>Booking Status:</strong> ${booking.bookingStatus || "-"}</div>
          ${booking.statusReason ? `<div><strong>Reason:</strong> ${booking.statusReason}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

export async function sendOtpEmail(to, otp) {
  return sendBrevoEmail({
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
  });
}

export async function sendBookingSuccessEmail({
  to,
  booking,
  provider,
  user,
  pdfBuffer,
}) {
  const htmlContent = pageShell(
    "Booking Placed Successfully",
    "Your payment was successful and your booking is confirmed.",
    bookingSummaryHtml({ booking, provider, user })
  );

  return sendBrevoEmail({
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject: `OnTrip Booking Confirmed - ${booking.bookingCode}`,
    htmlContent,
    attachment: pdfBuffer
      ? [
          {
            name: `OnTrip-Invoice-${booking.bookingCode}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ]
      : [],
  });
}

export async function sendBookingStatusEmail({
  to,
  booking,
  provider,
  user,
  pdfBuffer,
}) {
  const title =
    booking.bookingStatus === "cancelled"
      ? "Booking Cancelled"
      : booking.bookingStatus === "completed"
      ? "Booking Completed"
      : "Booking Status Updated";

  const subtitle =
    booking.bookingStatus === "cancelled"
      ? "Your provider updated the booking as cancelled."
      : booking.bookingStatus === "completed"
      ? "Your provider marked your booking as completed."
      : "Your booking status has changed.";

  const htmlContent = pageShell(
    title,
    subtitle,
    bookingSummaryHtml({ booking, provider, user })
  );

  return sendBrevoEmail({
    sender: {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject: `OnTrip Booking Update - ${booking.bookingCode}`,
    htmlContent,
    attachment: pdfBuffer
      ? [
          {
            name: `OnTrip-Invoice-${booking.bookingCode}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ]
      : [],
  });
}