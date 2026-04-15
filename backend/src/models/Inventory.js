import mongoose from "mongoose";

const LOW_STOCK_THRESHOLD = 20;

function deriveInventoryStatus({ quantity = 0, expiryDate }) {
  if (expiryDate && new Date(expiryDate) < new Date()) {
    return "Expired";
  }

  if (quantity <= 0) {
    return "Low_Stock";
  }

  if (quantity < LOW_STOCK_THRESHOLD) {
    return "Low_Stock";
  }

  return "Active";
}

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
      required: false,
      index: true,
      default: null,
    },
    nationalMedicineId: {
      type: String,
      required() {
        return this.isNew;
      },
      trim: true,
      index: true,
    },
    medicineName: {
      type: String,
      required() {
        return this.isNew;
      },
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    sku: {
      type: String,
      required() {
        return this.isNew;
      },
      trim: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Low Stock", "Out of Stock", "Expired"],
      default: "In Stock",
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Low_Stock"],
      default: "Active",
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
inventorySchema.index({ pharmacyId: 1, nationalMedicineId: 1, expiryDate: 1 });
inventorySchema.index({ pharmacyId: 1, sku: 1, batchNumber: 1 }, { unique: true });

inventorySchema.pre("validate", function syncInventoryFields(next) {
  if (!this.sku && this.medicineVariantId) {
    this.sku = String(this.medicineVariantId);
  }

  this.status = deriveInventoryStatus({
    quantity: this.quantity,
    expiryDate: this.expiryDate,
  });

  if (this.status === "Expired") {
    this.stockStatus = "Expired";
  } else if (this.quantity <= 0) {
    this.stockStatus = "Out of Stock";
  } else if (this.status === "Low_Stock") {
    this.stockStatus = "Low Stock";
  } else {
    this.stockStatus = "In Stock";
  }

  next();
});

inventorySchema.virtual("computedStatus").get(function computedStatus() {
  return deriveInventoryStatus({
    quantity: this.quantity,
    expiryDate: this.expiryDate,
  });
});

inventorySchema.virtual("unitPrice")
  .get(function getUnitPrice() {
    return this.priceRWF;
  })
  .set(function setUnitPrice(value) {
    this.priceRWF = value;
  });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
