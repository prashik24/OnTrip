import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true,
    },

    providerOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    serviceType: {
      type: String,
      enum: ["vehicle", "travel_planner"],
      required: true,
    },

    serviceTitle: {
      type: String,
      default: "",
      trim: true,
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
    },

    contactEmail: {
      type: String,
      default: "",
      trim: true,
    },

    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      default: "",
      trim: true,
    },

    place: {
      type: String,
      default: "",
      trim: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    days: {
      type: Number,
      default: 1,
      min: 1,
    },

    peopleCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    selectedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    selectedVehicleTitle: {
      type: String,
      default: "",
      trim: true,
    },

    selectedPackageTitle: {
      type: String,
      default: "",
      trim: true,
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    pricingLabel: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    razorpayOrderId: {
      type: String,
      default: "",
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySignature: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);