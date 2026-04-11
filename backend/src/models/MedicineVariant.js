import mongoose from "mongoose";

const medicineVariantSchema = new mongoose.Schema(
  {
    medicineGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineGroup",
      required: true,
      index: true,
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      required: true,
      trim: true,
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

medicineVariantSchema.index(
  { medicineGroupId: 1, dosage: 1, form: 1 },
  { unique: true }
);

const MedicineVariant = mongoose.model("MedicineVariant", medicineVariantSchema);

export default MedicineVariant;
