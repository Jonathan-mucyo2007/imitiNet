import mongoose from "mongoose";

const insuranceProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    coveragePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    tier: {
      type: Number,
      required: true,
      default: 0, // 0 usually means N/A or default, 1-3 for RSSB Mutuelle categories
    },
  },
  { timestamps: true }
);

export default mongoose.model("InsuranceProvider", insuranceProviderSchema);