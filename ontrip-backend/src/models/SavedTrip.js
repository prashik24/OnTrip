import mongoose from "mongoose";

const savedTripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    startCity: {
      type: String,
      default: "",
      trim: true,
    },
    days: {
      type: Number,
      default: 1,
    },
    budget: {
      type: Number,
      default: 0,
    },
    peopleCount: {
      type: Number,
      default: 1,
    },
    travelStyle: {
      type: String,
      default: "Balanced",
      trim: true,
    },
    tripData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SavedTrip", savedTripSchema);