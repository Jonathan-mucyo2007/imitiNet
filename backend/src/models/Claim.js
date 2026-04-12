import mongoose from "mongoose";

const medicineSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Mirrors FHIR CodeableConcept 'display'
    category: { type: String, required: true },
    system: { type: String, default: "MoH-RW" }, // Mirrors FHIR CodeableConcept 'system'
    standardizedCode: { type: String, required: true }, // Mirrors FHIR CodeableConcept 'code'
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      required: true,
      index: true,
    },
    insuranceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InsuranceProvider",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    insurerName: {
      type: String,
      required: true,
      trim: true,
    },
    approvalTimeHours: {
      type: Number,
    },
    totalAmountRWF: {
      type: Number,
      required: true,
      min: 0,
    },
    coveredAmountRWF: {
      type: Number,
      required: true,
      min: 0,
    },
    patientPaysRWF: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentChannel: {
      type: String,
      enum: ["Bank Transfer", "MTN MoMo", "Airtel Money", "Internal Check"],
      default: "Bank Transfer",
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    medicineSnapshot: {
      type: [medicineSnapshotSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

claimSchema.index({ pharmacyId: 1, submittedAt: -1 });
claimSchema.index({ pharmacyId: 1, status: 1 });
claimSchema.index({ insuranceProviderId: 1, submittedAt: -1, status: 1 });

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
