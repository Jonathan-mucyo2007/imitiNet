import mongoose from "mongoose";

const patientVerificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    hashedIdNumber: {
      type: String,
      required: true,
      index: true,
    },
    receptionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    facilityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    insuranceActiveSnapshot: {
      type: Boolean,
      default: false,
    },
    patientStatusSnapshot: {
      type: String,
      default: "unverified",
    },
    verificationSummary: {
      nidaStatus: { type: String, default: "pending" },
      rssbStatus: { type: String, default: "pending" },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

patientVerificationSchema.index({ facilityId: 1, verifiedAt: -1 });

const PatientVerification = mongoose.model(
  "PatientVerification",
  patientVerificationSchema
);

export default PatientVerification;
