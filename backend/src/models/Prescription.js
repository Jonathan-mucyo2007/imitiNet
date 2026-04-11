import mongoose from "mongoose";

const prescriptionMedicationSchema = new mongoose.Schema(
  {
    medicineVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineVariant",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prescribingDoctor: {
      type: String,
      required: true,
      trim: true,
    },
    medications: {
      type: [prescriptionMedicationSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "Prescription must include at least one medication.",
      },
    },
    originatingEmr: {
      type: String,
      enum: ["eUbuzima", "OpenClinic"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Fulfilled"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;
