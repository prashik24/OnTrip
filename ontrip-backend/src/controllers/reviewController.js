import { Readable } from "stream";
import Review from "../models/Review.js";
import Provider from "../models/Provider.js";
import Booking from "../models/Booking.js";
import cloudinary from "../config/cloudinary.js";

function uploadBufferToCloudinary(buffer, folder = "ontrip/reviews") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

async function uploadMany(files = []) {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer);
    uploaded.push({
      url: result.secure_url,
      publicId: result.public_id,
    });
  }

  return uploaded;
}

async function refreshProviderRating(providerId) {
  const reviews = await Review.find({ provider: providerId });
  const count = reviews.length;
  const avg =
    count === 0
      ? 0
      : reviews.reduce((sum, item) => sum + item.rating, 0) / count;

  await Provider.findByIdAndUpdate(providerId, {
    ratingAverage: Number(avg.toFixed(1)),
    ratingCount: count,
  });
}

function buildReviewPayload(review, currentUserId = null) {
  const helpfulCount = (review.votes || []).filter(
    (vote) => vote.voteType === "helpful"
  ).length;

  const notHelpfulCount = (review.votes || []).filter(
    (vote) => vote.voteType === "not_helpful"
  ).length;

  const currentUserVote =
    currentUserId && Array.isArray(review.votes)
      ? review.votes.find(
          (vote) => String(vote.user) === String(currentUserId)
        )?.voteType || ""
      : "";

  return {
    ...review.toObject ? review.toObject() : review,
    helpfulCount,
    notHelpfulCount,
    currentUserVote,
  };
}

export async function addReviewFromBooking(req, res) {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking id is required." });
    }

    if (!rating) {
      return res.status(400).json({ message: "Rating is required." });
    }

    const booking = await Booking.findById(bookingId).populate("provider");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You can review only your own booking.",
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(403).json({
        message: "Only paid bookings can be reviewed.",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(403).json({
        message: "Cancelled bookings cannot be reviewed.",
      });
    }

    const uploadedImages = await uploadMany(req.files || []);

    let review = await Review.findOne({
      provider: booking.provider._id || booking.provider,
      user: req.user._id,
    });

    if (review) {
      review.rating = Number(rating);
      review.comment = comment || "";
      review.booking = booking._id;

      if (uploadedImages.length > 0) {
        review.images = uploadedImages;
      }

      await review.save();
    } else {
      review = await Review.create({
        provider: booking.provider._id || booking.provider,
        booking: booking._id,
        user: req.user._id,
        rating: Number(rating),
        comment: comment || "",
        images: uploadedImages,
        votes: [],
      });
    }

    await refreshProviderRating(booking.provider._id || booking.provider);

    return res.json({
      message: "Review saved successfully.",
      review: buildReviewPayload(review, req.user._id),
    });
  } catch (error) {
    console.error("addReviewFromBooking error", error);
    return res.status(500).json({ message: "Failed to save review." });
  }
}

export async function voteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { voteType } = req.body;

    if (!["helpful", "not_helpful"].includes(voteType)) {
      return res.status(400).json({
        message: "Vote type must be helpful or not_helpful.",
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (String(review.user) === String(req.user._id)) {
      return res.status(403).json({
        message: "You cannot vote on your own review.",
      });
    }

    const existingVote = (review.votes || []).find(
      (vote) => String(vote.user) === String(req.user._id)
    );

    if (existingVote) {
      return res.status(400).json({
        message: "You have already voted on this review.",
      });
    }

    review.votes.push({
      user: req.user._id,
      voteType,
      votedAt: new Date(),
    });

    await review.save();

    return res.json({
      message:
        voteType === "helpful"
          ? "Marked as helpful."
          : "Marked as not helpful.",
      review: buildReviewPayload(review, req.user._id),
    });
  } catch (error) {
    console.error("voteReview error", error);
    return res.status(500).json({ message: "Failed to save review vote." });
  }
}

export async function getReviewsByProvider(req, res) {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    const hydratedReviews = reviews.map((review) =>
      buildReviewPayload(review, req.user?._id || null)
    );

    return res.json({ reviews: hydratedReviews });
  } catch (error) {
    console.error("getReviewsByProvider error", error);
    return res.status(500).json({ message: "Failed to fetch reviews." });
  }
}