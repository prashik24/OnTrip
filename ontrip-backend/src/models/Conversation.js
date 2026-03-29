import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessageText: {
      type: String,
      default: "",
      trim: true,
    },

    lastMessageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
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
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", conversationSchema);