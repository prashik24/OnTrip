import Subscriber from "../models/Subscriber.js";
import User from "../models/User.js";

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function toSubscriberResponse(subscriber, matchedUser = null) {
  return {
    id: subscriber._id,
    user: subscriber.user || matchedUser?._id || null,
    name: subscriber.name || matchedUser?.name || "",
    email: subscriber.email || "",
    isSubscribed: !!subscriber.isSubscribed,
    subscribedAt: subscriber.subscribedAt || null,
    unsubscribedAt: subscriber.unsubscribedAt || null,
    hasAccount: !!matchedUser,
    chatUser: matchedUser
      ? {
          id: matchedUser._id,
          name: matchedUser.name || "",
          email: matchedUser.email || "",
          avatar: matchedUser.avatar || "",
          city: matchedUser.city || "",
          role: matchedUser.role || "user",
          isOnline: !!matchedUser.isOnline,
          lastSeenAt: matchedUser.lastSeenAt || null,
        }
      : null,
  };
}

export async function getSubscriberStatus(req, res) {
  try {
    const email = normalizeEmail(req.user?.email);

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
    const fallbackEmail = normalizeEmail(req.user?.email);

    const name = String(req.body?.name || fallbackName).trim();
    const email = normalizeEmail(req.body?.email || fallbackEmail);

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
    const fallbackEmail = normalizeEmail(req.user?.email);
    const email = normalizeEmail(req.body?.email || fallbackEmail);

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

export async function getAllSubscribersForProvider(req, res) {
  try {
    if (req.user?.role !== "provider") {
      return res.status(403).json({
        message: "Only providers can view subscribers.",
      });
    }

    const subscribers = await Subscriber.find({
      isSubscribed: true,
    }).sort({ subscribedAt: -1, createdAt: -1 });

    const emails = subscribers.map((item) => normalizeEmail(item.email)).filter(Boolean);

    const users = await User.find({
      $or: [
        { _id: { $in: subscribers.map((item) => item.user).filter(Boolean) } },
        { email: { $in: emails } },
      ],
    }).select("name email avatar city role isOnline lastSeenAt");

    const userById = new Map(users.map((user) => [String(user._id), user]));
    const userByEmail = new Map(
      users.map((user) => [normalizeEmail(user.email), user])
    );

    const result = subscribers.map((subscriber) => {
      const matchedUser =
        userById.get(String(subscriber.user || "")) ||
        userByEmail.get(normalizeEmail(subscriber.email)) ||
        null;

      return toSubscriberResponse(subscriber, matchedUser);
    });

    return res.json({
      subscribers: result,
      total: result.length,
      selectableCount: result.filter((item) => item.hasAccount && item.chatUser?.id).length,
    });
  } catch (error) {
    console.error("getAllSubscribersForProvider error", error);
    return res.status(500).json({
      message: "Failed to load subscribers.",
    });
  }
}