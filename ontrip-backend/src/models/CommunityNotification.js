import mongoose from "mongoose";

const communityNotificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "like_post",
        "comment_post",
        "reply_comment",
        "like_comment",
        "follow_user",
        "tag_post",
      ],
      required: true,
      index: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityPost",
      default: null,
    },

    commentId: {
      type: String,
      default: "",
    },

    replyId: {
      type: String,
      default: "",
    },

    text: {
      type: String,
      default: "",
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

communityNotificationSchema.index({ receiver: 1, createdAt: -1 });

export default mongoose.model("CommunityNotification", communityNotificationSchema);