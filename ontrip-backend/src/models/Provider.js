import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const providerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    providerCategory: {
      type: String,
      enum: ["vehicle", "service"],
      required: true,
      default: "vehicle",
    },

    vehicleTypes: [
      {
        type: String,
        enum: ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"],
      },
    ],

    serviceTitle: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    whatsapp: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    pricingText: {
      type: String,
      default: "",
      trim: true,
    },

    priceFrom: {
      type: Number,
      default: 0,
      min: 0,
    },

    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    withDriver: {
      type: Boolean,
      default: false,
    },

    deliveryAvailable: {
      type: Boolean,
      default: false,
    },

    images: [imageSchema],

    isActive: {
      type: Boolean,
      default: true,
    },

    ratingAverage: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);