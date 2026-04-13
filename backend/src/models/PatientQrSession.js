import mongoose from "mongoose";

const patientQrSessionSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    nationalId: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    consumedByReceptionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

patientQrSessionSchema.index({ patientId: 1, expiresAt: -1 });

const PatientQrSession = mongoose.model("PatientQrSession", patientQrSessionSchema);

export default PatientQrSession;
