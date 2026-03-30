import mongoose from "mongoose";

const deletedForSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: ["direct", "group", "broadcast"],
      default: "direct",
      index: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    groupName: {
      type: String,
      default: "",
      trim: true,
    },

    groupAvatar: {
      type: String,
      default: "",
      trim: true,
    },

    groupDescription: {
      type: String,
      default: "",
      trim: true,
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastMessageText: {
      type: String,
      default: "",
      trim: true,
    },

    lastMessageType: {
      type: String,
      enum: ["text", "image", "video", "file", "listing_card", "system"],
      default: "text",
    },

    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deletedFor: {
      type: [deletedForSchema],
      default: [],
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ conversationType: 1, lastMessageAt: -1 });

export default mongoose.model("Conversation", conversationSchema);