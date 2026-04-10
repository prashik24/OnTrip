import Booking from "../models/Booking.js";

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function getUserUpcomingBookings(req, res) {
  try {
    const today = startOfToday();

    const bookings = await Booking.find({
      user: req.user._id,
      bookingDate: { $gte: today },
      bookingStatus: { $ne: "cancelled" },
      paymentStatus: "paid",
    })
      .populate("provider")
      .sort({ bookingDate: 1 });

    return res.json({ bookings });
  } catch (error) {
    console.error("getUserUpcomingBookings error", error);
    return res.status(500).json({
      message: "Failed to fetch upcoming bookings",
    });
  }
}

export async function getProviderUpcomingBookings(req, res) {
  try {
    const today = startOfToday();

    const bookings = await Booking.find({
      providerOwner: req.user._id,
      bookingDate: { $gte: today },
      bookingStatus: { $ne: "cancelled" },
      paymentStatus: "paid",
    })
      .populate("user", "name email phone")
      .populate("provider")
      .sort({ bookingDate: 1 });

    return res.json({ bookings });
  } catch (error) {
    console.error("getProviderUpcomingBookings error", error);
    return res.status(500).json({
      message: "Failed to fetch provider upcoming bookings",
    });
  }
}