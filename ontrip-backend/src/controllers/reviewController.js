import Review from "../models/Review.js";
import Provider from "../models/Provider.js";

async function updateProviderRating(providerId) {
  const reviews = await Review.find({ provider: providerId });
  const count = reviews.length;
  const avg =
    count === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.rating, 0) / count;

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
      return res.status(404).json({ message: "Provider not found" });
    }

    const existing = await Review.findOne({
      provider: providerId,
      user: req.user._id,
    });

    if (existing) {
      existing.rating = rating;
      existing.comment = comment || "";
      await existing.save();
    } else {
      await Review.create({
        provider: providerId,
        user: req.user._id,
        rating,
        comment: comment || "",
      });
    }

    await updateProviderRating(providerId);

    return res.json({ message: "Review saved" });
  } catch (error) {
    console.error("addReview error", error);
    return res.status(500).json({ message: "Could not save review" });
  }
}

export async function getReviewsByProvider(req, res) {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.json({ reviews });
  } catch (error) {
    console.error("getReviewsByProvider error", error);
    return res.status(500).json({ message: "Could not fetch reviews" });
  }
}