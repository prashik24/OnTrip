import mongoose from "mongoose";

const providerBroadcastSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    recipientsCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProviderBroadcast", providerBroadcastSchema);