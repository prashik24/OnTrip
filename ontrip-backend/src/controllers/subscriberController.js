import Subscriber from "../models/Subscriber.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function subscribeEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        message: "Valid email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Subscriber.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.status === "active") {
        return res.json({ message: "Already subscribed" });
      }

      existing.status = "active";
      existing.subscribedAt = new Date();
      await existing.save();

      return res.json({ message: "Subscription reactivated" });
    }

    await Subscriber.create({ email: normalizedEmail });

    return res.status(201).json({
      message: "Subscribed successfully",
    });
  } catch (error) {
    console.error("subscribeEmail error:", error);
    return res.status(500).json({
      message: "Failed to subscribe",
    });
  }
}