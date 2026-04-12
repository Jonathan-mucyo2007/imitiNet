import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
      index: true,
    },
    medicineVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicineVariant",
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Low Stock", "Out of Stock"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    priceRWF: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      default: "Shelf A1",
    },
  },
  {
    timestamps: true,
  }
);

// Multi-tenant performance index for FIFO queries and expiry alerts
inventorySchema.index({ pharmacyId: 1, medicineVariantId: 1, expiryDate: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
