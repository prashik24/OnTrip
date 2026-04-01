import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
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
  },
  { _id: false }
);

const pollOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: false }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    authorRoleSnapshot: {
      type: String,
      enum: ["user", "provider", "admin"],
      default: "user",
    },

    postType: {
      type: String,
      enum: ["post", "question", "provider_offer", "trip_story", "poll"],
      default: "post",
      index: true,
    },

    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    images: {
      type: [imageSchema],
      default: [],
    },

    locationText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    tags: {
      type: [String],
      default: [],
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      default: null,
      index: true,
    },

    linkedListingType: {
      type: String,
      enum: ["", "vehicle", "travel_planner"],
      default: "",
    },

    linkedListingTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },

    linkedListingPriceText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },

    linkedListingImage: {
      type: String,
      default: "",
      trim: true,
    },

    pollOptions: {
      type: [pollOptionSchema],
      default: [],
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    saves: [
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

    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    city: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ postType: 1, createdAt: -1 });
communityPostSchema.index({ city: 1, createdAt: -1 });
communityPostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("CommunityPost", communityPostSchema);