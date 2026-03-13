import Review from "../models/Review.js";
import Provider from "../models/Provider.js";

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

export async function addReview(req, res) {
  try {
    const { providerId, rating, comment } = req.body;

    const provider = await Provider.findById(providerId);

    if (!provider) {
      return res.status(404).json({ message: "Provider listing not found." });
    }

    if (String(provider.owner) === String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "You cannot review your own product or service." });
    }

    let review = await Review.findOne({
      provider: providerId,
      user: req.user._id,
    });

    if (review) {
      review.rating = Number(rating);
      review.comment = comment || "";
      await review.save();
    } else {
      review = await Review.create({
        provider: providerId,
        user: req.user._id,
        rating: Number(rating),
        comment: comment || "",
      });
    }

    await refreshProviderRating(providerId);

    return res.json({ message: "Review saved successfully.", review });
  } catch (error) {
    console.error("addReview error", error);
    return res.status(500).json({ message: "Failed to save review." });
  }
}

export async function getReviewsByProvider(req, res) {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    return res.json({ reviews });
  } catch (error) {
    console.error("getReviewsByProvider error", error);
    return res.status(500).json({ message: "Failed to fetch reviews." });
  }
}