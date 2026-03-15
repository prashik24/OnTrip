import crypto from "crypto";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import Review from "../models/Review.js";
import razorpay from "../config/razorpay.js";
import { generateBookingCode } from "../utils/generateBookingCode.js";
import { buildInvoicePdfBuffer } from "../utils/invoicePdf.js";
import {
  sendBookingSuccessEmail,
  sendBookingStatusEmail,
} from "../config/mailer.js";

function getBookingImage(provider, serviceType, selectedVehicleId) {
  if (!provider) return "";

  if (serviceType === "vehicle") {
    const selected = (provider.vehicles || []).find(
      (item) => String(item._id) === String(selectedVehicleId)
    );

    if (selected?.images?.[0]?.url) return selected.images[0].url;
    if (provider.vehicles?.[0]?.images?.[0]?.url) return provider.vehicles[0].images[0].url;
    return "";
  }

  return provider.travelPlanner?.images?.[0]?.url || "";
}

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
      place,
      days,
      selectedVehicleId,
      selectedVehicleTitle,
      selectedPackageTitle,
      unitPrice,
      pricingLabel,
      notes,
      amount,
    } = req.body;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        message: "Razorpay keys are missing on server.",
      });
    }

    if (!providerId) {
      return res.status(400).json({ message: "Provider id is required." });
    }

    if (!contactName?.trim()) {
      return res.status(400).json({ message: "Contact name is required." });
    }

    if (!contactPhone?.trim()) {
      return res.status(400).json({ message: "Contact phone is required." });
    }

    if (!bookingDate) {
      return res.status(400).json({ message: "Booking date is required." });
    }

    const parsedBookingDate = new Date(bookingDate);
    if (Number.isNaN(parsedBookingDate.getTime())) {
      return res.status(400).json({ message: "Invalid booking date." });
    }

    const numericAmount = Number(amount);
    const numericUnitPrice = Number(unitPrice || 0);
    const numericPeopleCount = Number(peopleCount || 1);
    const numericDays = Number(days || 1);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid booking amount." });
    }

    const provider = await Provider.findById(providerId).populate("owner", "_id");

    if (!provider) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (!provider.owner?._id) {
      return res.status(500).json({ message: "Provider owner not found." });
    }

    if (String(provider.owner._id) === String(req.user._id)) {
      return res.status(403).json({ message: "You cannot book your own service." });
    }

    const amountInPaise = Math.round(numericAmount * 100);

    if (!amountInPaise || amountInPaise < 100) {
      return res.status(400).json({ message: "Minimum payable amount is ₹1." });
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
      bookingCode: generateBookingCode(),
      user: req.user._id,
      provider: provider._id,
      providerOwner: provider.owner._id,
      serviceType: provider.listingType,
      serviceTitle,
      bookingImage: getBookingImage(provider, provider.listingType, selectedVehicleId),
      contactName: contactName.trim(),
      contactEmail: contactEmail?.trim() || "",
      contactPhone: contactPhone.trim(),
      destination: destination?.trim() || "",
      place: place?.trim() || "",
      bookingDate: parsedBookingDate,
      days: numericDays,
      peopleCount: numericPeopleCount,
      selectedVehicleId: selectedVehicleId || null,
      selectedVehicleTitle: selectedVehicleTitle?.trim() || "",
      selectedPackageTitle: selectedPackageTitle?.trim() || "",
      unitPrice: numericUnitPrice,
      pricingLabel: pricingLabel?.trim() || "",
      notes: notes?.trim() || "",
      amount: numericAmount,
      currency: "INR",
      paymentStatus: "created",
      bookingStatus: "pending",
      razorpayOrderId: order.id,
    });

    return res.json({
      message: "Booking order created successfully.",
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("createBookingOrder error:", error);
    return res.status(500).json({
      message: error?.message || "Failed to create booking order.",
    });
  }
}

export async function verifyBookingPayment(req, res) {
  try {
    const { bookingId, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("user", "name email phone")
      .populate("provider", "businessName listingType travelPlanner vehicles");

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

    try {
      const pdfBuffer = await buildInvoicePdfBuffer({
        booking,
        user: booking.user,
        provider: booking.provider,
      });

      if (booking.contactEmail || booking.user?.email) {
        await sendBookingSuccessEmail({
          to: booking.contactEmail || booking.user.email,
          booking,
          provider: booking.provider,
          user: booking.user,
          pdfBuffer,
        });
      }
    } catch (mailError) {
      console.error("sendBookingSuccessEmail error:", mailError.message);
    }

    return res.json({
      message: "Payment verified successfully.",
      booking: {
        _id: booking._id,
        bookingCode: booking.bookingCode,
      },
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
      const existingReview =
        reviewMap.get(String(booking.provider?._id || booking.provider)) || null;

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
    const { bookingStatus, statusReason } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("provider", "businessName listingType");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (String(booking.providerOwner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    booking.bookingStatus = bookingStatus || booking.bookingStatus;
    booking.statusReason = statusReason?.trim() || "";
    await booking.save();

    if (["cancelled", "completed"].includes(booking.bookingStatus)) {
      try {
        const pdfBuffer = await buildInvoicePdfBuffer({
          booking,
          user: booking.user,
          provider: booking.provider,
        });

        if (booking.contactEmail || booking.user?.email) {
          await sendBookingStatusEmail({
            to: booking.contactEmail || booking.user.email,
            booking,
            provider: booking.provider,
            user: booking.user,
            pdfBuffer,
          });
        }
      } catch (mailError) {
        console.error("sendBookingStatusEmail error:", mailError.message);
      }
    }

    return res.json({
      message: "Booking status updated successfully.",
      booking,
    });
  } catch (error) {
    console.error("updateBookingStatus error", error);
    return res.status(500).json({ message: "Failed to update booking status." });
  }
}

export async function getBookingById(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("provider", "businessName listingType city phone description");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const allowed =
      String(booking.user?._id || booking.user) === String(req.user._id) ||
      String(booking.providerOwner) === String(req.user._id);

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed." });
    }

    return res.json({ booking });
  } catch (error) {
    console.error("getBookingById error", error);
    return res.status(500).json({ message: "Failed to fetch booking." });
  }
}

export async function downloadInvoice(req, res) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("provider", "businessName listingType city phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const allowed =
      String(booking.user?._id || booking.user) === String(req.user._id) ||
      String(booking.providerOwner) === String(req.user._id);

    if (!allowed) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const pdfBuffer = await buildInvoicePdfBuffer({
      booking,
      user: booking.user,
      provider: booking.provider,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="OnTrip-Invoice-${booking.bookingCode}.pdf"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("downloadInvoice error", error);
    return res.status(500).json({ message: "Failed to generate invoice." });
  }
}