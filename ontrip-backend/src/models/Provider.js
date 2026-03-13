import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const vehicleItemSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"],
      required: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    priceUnit: {
      type: String,
      enum: ["per_day", "per_hour", "fixed"],
      default: "per_day",
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    fuelType: {
      type: String,
      default: "",
      trim: true,
    },
    withDriver: {
      type: Boolean,
      default: false,
    },
    images: [imageSchema],
  },
  { _id: true }
);

const travelPlannerSchema = new mongoose.Schema(
  {
    plannerMode: {
      type: String,
      enum: [
        "customized_trip",
        "self_customized_places",
        "day_package",
        "multi_day_package",
        "group_trip",
      ],
      default: "customized_trip",
    },
    packageTitle: {
      type: String,
      default: "",
      trim: true,
    },
    durationText: {
      type: String,
      default: "",
      trim: true,
    },
    days: {
      type: Number,
      default: 1,
      min: 1,
    },
    priceFrom: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerPerson: {
      type: Number,
      default: 0,
      min: 0,
    },
    placesCovered: [{ type: String }],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    images: [imageSchema],
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

    listingType: {
      type: String,
      enum: ["vehicle", "travel_planner"],
      required: true,
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

    serviceImage: {
      type: imageSchema,
      default: null,
    },

    vehicles: [vehicleItemSchema],

    travelPlanner: {
      type: travelPlannerSchema,
      default: () => ({}),
    },

    ratingAverage: {
      type: Number,
      default: 0,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);
