import mongoose from "mongoose";

const socialProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },

    displayName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    postsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

socialProfileSchema.index({ username: 1 });
socialProfileSchema.index({ user: 1 });

export default mongoose.model("SocialProfile", socialProfileSchema);