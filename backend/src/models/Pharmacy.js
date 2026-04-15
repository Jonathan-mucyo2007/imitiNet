import mongoose from "mongoose";

const pharmacySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    facilityName: {
      type: String,
      trim: true,
      default() {
        return this.name || "";
      },
    },
    tinNumber: {
      type: String,
      trim: true,
      default: "",
    },
    contactPhone: {
      type: String,
      trim: true,
      default() {
        return this.contact || "";
      },
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    operatingHours: {
      type: String,
      trim: true,
      default: "Open daily, 07:00 - 22:00",
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    imageUrl: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=300&q=80",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    notificationPreferences: {
      emailOnClaimRejected: {
        type: Boolean,
        default: true,
      },
      emailOnAiFlagged: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

pharmacySchema.index({ location: "2dsphere" });

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);

export default Pharmacy;
