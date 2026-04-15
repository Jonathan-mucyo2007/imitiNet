/**
 * One-time inventory catalog field migration.
 *
 * Run from the backend directory:
 * `node src/scripts/migrateInventoryCatalogFields.js`
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import MedicineVariant from "../models/MedicineVariant.js";
import MedicineGroup from "../models/MedicineGroup.js";
import {
  buildInventoryMedicineName,
  buildNationalMedicineId,
} from "../utils/nationalMedicineCatalog.js";

dotenv.config({ path: "./.env" });

async function migrateInventoryCatalogFields() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for inventory catalog migration");

    const inventoryItems = await InventoryItem.find({
      $or: [
        { medicineName: { $exists: false } },
        { medicineName: null },
        { medicineName: "" },
        { nationalMedicineId: { $exists: false } },
        { nationalMedicineId: null },
        { nationalMedicineId: "" },
      ],
    })
      .select("_id medicineVariantId sku medicineName nationalMedicineId")
      .lean();

    if (!inventoryItems.length) {
      console.log("No legacy inventory rows needed catalog-field migration.");
      return;
    }

    const variantIds = inventoryItems
      .map((item) => item.medicineVariantId)
      .filter(Boolean);

    const variants = await MedicineVariant.find({ _id: { $in: variantIds } })
      .select("medicineGroupId sku dosage form")
      .lean();
    const groups = await MedicineGroup.find({
      _id: { $in: variants.map((variant) => variant.medicineGroupId) },
    })
      .select("genericName")
      .lean();

    const variantById = new Map(variants.map((variant) => [String(variant._id), variant]));
    const groupById = new Map(groups.map((group) => [String(group._id), group]));

    const bulkOps = inventoryItems.flatMap((item) => {
      const variant = item.medicineVariantId ? variantById.get(String(item.medicineVariantId)) : null;
      const group = variant ? groupById.get(String(variant.medicineGroupId)) : null;

      const medicineName =
        item.medicineName ||
        buildInventoryMedicineName({
          genericName: group?.genericName || item.sku || "Unknown Medicine",
          dosage: variant?.dosage || "",
          form: variant?.form || "",
        });
      const nationalMedicineId =
        item.nationalMedicineId ||
        buildNationalMedicineId({
          genericName: group?.genericName || item.sku || "Unknown Medicine",
          sku: item.sku || variant?.sku,
        });

      return [
        {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                medicineName,
                nationalMedicineId,
              },
            },
          },
        },
      ];
    });

    const result = await InventoryItem.bulkWrite(bulkOps);
    console.log(
      `Inventory catalog migration complete. Updated ${result.modifiedCount} legacy inventory rows.`
    );
  } catch (error) {
    console.error("Inventory catalog migration failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

migrateInventoryCatalogFields();
