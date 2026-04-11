import mongoose from "mongoose";

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
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
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

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
