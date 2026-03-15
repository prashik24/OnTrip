import crypto from "crypto";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import Review from "../models/Review.js";
import razorpay from "../config/razorpay.js";
import { sendTransactionalEmail } from "../config/mailer.js";
import { generateInvoicePdfBuffer } from "../utils/generateInvoicePdf.js";

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function getProviderCardImage(provider) {
  if (!provider) return "";

  return (
    provider.serviceImage?.url ||
    provider.travelPlanner?.images?.[0]?.url ||
    provider.vehicles?.[0]?.images?.[0]?.url ||
    ""
  );
}

function bookingEmailHtml({
  heading,
  subtext,
  booking,
  provider,
  imageUrl = "",
}) {
  return `
    <div style="margin:0;padding:24px;background:#f4fbff;font-family:Arial,Helvetica,sans-serif;color:#0b1b2a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid rgba(0,184,241,0.16);border-radius:18px;overflow:hidden;">
        <div style="background:${
          booking.bookingStatus === "cancelled"
            ? "linear-gradient(135deg,#ef4444,#dc2626)"
            : "linear-gradient(135deg,#4ec9f5,#00b8f1)"
        };padding:22px 26px;color:#ffffff;">
          <div style="font-size:28px;font-weight:800;">OnTrip</div>
          <div style="font-size:22px;font-weight:700;margin-top:8px;">${heading}</div>
          <div style="font-size:14px;opacity:0.95;margin-top:6px;">${subtext}</div>
        </div>

        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="Service" style="display:block;width:100%;height:220px;object-fit:cover;" />`
            : ""
        }

        <div style="padding:26px;">
          <div style="border:1px solid rgba(0,184,241,0.14);background:#f8fbff;border-radius:14px;padding:16px;margin-bottom:18px;">
            <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${booking.serviceTitle}</div>
            <div style="font-size:14px;color:#5b6570;">Booking Ref: <strong style="color:#0b1b2a;">${booking.bookingRef}</strong></div>
            <div style="font-size:14px;color:#5b6570;margin-top:4px;">Provider: ${provider.businessName}</div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:10px 0;color:#5b6570;">Customer</td><td style="padding:10px 0;font-weight:700;text-align:right;">${booking.contactName}</td></tr>
            <tr><td style="padding:10px 0;color:#5b6570;">Phone</td><td style="padding:10px 0;font-weight:700;text-align:right;">${booking.contactPhone}</td></tr>
            <tr><td style="padding:10px 0;color:#5b6570;">Travel Date</td><td style="padding:10px 0;font-weight:700;text-align:right;">${new Date(
              booking.bookingDate
            ).toLocaleDateString()}</td></tr>
            <tr><td style="padding:10px 0;color:#5b6570;">Total</td><td style="padding:10px 0;font-weight:700;text-align:right;">${money(
              booking.amount
            )}</td></tr>
          </table>

          ${
            booking.bookingStatus === "cancelled"
              ? `<div style="margin-top:18px;padding:14px;border-radius:12px;background:#fff7f7;border:1px solid rgba(239,68,68,0.14);">
                  <div style="font-weight:700;color:#b42318;margin-bottom:6px;">Service Cancelled</div>
                  <div style="color:#5b6570;">Your provider cancelled this booking. They will refund your money soon.</div>
                  ${
                    booking.cancellationReason
                      ? `<div style="margin-top:10px;color:#5b6570;"><strong>Reason:</strong> ${booking.cancellationReason}</div>`
                      : ""
                  }
                </div>`
              : ""
          }

          <div style="margin-top:20px;color:#5b6570;font-size:13px;line-height:1.7;">
            The invoice PDF is attached with this email.
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendBookingEmail({
  to,
  subject,
  heading,
  subtext,
  booking,
  provider,
}) {
  if (!to) return;

  const pdfBuffer = await generateInvoicePdfBuffer({ booking, provider });
  const imageUrl = getProviderCardImage(provider);

  await sendTransactionalEmail({
    to,
    subject,
    htmlContent: bookingEmailHtml({
      heading,
      subtext,
      booking,
      provider,
      imageUrl,
    }),
    attachments: [
      {
        name: `${booking.bookingRef}-invoice.pdf`,
        contentBase64: pdfBuffer.toString("base64"),
      },
    ],
  });
}

