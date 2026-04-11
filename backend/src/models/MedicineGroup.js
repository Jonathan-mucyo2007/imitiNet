import mongoose from "mongoose";

const medicineGroupSchema = new mongoose.Schema(
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
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

medicineGroupSchema.index({ genericName: "text", category: "text", description: "text" });
medicineGroupSchema.index({ genericName: 1, category: 1 }, { unique: true });

const MedicineGroup = mongoose.model("MedicineGroup", medicineGroupSchema);

export default MedicineGroup;
