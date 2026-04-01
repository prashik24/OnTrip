import mongoose from "mongoose";

const socialBookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialPost",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

socialBookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model("SocialBookmark", socialBookmarkSchema);