async function hydrateBookingForDetails(bookingId) {
  return Booking.findById(bookingId)
    .populate("user", "name email phone avatar")
    .populate("providerOwner", "name email phone")
    .populate("provider")
    .lean();
}

function canAccessBooking(booking, userId) {
  return (
    String(booking.user?._id || booking.user) === String(userId) ||
    String(booking.providerOwner?._id || booking.providerOwner) === String(userId)
  );
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
      pricingLabel,
      notes,
    } = req.body;

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

    const provider = await Provider.findById(providerId).populate("owner", "_id");

    if (!provider) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (String(provider.owner._id) === String(req.user._id)) {
      return res.status(403).json({ message: "You cannot book your own service." });
    }

    const numericPeopleCount = Math.max(1, Number(peopleCount || 1));
    const numericDays = Math.max(1, Number(days || 1));

    let finalUnitPrice = 0;
    let finalAmount = 0;
    let finalSelectedVehicleTitle = selectedVehicleTitle?.trim() || "";
    let finalSelectedPackageTitle = selectedPackageTitle?.trim() || "";

    if (provider.listingType === "travel_planner") {
      finalUnitPrice = Number(provider.travelPlanner?.priceFrom || 0);
      finalAmount = finalUnitPrice * numericPeopleCount;
      finalSelectedPackageTitle =
        finalSelectedPackageTitle ||
        provider.travelPlanner?.packageTitle ||
        provider.businessName;

      if (finalUnitPrice <= 0) {
        return res.status(400).json({
          message: "Travel package price is not configured properly.",
        });
      }
    }

    if (provider.listingType === "vehicle") {
      const matchedVehicle = (provider.vehicles || []).find(
        (vehicle) => String(vehicle._id) === String(selectedVehicleId)
      );

      if (!matchedVehicle) {
        return res.status(400).json({ message: "Please select a valid vehicle." });
      }

      finalUnitPrice = Number(matchedVehicle.price || 0);
      finalAmount = finalUnitPrice * numericDays;
      finalSelectedVehicleTitle =
        matchedVehicle.title || matchedVehicle.vehicleType || "";

      if (finalUnitPrice <= 0) {
        return res.status(400).json({
          message: "Selected vehicle price is not configured properly.",
        });
      }
    }

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: "Invalid booking amount." });
    }

    const amountInPaise = Math.round(finalAmount * 100);

    if (!amountInPaise || amountInPaise < 100) {
      return res.status(400).json({ message: "Final payable amount is invalid." });
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
      contactName: contactName.trim(),
      contactEmail: contactEmail?.trim() || "",
      contactPhone: contactPhone.trim(),
      destination: destination?.trim() || "",
      place: place?.trim() || "",
      bookingDate: parsedBookingDate,
      days: numericDays,
      peopleCount: numericPeopleCount,
      selectedVehicleId:
        provider.listingType === "vehicle" ? selectedVehicleId || null : null,
      selectedVehicleTitle:
        provider.listingType === "vehicle" ? finalSelectedVehicleTitle : "",
      selectedPackageTitle:
        provider.listingType === "travel_planner" ? finalSelectedPackageTitle : "",
      unitPrice: finalUnitPrice,
      pricingLabel: pricingLabel?.trim() || "",
      notes: notes?.trim() || "",
      amount: finalAmount,
      currency: "INR",
      paymentStatus: "created",
      bookingStatus: "pending",
      razorpayOrderId: order.id,
    });

    return res.json({
      message: "Booking order created successfully.",
      bookingId: booking._id,
      bookingRef: booking.bookingRef,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      finalAmount,
      finalUnitPrice,
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

    const hydrated = await hydrateBookingForDetails(booking._id);
    const emailTo = hydrated.contactEmail || hydrated.user?.email || "";

    try {
      await sendBookingEmail({
        to: emailTo,
        subject: `Booking Confirmed - ${hydrated.bookingRef}`,
        heading: "Booking Placed Successfully",
        subtext: "Your payment was received and your booking is confirmed.",
        booking: hydrated,
        provider: hydrated.provider,
      });
    } catch (mailError) {
      console.error("booking confirmation email error:", mailError.message);
    }

    return res.json({
      message: "Payment verified successfully.",
      bookingId: booking._id,
      bookingRef: booking.bookingRef,
    });
  } catch (error) {
    console.error("verifyBookingPayment error", error);
    return res.status(500).json({ message: "Failed to verify payment." });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("provider")
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
        canReview:
          booking.paymentStatus === "paid" &&
          booking.bookingStatus !== "cancelled",
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
      .populate("provider")
      .sort({ createdAt: -1 });

    return res.json({ bookings });
  } catch (error) {
    console.error("getProviderBookings error", error);
    return res.status(500).json({ message: "Failed to fetch provider bookings." });
  }
}

