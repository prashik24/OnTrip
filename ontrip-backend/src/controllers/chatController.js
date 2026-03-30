import mongoose from "mongoose";
import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
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
  if (message.messageType === "file") return "📎 File";
  if (message.messageType === "listing_card") return "📌 Listing";
  if (message.messageType === "system") return message.text || "System update";
  return "";
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

async function findDirectConversationBetweenUsers(userA, userB) {
  return Conversation.findOne({
    conversationType: "direct",
    participants: { $all: [userA, userB], $size: 2 },
  });
}

function isDeletedForUser(doc, userId) {
  return (doc.deletedFor || []).some(
    (entry) => String(entry.user) === String(userId)
  );
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
    conversation.conversationType === "direct"
      ? participants.find((p) => String(p.id) !== String(meId)) || null
      : null;

  return {
    id: conversation._id,
    conversationType: conversation.conversationType,
    participants,
    otherUser,
    groupName: conversation.groupName || "",
    groupAvatar: conversation.groupAvatar || "",
    groupDescription: conversation.groupDescription || "",
    admins: conversation.admins || [],
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
    listingCard: message.listingCard || {},
    replyTo: message.replyTo || {},
    seenBy: message.seenBy || [],
    editedAt: message.editedAt || null,
    isEdited: !!message.isEdited,
    forwardedFrom: message.forwardedFrom || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function refreshConversationPreview(conversationId) {
  const latestVisibleMessage = await Message.findOne({
    conversation: conversationId,
  }).sort({ createdAt: -1 });

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;

  if (!latestVisibleMessage) {
    conversation.lastMessageText = "";
    conversation.lastMessageType = "text";
    conversation.lastMessageAt = null;
    conversation.lastMessageSender = null;
  } else {
    conversation.lastMessageText = getMessagePreview(latestVisibleMessage);
    conversation.lastMessageType = latestVisibleMessage.messageType;
    conversation.lastMessageAt = latestVisibleMessage.createdAt;
    conversation.lastMessageSender = latestVisibleMessage.sender;
  }

  await conversation.save();
  return conversation;
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
      conversationType: "direct",
      lastMessageAt: { $ne: null },
    }).select("participants lastMessageAt");

    const conversationMap = new Map();

    for (const c of myConversations) {
      const otherId = c.participants.find((id) => String(id) !== String(meId));
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
      $or: [
        { conversationType: "group" },
        { conversationType: "broadcast" },
        {
          conversationType: "direct",
          lastMessageAt: { $ne: null },
        },
      ],
    })
      .populate("participants", "name email avatar city role isOnline lastSeenAt")
      .sort({ updatedAt: -1, lastMessageAt: -1 });

    const visible = conversations.filter((item) => !isDeletedForUser(item, meId));

    return res.json({
      conversations: visible.map((item) => normalizeConversation(item, meId)),
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

    let conversation = await findDirectConversationBetweenUsers(meId, userId);

    if (!conversation) {
      conversation = await Conversation.create({
        conversationType: "direct",
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

export async function createGroupConversation(req, res) {
  try {
    const meId = String(req.user._id);
    const { groupName, participantIds = [], groupDescription = "" } = req.body;

    const cleanIds = [...new Set([meId, ...participantIds])].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (cleanIds.length < 2) {
      return res.status(400).json({ message: "Group must have at least 2 members" });
    }

    if (!groupName?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const conversation = await Conversation.create({
      conversationType: "group",
      participants: cleanIds,
      admins: [meId],
      groupName: groupName.trim(),
      groupDescription: groupDescription.trim(),
      createdBy: meId,
    });

    const populated = await Conversation.findById(conversation._id).populate(
      "participants",
      "name email avatar city role isOnline lastSeenAt"
    );

    return res.status(201).json({
      message: "Group created",
      conversation: normalizeConversation(populated, meId),
    });
  } catch (error) {
    console.error("createGroupConversation error", error);
    return res.status(500).json({ message: "Failed to create group" });
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

    const messages = await Message.find({
      conversation: conversationId,
      "deletedFor.user": { $ne: meId },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const total = await Message.countDocuments({
      conversation: conversationId,
      "deletedFor.user": { $ne: meId },
    });

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
    const {
      conversationId,
      receiverId,
      text,
      replyToMessageId,
      messageType: manualMessageType,
    } = req.body;

    const file = req.file || null;
    const cleanText = String(text || "").trim();

    if (!cleanText && !file && manualMessageType !== "listing_card") {
      return res.status(400).json({ message: "Message text or file is required" });
    }

    let conversation = null;
    let otherUserId = receiverId;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Valid conversationId is required" });
    }

    conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.some((id) => String(id) === meId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (conversation.conversationType === "direct") {
      otherUserId = conversation.participants.find((id) => String(id) !== meId);
      otherUserId = otherUserId ? String(otherUserId) : null;
    } else {
      otherUserId = null;
    }

    let messageType = "text";
    let media = {};
    let listingCard = {};

    if (manualMessageType === "listing_card") {
      messageType = "listing_card";
      listingCard = req.body.listingCard ? JSON.parse(req.body.listingCard) : {};
    } else if (file) {
      const upload = await uploadBufferToCloudinary(file.buffer, file, "ontrip/chat");
      messageType = getMessageTypeFromMime(file.mimetype);
      media = {
        url: upload.secure_url,
        publicId: upload.public_id,
        originalName: file.originalname || "",
        mimeType: file.mimetype || "",
        size: file.size || 0,
      };
    }

    let replyTo = {};
    if (replyToMessageId && mongoose.Types.ObjectId.isValid(replyToMessageId)) {
      const originalMessage = await Message.findById(replyToMessageId).populate(
        "sender",
        "name avatar"
      );

      if (originalMessage) {
        replyTo = {
          messageId: originalMessage._id,
          senderId: originalMessage.sender?._id || null,
          text:
            originalMessage.text ||
            getMessagePreview(originalMessage) ||
            "Message",
          messageType: originalMessage.messageType,
        };
      }
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: meId,
      receiver: otherUserId,
      text: cleanText,
      messageType,
      media,
      listingCard,
      replyTo,
      seenBy: [meId],
    });

    await refreshConversationPreview(conversation._id);

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const populatedConversation = await Conversation.findById(conversation._id).populate(
      "participants",
      "name email avatar city role isOnline lastSeenAt"
    );

    const messagePayload = normalizeMessage(populatedMessage);
    const conversationPayload = normalizeConversation(populatedConversation, meId);

    const io = req.app.get("io");

    for (const participantId of conversation.participants) {
      io.to(`user:${participantId}`).emit("message:new", {
        conversation: normalizeConversation(populatedConversation, participantId),
        message: messagePayload,
      });
    }

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

export async function editMessage(req, res) {
  try {
    const meId = String(req.user._id);
    const { messageId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(message.sender) !== meId) {
      return res.status(403).json({ message: "You can edit only your own message" });
    }

    if (message.messageType !== "text") {
      return res.status(400).json({ message: "Only text messages can be edited" });
    }

    message.text = String(text || "").trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await refreshConversationPreview(message.conversation);

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const io = req.app.get("io");
    io.to(`conversation:${message.conversation}`).emit("message:updated", {
      message: normalizeMessage(populatedMessage),
    });

    return res.json({
      message: "Message updated",
      data: normalizeMessage(populatedMessage),
    });
  } catch (error) {
    console.error("editMessage error", error);
    return res.status(500).json({ message: "Failed to edit message" });
  }
}

export async function deleteMessageForMe(req, res) {
  try {
    const meId = String(req.user._id);
    const { messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.deletedFor.some((entry) => String(entry.user) === meId)) {
      message.deletedFor.push({
        user: meId,
        deletedAt: new Date(),
      });
      await message.save();
    }

    return res.json({ message: "Message deleted for you" });
  } catch (error) {
    console.error("deleteMessageForMe error", error);
    return res.status(500).json({ message: "Failed to delete message" });
  }
}

export async function forwardMessage(req, res) {
  try {
    const meId = String(req.user._id);
    const { messageId } = req.params;
    const { targetConversationId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(messageId) ||
      !mongoose.Types.ObjectId.isValid(targetConversationId)
    ) {
      return res.status(400).json({ message: "Invalid ids" });
    }

    const original = await Message.findById(messageId);
    const targetConversation = await Conversation.findById(targetConversationId);

    if (!original || !targetConversation) {
      return res.status(404).json({ message: "Message or conversation not found" });
    }

    if (!targetConversation.participants.some((id) => String(id) === meId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    let receiverId = null;
    if (targetConversation.conversationType === "direct") {
      receiverId = targetConversation.participants.find((id) => String(id) !== meId);
    }

    const forwarded = await Message.create({
      conversation: targetConversation._id,
      sender: meId,
      receiver: receiverId || null,
      text: original.text || "",
      messageType: original.messageType,
      media: original.media || {},
      listingCard: original.listingCard || {},
      replyTo: {},
      seenBy: [meId],
      forwardedFrom: original._id,
    });

    await refreshConversationPreview(targetConversation._id);

    const populatedMessage = await Message.findById(forwarded._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const populatedConversation = await Conversation.findById(targetConversation._id).populate(
      "participants",
      "name email avatar city role isOnline lastSeenAt"
    );

    const io = req.app.get("io");
    for (const participantId of targetConversation.participants) {
      io.to(`user:${participantId}`).emit("message:new", {
        conversation: normalizeConversation(populatedConversation, participantId),
        message: normalizeMessage(populatedMessage),
      });
    }

    return res.json({
      message: "Message forwarded",
      data: normalizeMessage(populatedMessage),
    });
  } catch (error) {
    console.error("forwardMessage error", error);
    return res.status(500).json({ message: "Failed to forward message" });
  }
}

export async function clearConversationForMe(req, res) {
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

    const alreadyDeleted = conversation.deletedFor.some(
      (entry) => String(entry.user) === meId
    );

    if (!alreadyDeleted) {
      conversation.deletedFor.push({
        user: meId,
        deletedAt: new Date(),
      });
      await conversation.save();
    }

    return res.json({ message: "Conversation cleared for you" });
  } catch (error) {
    console.error("clearConversationForMe error", error);
    return res.status(500).json({ message: "Failed to clear conversation" });
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
        sender: { $ne: meId },
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

export async function sendProviderListingCard(req, res) {
  try {
    const meId = String(req.user._id);
    const { conversationId, providerId, planIndex = 0, vehicleIndex = 0 } = req.body;

    const conversation = await Conversation.findById(conversationId);
    const provider = await Provider.findById(providerId);

    if (!conversation || !provider) {
      return res.status(404).json({ message: "Conversation or provider not found" });
    }

    if (String(provider.owner) !== meId) {
      return res.status(403).json({ message: "Only provider owner can send listing card" });
    }

    let listingCard = {};

    if (provider.listingType === "travel_planner") {
      const trip = provider.travelPlans?.[planIndex] || provider.travelPlanner || {};
      listingCard = {
        providerId: provider._id,
        listingType: "travel_planner",
        title: trip.packageTitle || provider.businessName,
        subtitle: trip.durationText || provider.city || "",
        priceText: `₹${trip.priceFrom || 0}`,
        imageUrl: trip.images?.[0]?.url || provider.serviceImage?.url || "",
        targetUrl: `/providers/${provider._id}`,
      };
    } else {
      const vehicle = provider.vehicles?.[vehicleIndex] || {};
      listingCard = {
        providerId: provider._id,
        listingType: "vehicle",
        title: vehicle.title || provider.businessName,
        subtitle: vehicle.vehicleType || provider.city || "",
        priceText: `₹${vehicle.price || 0}`,
        imageUrl: vehicle.images?.[0]?.url || provider.serviceImage?.url || "",
        targetUrl: `/providers/${provider._id}`,
      };
    }

    req.body.messageType = "listing_card";
    req.body.listingCard = JSON.stringify(listingCard);

    return sendMessage(req, res);
  } catch (error) {
    console.error("sendProviderListingCard error", error);
    return res.status(500).json({ message: "Failed to send listing card" });
  }
}

export async function broadcastProviderUpdate(req, res) {
  try {
    const meId = String(req.user._id);
    const { providerId, text } = req.body;

    const provider = await Provider.findById(providerId);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (String(provider.owner) !== meId) {
      return res.status(403).json({ message: "Only provider owner can broadcast updates" });
    }

    const targetConversations = await Conversation.find({
      conversationType: "direct",
      participants: meId,
      lastMessageAt: { $ne: null },
    });

    const io = req.app.get("io");

    for (const conversation of targetConversations) {
      const receiverId = conversation.participants.find((id) => String(id) !== meId);

      const message = await Message.create({
        conversation: conversation._id,
        sender: meId,
        receiver: receiverId || null,
        text: String(text || "").trim(),
        messageType: "system",
        seenBy: [meId],
      });

      await refreshConversationPreview(conversation._id);

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name email avatar")
        .populate("receiver", "name email avatar");

      const populatedConversation = await Conversation.findById(conversation._id).populate(
        "participants",
        "name email avatar city role isOnline lastSeenAt"
      );

      for (const participantId of conversation.participants) {
        io.to(`user:${participantId}`).emit("message:new", {
          conversation: normalizeConversation(populatedConversation, participantId),
          message: normalizeMessage(populatedMessage),
        });
      }
    }

    return res.json({ message: "Broadcast sent successfully" });
  } catch (error) {
    console.error("broadcastProviderUpdate error", error);
    return res.status(500).json({ message: "Failed to send broadcast" });
  }
}