import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import { sendTransactionalEmail } from "../config/mailer.js";

function getTomorrowRange() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function runBookingReminderJob() {
  try {
    const { start, end } = getTomorrowRange();

    const bookings = await Booking.find({
      bookingDate: { $gte: start, $lte: end },
      reminderSent: false,
      bookingStatus: { $ne: "cancelled" },
      paymentStatus: "paid",
    }).populate("provider");

    for (const booking of bookings) {
      try {
        const email = booking.contactEmail || "";

        if (!email) continue;

        await sendTransactionalEmail({
          to: email,
          subject: `Reminder: Your Trip is Tomorrow (${booking.bookingRef})`,
          htmlContent: `
            <div style="font-family:Arial;padding:20px;">
              <h2>Your Trip is Coming 🚀</h2>
              <p>Hello ${booking.contactName},</p>
              <p>Your booking <b>${booking.bookingRef}</b> is scheduled for <b>${new Date(
            booking.bookingDate
          ).toDateString()}</b>.</p>
              <p>Service: ${booking.serviceTitle}</p>
              <p>Provider: ${booking.provider?.businessName || ""}</p>
              <br/>
              <p>Have a great trip with OnTrip!</p>
            </div>
          `,
        });

        booking.reminderSent = true;
        booking.reminderSentAt = new Date();
        await booking.save();
      } catch (err) {
        console.error("Reminder email error:", err.message);
      }
    }

    console.log("✅ Booking reminder job executed");
  } catch (error) {
    console.error("Reminder job error:", error);
  }
}