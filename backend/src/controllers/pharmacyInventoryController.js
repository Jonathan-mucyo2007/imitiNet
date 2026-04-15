import mongoose from "mongoose";
import InventoryItem from "../models/InventoryItem.js";
import MedicineGroup from "../models/MedicineGroup.js";
import MedicineVariant from "../models/MedicineVariant.js";
import User from "../models/User.js";
import traceabilityGateway from "../services/traceabilityGatewaySync.js";
import {
  buildInventoryMedicineName,
  buildNationalMedicineId,
} from "../utils/nationalMedicineCatalog.js";

const LOW_STOCK_THRESHOLD = 20;
const EXPIRY_ALERT_WINDOW_DAYS = 90;

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStatusMatch(stockLevel) {
  const now = new Date();

  if (stockLevel === "Expired") {
    return { expiryDate: { $lt: now } };
  }

  if (stockLevel === "Low_Stock") {
    return {
      expiryDate: { $gte: now },
      quantity: { $lt: LOW_STOCK_THRESHOLD },
    };
  }

  if (stockLevel === "Active") {
    return {
      expiryDate: { $gte: now },
      quantity: { $gte: LOW_STOCK_THRESHOLD },
    };
  }

  return {};
}

async function resolvePharmacyProfileId(userId) {
  const user = await User.findById(userId).select("role pharmacyProfileId");

  if (!user || user.role !== "pharmacy" || !user.pharmacyProfileId) {
    return { error: { status: 403, message: "Only pharmacies can access inventory." } };
  }

  return { pharmacyProfileId: user.pharmacyProfileId };
}

async function buildCatalogEntries(search = "") {
  const regex = search ? new RegExp(escapeRegex(search), "i") : null;
  const groupMatch = regex
    ? {
        $or: [
          { genericName: regex },
          { category: regex },
          { description: regex },
        ],
      }
    : {};

  const groups = await MedicineGroup.find(groupMatch)
    .sort({ genericName: 1 })
    .limit(12)
    .lean();

  if (!groups.length) {
    return [];
  }

  const variants = await MedicineVariant.find({
    medicineGroupId: { $in: groups.map((group) => group._id) },
  })
    .sort({ dosage: 1, form: 1 })
    .lean();

  const groupById = new Map(groups.map((group) => [String(group._id), group]));

  return variants.map((variant) => {
    const group = groupById.get(String(variant.medicineGroupId));
    const medicineName = group?.genericName || variant.sku;
    return {
      id: variant._id,
      nationalMedicineId: buildNationalMedicineId({
        genericName: medicineName,
        sku: variant.sku,
      }),
      medicineVariantId: variant._id,
      medicineName,
      category: group?.category || "General",
      sku: variant.sku,
      dosage: variant.dosage,
      form: variant.form,
      basePrice: variant.basePrice,
      displayName: buildInventoryMedicineName({
        genericName: medicineName,
        dosage: variant.dosage,
        form: variant.form,
      }),
    };
  });
}

