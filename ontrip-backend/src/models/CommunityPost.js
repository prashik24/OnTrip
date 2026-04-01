import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      default: "",
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replies: {
      type: [replySchema],
      default: [],
    },
  },
  { timestamps: true }
);

const taggedUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nameSnapshot: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    postType: {
      type: String,
      enum: ["post", "question", "story", "provider_offer"],
      default: "post",
      index: true,
    },

    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000,
    },

    media: {
      type: [mediaSchema],
      default: [],
    },

    hashtags: {
      type: [String],
      default: [],
    },

    taggedUsers: {
      type: [taggedUserSchema],
      default: [],
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    comments: {
      type: [commentSchema],
      default: [],
    },

    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ author: 1, createdAt: -1 });
communityPostSchema.index({ hashtags: 1 });
communityPostSchema.index({ postType: 1, createdAt: -1 });

export default mongoose.model("CommunityPost", communityPostSchema);