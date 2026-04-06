import Subscriber from "../models/Subscriber.js";

export async function getSubscriberStatus(req, res) {
  try {
    const email = String(req.user?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Logged in user email not found.",
      });
    }

    const subscriber = await Subscriber.findOne({ email });

    return res.json({
      isSubscribed: !!subscriber?.isSubscribed,
      subscriber: subscriber
        ? {
            id: subscriber._id,
            name: subscriber.name || "",
            email: subscriber.email,
            isSubscribed: !!subscriber.isSubscribed,
            subscribedAt: subscriber.subscribedAt || null,
            unsubscribedAt: subscriber.unsubscribedAt || null,
          }
        : null,
    });
  } catch (error) {
    console.error("getSubscriberStatus error", error);
    return res.status(500).json({
      message: "Failed to load subscriber status.",
    });
  }
}

export async function subscribeUser(req, res) {
  try {
    const fallbackName = String(req.user?.name || "").trim();
    const fallbackEmail = String(req.user?.email || "")
      .trim()
      .toLowerCase();

    const name = String(req.body?.name || fallbackName).trim();
    const email = String(req.body?.email || fallbackEmail)
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    let subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      subscriber = await Subscriber.create({
        user: req.user?._id || null,
        name,
        email,
        isSubscribed: true,
        subscribedAt: new Date(),
        unsubscribedAt: null,
      });
    } else {
      subscriber.user = req.user?._id || subscriber.user || null;
      subscriber.name = name || subscriber.name || "";
      subscriber.email = email;
      subscriber.isSubscribed = true;
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = null;
      await subscriber.save();
    }

    return res.json({
      message: "Subscribed successfully.",
      subscriber: {
        id: subscriber._id,
        name: subscriber.name || "",
        email: subscriber.email,
        isSubscribed: !!subscriber.isSubscribed,
        subscribedAt: subscriber.subscribedAt || null,
        unsubscribedAt: subscriber.unsubscribedAt || null,
      },
    });
  } catch (error) {
    console.error("subscribeUser error", error);

    if (error?.code === 11000) {
      return res.status(400).json({
        message: "This email is already subscribed.",
      });
    }

    return res.status(500).json({
      message: "Failed to subscribe.",
    });
  }
}

export async function unsubscribeUser(req, res) {
  try {
    const fallbackEmail = String(req.user?.email || "")
      .trim()
      .toLowerCase();

    const email = String(req.body?.email || fallbackEmail)
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({
        message: "Subscriber not found.",
      });
    }

    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    return res.json({
      message: "Unsubscribed successfully.",
      subscriber: {
        id: subscriber._id,
        name: subscriber.name || "",
        email: subscriber.email,
        isSubscribed: !!subscriber.isSubscribed,
        subscribedAt: subscriber.subscribedAt || null,
        unsubscribedAt: subscriber.unsubscribedAt || null,
      },
    });
  } catch (error) {
    console.error("unsubscribeUser error", error);
    return res.status(500).json({
      message: "Failed to unsubscribe.",
    });
  }
}