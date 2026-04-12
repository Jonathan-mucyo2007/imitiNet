import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import MedicineVariant from "../models/MedicineVariant.js";
import MedicineGroup from "../models/MedicineGroup.js";
import traceabilityGateway from "../services/traceabilityGatewaySync.js";

const LOW_STOCK_THRESHOLD = 20;

// GET /api/pharmacy/inventory/command-center
export const getCommandCenter = async (req, res) => {
  try {
    const pharmacyId = new mongoose.Types.ObjectId(req.user.id);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const aggregation = await Inventory.aggregate([
      { $match: { pharmacyId } },
      {
        $facet: {
          kpis: [
            {
              $group: {
                _id: null,
                totalSKUs: { $addToSet: "$medicineVariantId" },
                totalStockValue: { $sum: { $multiply: ["$priceRWF", "$quantity"] } },
                lowStockCount: {
                  $sum: { $cond: [{ $lt: ["$quantity", LOW_STOCK_THRESHOLD] }, 1, 0] },
                },
                expiringSoonCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$expiryDate", sixMonthsFromNow] },
                          { $gt: ["$quantity", 0] },
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
                totalSKUs: { $size: "$totalSKUs" },
                totalStockValue: 1,
                lowStockCount: 1,
                expiringSoonCount: 1,
              },
            },
          ],
          lowStockAlerts: [
            { $match: { quantity: { $lt: LOW_STOCK_THRESHOLD, $gt: 0 } } },
            { $sort: { quantity: 1 } },
            { $limit: 3 },
            {
              $lookup: {
                from: "medicinevariants",
                localField: "medicineVariantId",
                foreignField: "_id",
                as: "variant",
              },
            },
            { $unwind: "$variant" },
            {
              $lookup: {
                from: "medicinegroups",
                localField: "variant.medicineGroupId",
                foreignField: "_id",
                as: "group",
              },
            },
            { $unwind: "$group" },
            {
              $project: {
                _id: 1,
                quantity: 1,
                medicineName: {
                  $concat: ["$group.genericName", " ", "$variant.dosage"],
                },
                sku: "$variant.sku",
                location: 1,
              },
            },
          ],
          expiringAlerts: [
            {
              $match: {
                expiryDate: { $lt: sixMonthsFromNow },
                quantity: { $gt: 0 },
              },
            },
            { $sort: { expiryDate: 1 } },
            { $limit: 3 },
            {
              $lookup: {
                from: "medicinevariants",
                localField: "medicineVariantId",
                foreignField: "_id",
                as: "variant",
              },
            },
            { $unwind: "$variant" },
            {
              $lookup: {
                from: "medicinegroups",
                localField: "variant.medicineGroupId",
                foreignField: "_id",
                as: "group",
              },
            },
            { $unwind: "$group" },
            {
              $project: {
                _id: 1,
                expiryDate: 1,
                quantity: 1,
                medicineName: {
                  $concat: ["$group.genericName", " ", "$variant.dosage"],
                },
                sku: "$variant.sku",
              },
            },
          ],
          recentActivity: [
            { $sort: { updatedAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "medicinevariants",
                localField: "medicineVariantId",
                foreignField: "_id",
                as: "variant",
              },
            },
            { $unwind: "$variant" },
            {
              $lookup: {
                from: "medicinegroups",
                localField: "variant.medicineGroupId",
                foreignField: "_id",
                as: "group",
              },
            },
            { $unwind: "$group" },
            {
              $project: {
                _id: 1,
                updatedAt: 1,
                batchNumber: 1,
                quantity: 1,
                medicineName: {
                  $concat: ["$group.genericName", " ", "$variant.dosage"],
                },
                sku: "$variant.sku",
              },
            },
          ],
        },
      },
    ]);

    const result = aggregation[0];
    const kpis = result.kpis[0] || {
      totalSKUs: 0,
      totalStockValue: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
    };

    const syncStatus = traceabilityGateway.getStatus();

    return res.status(200).json({
      kpis,
      lowStockAlerts: result.lowStockAlerts,
      expiringAlerts: result.expiringAlerts,
      recentActivity: result.recentActivity,
      syncStatus,
    });
  } catch (error) {
    console.error("Inventory command center aggregation failed", error);
    return res.status(500).json({ message: "Failed to load inventory command center." });
  }
};

