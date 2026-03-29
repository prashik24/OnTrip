import mongoose from "mongoose";
import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

function publicChatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
    city: user.city || "",
    role: user.role,
    isOnline: !!user.isOnline,
    lastSeenAt: user.lastSeenAt || null,
  };
}

function getMessagePreview(message) {
  if (!message) return "";
  if (message.messageType === "text") return message.text || "";
  if (message.messageType === "image") return "📷 Image";
  if (message.messageType === "video") return "🎥 Video";
  return "📎 File";
}

function getMessageTypeFromMime(mime = "") {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

function uploadBufferToCloudinary(buffer, file, folder = "ontrip/chat") {
  return new Promise((resolve, reject) => {
    const mime = file?.mimetype || "";
    const resourceType = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
      ? "video"
      : "raw";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

async function findConversationBetweenUsers(userA, userB) {
  return Conversation.findOne({
    participants: { $all: [userA, userB], $size: 2 },
  });
}

function normalizeConversation(conversation, meId) {
  const participants = (conversation.participants || []).map((p) => ({
    id: p._id,
    name: p.name,
    email: p.email,
    avatar: p.avatar || "",
    city: p.city || "",
    role: p.role,
    isOnline: !!p.isOnline,
    lastSeenAt: p.lastSeenAt || null,
  }));

  const otherUser =
    participants.find((p) => String(p.id) !== String(meId)) || null;

  return {
    id: conversation._id,
    participants,
    otherUser,
    lastMessageText: conversation.lastMessageText || "",
    lastMessageType: conversation.lastMessageType || "text",
    lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
    lastMessageSender: conversation.lastMessageSender || null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function normalizeMessage(message) {
  return {
    id: message._id,
    conversation: message.conversation,
    sender: message.sender,
    receiver: message.receiver,
    text: message.text || "",
    messageType: message.messageType,
    media: message.media || {},
    seenBy: message.seenBy || [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

export async function getChatUsers(req, res) {
  try {
    const meId = req.user._id;
    const q = String(req.query.q || "").trim();

    const filter = {
      _id: { $ne: meId },
    };

    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { city: new RegExp(q, "i") },
      ];
    }

    const users = await User.find(filter)
      .select("name email avatar city role isOnline lastSeenAt")
      .sort({ isOnline: -1, name: 1 });

    const myConversations = await Conversation.find({
      participants: meId,
    }).select("participants lastMessageAt");

    const conversationMap = new Map();

    for (const c of myConversations) {
      const otherId = c.participants.find(
        (id) => String(id) !== String(meId)
      );
      if (otherId) {
        conversationMap.set(String(otherId), String(c._id));
      }
    }

    return res.json({
      users: users.map((user) => ({
        ...publicChatUser(user),
        conversationId: conversationMap.get(String(user._id)) || null,
      })),
    });
  } catch (error) {
    console.error("getChatUsers error", error);
    return res.status(500).json({ message: "Failed to load users" });
  }
}

export async function getMyConversations(req, res) {
  try {
    const meId = req.user._id;

    const conversations = await Conversation.find({
      participants: meId,
    })
      .populate(
        "participants",
        "name email avatar city role isOnline lastSeenAt"
      )
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    return res.json({
      conversations: conversations.map((item) =>
        normalizeConversation(item, meId)
      ),
    });
  } catch (error) {
    console.error("getMyConversations error", error);
    return res.status(500).json({ message: "Failed to load conversations" });
  }
}

export async function getOrCreateConversation(req, res) {
  try {
    const meId = String(req.user._id);
    const { userId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid userId is required" });
    }

    if (String(userId) === meId) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    const otherUser = await User.findById(userId).select(
      "name email avatar city role isOnline lastSeenAt"
    );

    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let conversation = await findConversationBetweenUsers(meId, userId);

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [meId, userId],
        createdBy: meId,
        lastMessageAt: null,
      });
    }

    const populated = await Conversation.findById(conversation._id).populate(
      "participants",
      "name email avatar city role isOnline lastSeenAt"
    );

    return res.json({
      conversation: normalizeConversation(populated, meId),
    });
  } catch (error) {
    console.error("getOrCreateConversation error", error);
    return res.status(500).json({ message: "Failed to open conversation" });
  }
}

export async function getConversationMessages(req, res) {
  try {
    const meId = String(req.user._id);
    const { conversationId } = req.params;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((id) => String(id) === meId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const total = await Message.countDocuments({ conversation: conversationId });

    return res.json({
      messages: messages.reverse().map(normalizeMessage),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getConversationMessages error", error);
    return res.status(500).json({ message: "Failed to load messages" });
  }
}

export async function sendMessage(req, res) {
  try {
    const meId = String(req.user._id);
    const { conversationId, receiverId } = req.body;
    const text = String(req.body.text || "").trim();
    const file = req.file || null;

    if (!text && !file) {
      return res.status(400).json({ message: "Message text or file is required" });
    }

    let conversation = null;
    let otherUserId = receiverId;

    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }

      conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (!conversation.participants.some((id) => String(id) === meId)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      otherUserId = conversation.participants.find(
        (id) => String(id) !== meId
      );
      otherUserId = String(otherUserId);
    } else {
      if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
        return res.status(400).json({ message: "Valid receiverId is required" });
      }

      if (String(otherUserId) === meId) {
        return res.status(400).json({ message: "You cannot chat with yourself" });
      }

      const receiverUser = await User.findById(otherUserId).select("_id");
      if (!receiverUser) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      conversation = await findConversationBetweenUsers(meId, otherUserId);

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [meId, otherUserId],
          createdBy: meId,
        });
      }
    }

    let messageType = "text";
    let media = {};

    if (file) {
      const upload = await uploadBufferToCloudinary(
        file.buffer,
        file,
        "ontrip/chat"
      );

      messageType = getMessageTypeFromMime(file.mimetype);
      media = {
        url: upload.secure_url,
        publicId: upload.public_id,
        originalName: file.originalname || "",
        mimeType: file.mimetype || "",
        size: file.size || 0,
      };
    }

    if (!file && text) {
      messageType = "text";
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: meId,
      receiver: otherUserId,
      text,
      messageType,
      media,
      seenBy: [meId],
    });

    conversation.lastMessageText = getMessagePreview(message);
    conversation.lastMessageType = messageType;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessageSender = meId;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate(
        "participants",
        "name email avatar city role isOnline lastSeenAt"
      );

    const messagePayload = normalizeMessage(populatedMessage);
    const conversationPayload = normalizeConversation(populatedConversation, meId);

    const io = req.app.get("io");

    io.to(`user:${meId}`).emit("message:new", {
      conversation: conversationPayload,
      message: messagePayload,
    });

    io.to(`user:${otherUserId}`).emit("message:new", {
      conversation: normalizeConversation(populatedConversation, otherUserId),
      message: messagePayload,
    });

    io.to(`conversation:${conversation._id}`).emit("conversation:updated", {
      conversationId: String(conversation._id),
      lastMessageText: conversation.lastMessageText,
      lastMessageType: conversation.lastMessageType,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageSender: conversation.lastMessageSender,
    });

    return res.status(201).json({
      message: "Message sent",
      conversation: conversationPayload,
      data: messagePayload,
    });
  } catch (error) {
    console.error("sendMessage error", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
}

export async function markConversationSeen(req, res) {
  try {
    const meId = String(req.user._id);
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation id" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((id) => String(id) === meId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: meId,
        seenBy: { $ne: meId },
      },
      {
        $addToSet: { seenBy: meId },
      }
    );

    const io = req.app.get("io");

    io.to(`conversation:${conversationId}`).emit("conversation:seen", {
      conversationId,
      seenByUserId: meId,
    });

    return res.json({ message: "Conversation marked as seen" });
  } catch (error) {
    console.error("markConversationSeen error", error);
    return res.status(500).json({ message: "Failed to mark messages as seen" });
  }
}