import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ provider: 1, user: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);