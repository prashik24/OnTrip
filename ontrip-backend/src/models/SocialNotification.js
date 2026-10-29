import mongoose from "mongoose";

const socialNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["like_post", "comment_post", "reply_comment", "like_comment", "follow_user"],
      required: true,
      index: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialPost",
      default: null,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    replyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

socialNotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("SocialNotification", socialNotificationSchema);