// GET /api/pharmacy/inventory/full-list
export const getFullList = async (req, res) => {
  try {
    const pharmacyId = new mongoose.Types.ObjectId(req.user.id);
    const { search = "", category = "", status = "", page = 1, limit = 8 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const pipeline = [
      { $match: { pharmacyId } },
      {
        $lookup: {
          from: "medicinevariants",
          localField: "medicineVariantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: "$variant" },
      {
        $lookup: {
          from: "medicinegroups",
          localField: "variant.medicineGroupId",
          foreignField: "_id",
          as: "group",
        },
      },
      { $unwind: "$group" },
    ];

    // Dynamic filters
    const filterMatch = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filterMatch.$or = [
        { "group.genericName": regex },
        { "variant.sku": regex },
        { "variant.dosage": regex },
      ];
    }
    if (category && category !== "All") {
      filterMatch["group.category"] = category;
    }
    if (status && status !== "All") {
      if (status === "Expired") {
        filterMatch.expiryDate = { $lt: new Date() };
      } else {
        filterMatch.stockStatus = status;
      }
    }
    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({ $match: filterMatch });
    }

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Inventory.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    // Project, sort, paginate
    pipeline.push(
      {
        $project: {
          _id: 1,
          medicineName: {
            $concat: ["$group.genericName", " ", "$variant.dosage"],
          },
          sku: "$variant.sku",
          quantity: 1,
          priceRWF: 1,
          expiryDate: 1,
          location: 1,
          stockStatus: 1,
          batchNumber: 1,
          category: "$group.category",
        },
      },
      { $sort: { medicineName: 1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    );

    const items = await Inventory.aggregate(pipeline);

    return res.status(200).json({
      items,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
    });
  } catch (error) {
    console.error("Inventory full list failed", error);
    return res.status(500).json({ message: "Failed to load inventory list." });
  }
};

// POST /api/pharmacy/inventory/add-stock
export const addStock = async (req, res) => {
  try {
    const { medicineVariantId, batchNumber, quantity, priceRWF, expiryDate, location } = req.body;

    if (!medicineVariantId || !batchNumber || !quantity || !priceRWF || !expiryDate) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const variant = await MedicineVariant.findById(medicineVariantId);
    if (!variant) {
      return res.status(404).json({ message: "Medicine variant not found." });
    }

    const stockStatus = quantity < LOW_STOCK_THRESHOLD ? "Low Stock" : "In Stock";

    const newLot = await Inventory.create({
      pharmacyId: req.user.id,
      medicineVariantId,
      batchNumber,
      quantity,
      priceRWF,
      expiryDate: new Date(expiryDate),
      location: location || "Shelf A1",
      stockStatus,
    });

    // Non-blocking FDA traceability sync
    traceabilityGateway.emit("inventory_mutated", {
      pharmacyId: req.user.id,
      variantId: medicineVariantId,
      changeType: "RESTOCKED",
      quantityDelta: quantity,
      batchNumber,
    });

    return res.status(201).json({
      message: "Stock added successfully.",
      lot: newLot,
    });
  } catch (error) {
    console.error("Add stock failed", error);
    return res.status(500).json({ message: "Failed to add stock." });
  }
};

// GET /api/pharmacy/inventory/sync-status
export const getSyncStatus = async (req, res) => {
  try {
    const status = traceabilityGateway.getStatus();
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ message: "Failed to get sync status." });
  }
};

// POST /api/pharmacy/inventory/trigger-sync
export const triggerManualSync = async (req, res) => {
  try {
    traceabilityGateway.emit("inventory_mutated", {
      pharmacyId: req.user.id,
      variantId: "MANUAL_SYNC",
      changeType: "MANUAL_SYNC",
      quantityDelta: 0,
      batchNumber: null,
    });
    return res.status(200).json({
      message: "Manual sync triggered.",
      lastSyncedAt: new Date(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Sync trigger failed." });
  }
};

// PUT /api/pharmacy/inventory/:id
export const updateInventoryLot = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, priceRWF, expiryDate, location } = req.body;

    // Strict validation
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({ message: "Quantity cannot be negative." });
    }
    if (priceRWF !== undefined && priceRWF < 0) {
      return res.status(400).json({ message: "Price cannot be negative." });
    }
    if (expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(expiryDate) < today) {
        return res.status(400).json({ message: "Expiry date cannot be in the past." });
      }
    }

    // Ownership Verification & Old State retrieval
    const inventoryLot = await Inventory.findOne({
      _id: id,
      pharmacyId: req.user.id
    });

    if (!inventoryLot) {
      return res.status(404).json({ message: "Inventory lot not found or unauthorized." });
    }

    const oldState = {
      quantity: inventoryLot.quantity,
      priceRWF: inventoryLot.priceRWF,
      expiryDate: inventoryLot.expiryDate,
      location: inventoryLot.location,
    };

    if (quantity !== undefined) inventoryLot.quantity = quantity;
    if (priceRWF !== undefined) inventoryLot.priceRWF = priceRWF;
    if (expiryDate) inventoryLot.expiryDate = new Date(expiryDate);
    if (location) inventoryLot.location = location;

    // Status sync
    inventoryLot.stockStatus = 
      inventoryLot.quantity < LOW_STOCK_THRESHOLD 
        ? (inventoryLot.quantity === 0 ? "Out of Stock" : "Low Stock") 
        : "In Stock";

    const updatedLot = await inventoryLot.save();

    // Traceability sync with Delta payload
    traceabilityGateway.emit("inventory_mutated", {
      pharmacyId: req.user.id,
      variantId: inventoryLot.medicineVariantId,
      changedByUserId: req.user.id,
      changeType: "UPDATED",
      oldState,
      newState: {
        quantity: updatedLot.quantity,
        priceRWF: updatedLot.priceRWF,
        expiryDate: updatedLot.expiryDate,
        location: updatedLot.location,
      }
    });

    return res.status(200).json({
      message: "Inventory lot updated successfully",
      lot: updatedLot
    });
  } catch (error) {
    console.error("Inventory update failed", error);
    return res.status(500).json({ message: "Failed to update inventory lot." });
  }
};
