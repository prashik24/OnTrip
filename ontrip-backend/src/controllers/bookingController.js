import crypto from "crypto";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import Review from "../models/Review.js";
import razorpay from "../config/razorpay.js";

export async function createBookingOrder(req, res) {
  try {
    const {
      providerId,
      contactName,
      contactEmail,
      contactPhone,
      bookingDate,
      peopleCount,
      destination,
      notes,
      amount,
    } = req.body;

    const provider = await Provider.findById(providerId).populate("owner", "_id");

    if (!provider) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (String(provider.owner._id) === String(req.user._id)) {
      return res.status(403).json({ message: "You cannot book your own service." });
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    if (!amountInPaise || amountInPaise < 100) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `booking_${Date.now()}`,
    });

    const serviceTitle =
      provider.listingType === "vehicle"
        ? provider.businessName
        : provider.travelPlanner?.packageTitle || provider.businessName;

    const booking = await Booking.create({
      user: req.user._id,
      provider: provider._id,
      providerOwner: provider.owner._id,
      serviceType: provider.listingType,
      serviceTitle,
      contactName,
      contactEmail: contactEmail || "",
      contactPhone,
      bookingDate,
      peopleCount: Number(peopleCount || 1),
      destination: destination || "",
      notes: notes || "",
      amount: Number(amount),
      currency: "INR",
      paymentStatus: "created",
      bookingStatus: "pending",
      razorpayOrderId: order.id,
    });

    return res.json({
      message: "Booking order created successfully.",
      bookingId: booking._id,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("createBookingOrder error", error);
    return res.status(500).json({ message: "Failed to create booking order." });
  }
}

export async function verifyBookingPayment(req, res) {
  try {
    const {
      bookingId,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${booking.razorpayOrderId}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      booking.paymentStatus = "failed";
      await booking.save();

      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    booking.paymentStatus = "paid";
    booking.bookingStatus = "confirmed";
    await booking.save();

    return res.json({
      message: "Payment verified successfully.",
      booking,
    });
  } catch (error) {
    console.error("verifyBookingPayment error", error);
    return res.status(500).json({ message: "Failed to verify payment." });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("provider", "businessName listingType city")
      .sort({ createdAt: -1 })
      .lean();

    const providerIds = bookings.map((b) => b.provider?._id).filter(Boolean);

    const reviews = await Review.find({
      user: req.user._id,
      provider: { $in: providerIds },
    }).lean();

    const reviewMap = new Map(
      reviews.map((review) => [String(review.provider), review])
    );

    const hydrated = bookings.map((booking) => {
      const existingReview = reviewMap.get(String(booking.provider?._id || booking.provider)) || null;

      return {
        ...booking,
        canReview: booking.paymentStatus === "paid",
        existingReview,
      };
    });

    return res.json({ bookings: hydrated });
  } catch (error) {
    console.error("getMyBookings error", error);
    return res.status(500).json({ message: "Failed to fetch booking history." });
  }
}

export async function getProviderBookings(req, res) {
  try {
    const bookings = await Booking.find({ providerOwner: req.user._id })
      .populate("user", "name email phone avatar")
      .populate("provider", "businessName listingType city")
      .sort({ createdAt: -1 });

    return res.json({ bookings });
  } catch (error) {
    console.error("getProviderBookings error", error);
    return res.status(500).json({ message: "Failed to fetch provider bookings." });
  }
}

export async function updateBookingStatus(req, res) {
  try {
    const { bookingStatus } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (String(booking.providerOwner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    booking.bookingStatus = bookingStatus || booking.bookingStatus;
    await booking.save();

    return res.json({
      message: "Booking status updated successfully.",
      booking,
    });
  } catch (error) {
    console.error("updateBookingStatus error", error);
    return res.status(500).json({ message: "Failed to update booking status." });
  }
}