export async function getBookingById(req, res) {
  try {
    const booking = await hydrateBookingForDetails(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (!canAccessBooking(booking, req.user._id)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const reviews = await Review.find({
      provider: booking.provider?._id,
      user: booking.user?._id,
    }).lean();

    return res.json({
      booking: {
        ...booking,
        existingReview: reviews[0] || null,
      },
    });
  } catch (error) {
    console.error("getBookingById error", error);
    return res.status(500).json({ message: "Failed to fetch booking details." });
  }
}

export async function downloadInvoice(req, res) {
  try {
    const booking = await hydrateBookingForDetails(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (!canAccessBooking(booking, req.user._id)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const pdfBuffer = await generateInvoicePdfBuffer({
      booking,
      provider: booking.provider,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${booking.bookingRef}-invoice.pdf"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("downloadInvoice error", error);
    return res.status(500).json({ message: "Failed to generate invoice." });
  }
}

export async function updateBookingStatus(req, res) {
  try {
    const { bookingStatus, cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (String(booking.providerOwner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed." });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "This service is already cancelled." });
    }

    booking.bookingStatus = bookingStatus || booking.bookingStatus;

    if (bookingStatus === "cancelled") {
      booking.cancellationReason = (cancellationReason || "").trim();
    } else if (bookingStatus !== "cancelled") {
      booking.cancellationReason = "";
    }

    await booking.save();

    const hydrated = await hydrateBookingForDetails(booking._id);
    const emailTo = hydrated.contactEmail || hydrated.user?.email || "";

    if (bookingStatus === "completed") {
      try {
        await sendBookingEmail({
          to: emailTo,
          subject: `Booking Completed - ${hydrated.bookingRef}`,
          heading: "Booking Completed Successfully",
          subtext: "Your booked service has been marked as completed.",
          booking: hydrated,
          provider: hydrated.provider,
        });
      } catch (mailError) {
        console.error("completion email error:", mailError.message);
      }
    }

    if (bookingStatus === "cancelled") {
      try {
        await sendBookingEmail({
          to: emailTo,
          subject: `Booking Cancelled - ${hydrated.bookingRef}`,
          heading: "Booking Cancelled",
          subtext: "Your provider cancelled this booking. They will refund your money soon.",
          booking: hydrated,
          provider: hydrated.provider,
        });
      } catch (mailError) {
        console.error("cancellation email error:", mailError.message);
      }
    }

    return res.json({
      message:
        bookingStatus === "cancelled"
          ? "Service cancelled successfully."
          : "Booking status updated successfully.",
      booking: hydrated,
    });
  } catch (error) {
    console.error("updateBookingStatus error", error);
    return res.status(500).json({ message: "Failed to update booking status." });
  }
}