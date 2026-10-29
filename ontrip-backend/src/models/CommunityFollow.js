import mongoose from "mongoose";

const communityFollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

communityFollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export default mongoose.model("CommunityFollow", communityFollowSchema);