import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    providerType: {
      type: String,
      enum: ["vehicle", "tour"],
      required: true,
    },

    // common
    businessName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },

    // vehicle
    vehicleType: {
      type: String,
      enum: ["bus", "jeep", "car", "bike", "scooty", "cycle", ""],
      default: "",
    },
    capacity: { type: Number, default: 1 },
    fuelType: { type: String, default: "" },
    withDriver: { type: Boolean, default: false },

    // tour
    tripMode: {
      type: String,
      enum: ["own_trip", "without_car", "customized_trip", ""],
      default: "",
    },
    durationText: { type: String, default: "" },
    includes: [{ type: String }],

    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);