export async function getInventoryKpis(req, res) {
  try {
    const resolved = await resolvePharmacyProfileId(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const pharmacyId = new mongoose.Types.ObjectId(resolved.pharmacyProfileId);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + EXPIRY_ALERT_WINDOW_DAYS);

    const [result] = await InventoryItem.aggregate([
      { $match: { pharmacyId } },
      {
        $group: {
          _id: null,
          skuSet: { $addToSet: "$sku" },
          totalStockValue: { $sum: { $multiply: ["$quantity", "$priceRWF"] } },
          lowStockAlerts: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $lt: ["$quantity", LOW_STOCK_THRESHOLD] },
                    {
                      $and: [
                        { $gte: ["$expiryDate", new Date()] },
                        { $lte: ["$expiryDate", ninetyDaysFromNow] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSKUs: { $size: "$skuSet" },
          totalStockValue: 1,
          lowStockAlerts: 1,
        },
      },
    ]);

    return res.status(200).json(
      result || {
        totalSKUs: 0,
        totalStockValue: 0,
        lowStockAlerts: 0,
      }
    );
  } catch (error) {
    console.error("Inventory KPI aggregation failed", error);
    return res.status(500).json({ message: "Unable to load inventory KPIs right now." });
  }
}

export async function getInventoryList(req, res) {
  try {
    const resolved = await resolvePharmacyProfileId(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const pharmacyId = new mongoose.Types.ObjectId(resolved.pharmacyProfileId);
    const {
      search = "",
      category = "All",
      stockLevel = "All",
      page = 1,
      limit = 10,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const pipeline = [{ $match: { pharmacyId } }];
    const searchRegex = search ? new RegExp(escapeRegex(search), "i") : null;

    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [
            { medicineName: searchRegex },
            { sku: searchRegex },
            { batchNumber: searchRegex },
            { nationalMedicineId: searchRegex },
          ],
        },
      });
    }

    if (stockLevel && stockLevel !== "All") {
      pipeline.push({ $match: buildStatusMatch(stockLevel) });
    }

    pipeline.push(
      {
        $lookup: {
          from: "medicinevariants",
          localField: "medicineVariantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      {
        $lookup: {
          from: "medicinegroups",
          localField: "variant.medicineGroupId",
          foreignField: "_id",
          as: "group",
        },
      },
      {
        $addFields: {
          variant: { $arrayElemAt: ["$variant", 0] },
          group: { $arrayElemAt: ["$group", 0] },
        },
      }
    );

    if (category && category !== "All") {
      pipeline.push({
        $match: {
          $or: [{ "group.category": category }, { category }],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await InventoryItem.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    const items = await InventoryItem.aggregate([
      ...pipeline,
      {
        $addFields: {
          computedStatus: {
            $switch: {
              branches: [
                {
                  case: { $lt: ["$expiryDate", new Date()] },
                  then: "Expired",
                },
                {
                  case: { $lt: ["$quantity", LOW_STOCK_THRESHOLD] },
                  then: "Low_Stock",
                },
              ],
              default: "Active",
            },
          },
          resolvedCategory: { $ifNull: ["$category", "$group.category"] },
        },
      },
      {
        $project: {
          _id: 1,
          nationalMedicineId: {
            $ifNull: [
              "$nationalMedicineId",
              {
                $concat: [
                  "RW-LOCAL-",
                  {
                    $toUpper: {
                      $replaceAll: {
                        input: { $ifNull: ["$sku", "UNKNOWN"] },
                        find: " ",
                        replacement: "-",
                      },
                    },
                  },
                ],
              },
            ],
          },
          medicineName: {
            $ifNull: [
              "$medicineName",
              {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$group.genericName", { $ifNull: ["$variant.sku", "Unknown Medicine"] }] },
                      " ",
                      { $ifNull: ["$variant.dosage", ""] },
                      " ",
                      { $ifNull: ["$variant.form", ""] },
                    ],
                  },
                },
              },
            ],
          },
          sku: 1,
          batchNumber: 1,
          quantity: 1,
          unitPrice: "$priceRWF",
          expiryDate: 1,
          location: 1,
          category: "$resolvedCategory",
          status: "$computedStatus",
          stockStatus: 1,
          medicineVariantId: 1,
        },
      },
      { $sort: { medicineName: 1, expiryDate: 1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ]);

    return res.status(200).json({
      items,
      page: Number(page),
      limit: Number(limit),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / Number(limit))),
    });
  } catch (error) {
    console.error("Inventory list failed", error);
    return res.status(500).json({ message: "Unable to load pharmacy inventory right now." });
  }
}

export async function searchNationalCatalog(req, res) {
  try {
    const entries = await buildCatalogEntries(String(req.query.search || "").trim());
    return res.status(200).json({ items: entries });
  } catch (error) {
    console.error("National catalog lookup failed", error);
    return res.status(500).json({ message: "Unable to search the national medicine catalog." });
  }
}

export async function addInventoryStock(req, res) {
  try {
    const resolved = await resolvePharmacyProfileId(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const {
      nationalMedicineId,
      medicineVariantId,
      medicineName,
      sku,
      batchNumber,
      quantity,
      unitPrice,
      expiryDate,
      location,
    } = req.body;

    if (
      !nationalMedicineId ||
      !medicineName ||
      !sku ||
      !batchNumber ||
      quantity === undefined ||
      unitPrice === undefined ||
      !expiryDate ||
      !location
    ) {
      return res.status(400).json({ message: "All inventory fields are required." });
    }

    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice);

    if (
      Number.isNaN(parsedQuantity) ||
      parsedQuantity < 0 ||
      Number.isNaN(parsedUnitPrice) ||
      parsedUnitPrice < 0
    ) {
      return res.status(400).json({ message: "Quantity and unit price must be valid positive numbers." });
    }

    const variant = medicineVariantId ? await MedicineVariant.findById(medicineVariantId) : null;
    const normalizedMedicineName = String(medicineName || "").trim();
    const normalizedNationalMedicineId = String(nationalMedicineId || "").trim();

    const item = await InventoryItem.create({
      pharmacyId: resolved.pharmacyProfileId,
      nationalMedicineId:
        normalizedNationalMedicineId ||
        buildNationalMedicineId({
          genericName: normalizedMedicineName,
          sku,
        }),
      medicineVariantId: variant?._id || null,
      medicineName:
        normalizedMedicineName ||
        buildInventoryMedicineName({
          genericName: variant?.sku || "Unknown Medicine",
          dosage: "",
          form: "",
        }),
      sku: String(sku).trim(),
      batchNumber: String(batchNumber).trim(),
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      priceRWF: parsedUnitPrice,
      expiryDate: new Date(expiryDate),
      location: String(location).trim(),
      category: req.body.category || undefined,
    });

    traceabilityGateway.emit("inventory_mutated", {
      pharmacyId: String(resolved.pharmacyProfileId),
      variantId: variant?._id ? String(variant._id) : String(nationalMedicineId),
      changeType: "RESTOCKED",
      quantityDelta: parsedQuantity,
      batchNumber: item.batchNumber,
    });

    return res.status(201).json({
      message: "Stock added successfully.",
      item,
    });
  } catch (error) {
    console.error("Add inventory stock failed", error);

    if (error?.code === 11000) {
      return res.status(409).json({ message: "This batch SKU already exists in your inventory." });
    }

    return res.status(500).json({ message: "Unable to add stock right now." });
  }
}

export async function triggerInventorySync(req, res) {
  try {
    const resolved = await resolvePharmacyProfileId(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const invalidItems = await InventoryItem.find({
      pharmacyId: resolved.pharmacyProfileId,
      $or: [
        { nationalMedicineId: { $exists: false } },
        { nationalMedicineId: null },
        { nationalMedicineId: "" },
      ],
    })
      .select("_id medicineName sku batchNumber")
      .lean();

    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: "Some inventory items are missing a valid national medicine ID.",
        invalidItems,
      });
    }

    const syncedAt = new Date().toISOString();

    traceabilityGateway.emit("inventory_mutated", {
      pharmacyId: String(resolved.pharmacyProfileId),
      variantId: "MANUAL_SYNC",
      changeType: "MANUAL_SYNC",
      quantityDelta: 0,
      batchNumber: null,
    });

    return res.status(200).json({
      message: "Gateway sync verified successfully.",
      syncedAt,
    });
  } catch (error) {
    console.error("Inventory sync failed", error);
    return res.status(500).json({ message: "Unable to trigger inventory sync right now." });
  }
}
