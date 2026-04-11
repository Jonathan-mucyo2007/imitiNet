import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
      default: "Standard",
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ genericName: "text", category: "text" });

const Medicine = mongoose.model("Medicine", medicineSchema);

export default Medicine;
