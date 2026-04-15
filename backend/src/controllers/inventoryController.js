import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Prescription from "../models/Prescription.js";
import PharmacyProfile from "../models/PharmacyProfile.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(fromLat, fromLng, toLat, toLng) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function attachDistance(results, lat, lng) {
  if (lat === undefined || lng === undefined) {
    return results;
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return results;
  }

  return results
    .map((item) => {
      const [pharmacyLng, pharmacyLat] = item.pharmacy.location.coordinates;
      return {
        ...item,
        distanceKm: calculateDistanceKm(parsedLat, parsedLng, pharmacyLat, pharmacyLng),
      };
    })
    .sort((first, second) => {
      if (first.distanceKm !== second.distanceKm) {
        return first.distanceKm - second.distanceKm;
      }

      return first.priceRWF - second.priceRWF;
    });
}

async function buildSearchResults({ query, category, lat, lng }) {
  const pipeline = [
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
        as: "medicineGroup",
      },
    },
    { $unwind: "$medicineGroup" },
    {
      $lookup: {
        from: "pharmacies",
        localField: "pharmacyId",
        foreignField: "_id",
        as: "pharmacy",
      },
    },
    { $unwind: "$pharmacy" },
  ];

  const match = {};

  // Filter by category if one is selected
  if (category && category !== "All") {
    match["medicineGroup.category"] = category;
  }

  // Text search on medicine group, category, description, or pharmacy name
  if (query) {
    const searchRegex = new RegExp(escapeRegex(query), "i");
    match.$or = [
      { "medicineGroup.genericName": searchRegex },
      { "medicineGroup.category": searchRegex },
      { "medicineGroup.description": searchRegex },
      { "variant.dosage": searchRegex },
      { "variant.form": searchRegex },
      { "pharmacy.facilityName": searchRegex },
      { "pharmacy.name": searchRegex },
    ];
  }

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  // Project the final structure needed by your frontend React app
  pipeline.push(
    {
      $project: {
        _id: 1,
        stockStatus: 1,
        priceRWF: 1,
        medicineGroup: {
          id: "$medicineGroup._id",
          name: "$medicineGroup.genericName",
          category: "$medicineGroup.category",
          description: "$medicineGroup.description",
        },
        variant: {
          variantId: "$variant._id",
          dosage: "$variant.dosage",
          form: "$variant.form",
          basePrice: "$variant.basePrice",
        },
        pharmacy: {
          id: "$pharmacy._id",
          name: { $ifNull: ["$pharmacy.facilityName", "$pharmacy.name"] },
          address: "$pharmacy.address",
          contact: { $ifNull: ["$pharmacy.contactPhone", "$pharmacy.contact"] },
          rating: "$pharmacy.rating",
          imageUrl: "$pharmacy.imageUrl",
          location: "$pharmacy.location",
        },
      },
    },
    { $sort: { stockStatus: 1, priceRWF: 1 } } // Sort by availability, then price
  );

  const results = await Inventory.aggregate(pipeline);
  const distanceSortedResults = attachDistance(results, lat, lng);
  const groupedResults = new Map();

  distanceSortedResults.forEach((item) => {
    const key = `${item.pharmacy.id}:${item.medicineGroup.id}`;
    const current = groupedResults.get(key);
    const availableVariant = {
      variantId: item.variant.variantId,
      dosage: item.variant.dosage,
      form: item.variant.form,
      priceRWF: item.priceRWF,
      stockStatus: item.stockStatus,
      basePrice: item.variant.basePrice,
    };

    if (!current) {
      groupedResults.set(key, {
        pharmacy: item.pharmacy,
        medicineGroup: item.medicineGroup,
        availableVariants: [availableVariant],
        distanceKm: item.distanceKm,
      });
      return;
    }

    current.availableVariants.push(availableVariant);
  });

  return Array.from(groupedResults.values()).map((item) => ({
    ...item,
    availableVariants: item.availableVariants.sort((first, second) => {
      if (first.basePrice !== second.basePrice) {
        return first.basePrice - second.basePrice;
      }

      return first.dosage.localeCompare(second.dosage);
    }),
  }));
}

async function findNearbyPharmaciesForVariant({
  medicineVariantId,
  lat,
  lng,
  limit = 3,
}) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const variantObjectId =
    typeof medicineVariantId === "string" && mongoose.Types.ObjectId.isValid(medicineVariantId)
      ? new mongoose.Types.ObjectId(medicineVariantId)
      : medicineVariantId;

  if (!variantObjectId || Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return [];
  }

  return PharmacyProfile.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parsedLng, parsedLat],
        },
        distanceField: "distanceMeters",
        spherical: true,
      },
    },
    {
      $lookup: {
        from: "inventories",
        let: { pharmacyObjectId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$pharmacyId", "$$pharmacyObjectId"] },
                  { $eq: ["$medicineVariantId", variantObjectId] },
                  { $gt: ["$quantity", 0] },
                  { $in: ["$stockStatus", ["In Stock", "Low Stock"]] },
                ],
              },
            },
          },
          { $sort: { priceRWF: 1, expiryDate: 1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              stockStatus: 1,
              quantity: 1,
              priceRWF: 1,
              expiryDate: 1,
            },
          },
        ],
        as: "inventoryMatch",
      },
    },
    {
      $match: {
        inventoryMatch: { $ne: [] },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        address: 1,
        contact: 1,
        rating: 1,
        imageUrl: 1,
        location: 1,
        operatingHours: 1,
        distanceMeters: 1,
        inventory: { $arrayElemAt: ["$inventoryMatch", 0] },
      },
    },
    { $sort: { distanceMeters: 1, rating: -1 } },
    { $limit: limit },
  ]);
}

export async function searchInventory(req, res) {
  try {
    const { query = "", category = "All", lat, lng } = req.query;

    const [results, featuredPharmacies] = await Promise.all([
      buildSearchResults({ query: query.trim(), category, lat, lng }),
      PharmacyProfile.find({})
        .sort({ rating: -1, createdAt: -1 })
        .limit(6)
        .select(
          "facilityName name address contactPhone contact rating imageUrl location operatingHours"
        ),
    ]);

    return res.status(200).json({
      results,
      featuredPharmacies: featuredPharmacies.map((pharmacy) => ({
        ...pharmacy.toObject(),
        name: pharmacy.facilityName || pharmacy.name,
        contact: pharmacy.contactPhone || pharmacy.contact,
      })),
    });
  } catch (error) {
    console.error("Inventory search failed", error);
    return res.status(500).json({
      message: "Unable to search inventory right now",
    });
  }
}

export async function getNearbyPharmaciesForMedicine(req, res) {
  try {
    const { medicineVariantId, lat, lng, limit = 6 } = req.query;

    const nearbyPharmacies = await findNearbyPharmaciesForVariant({
      medicineVariantId,
      lat,
      lng,
      limit: Number(limit) || 6,
    });

    return res.status(200).json({
      pharmacies: nearbyPharmacies.map((pharmacy) => ({
        id: pharmacy._id,
        name: pharmacy.facilityName || pharmacy.name,
        address: pharmacy.address,
        contact: pharmacy.contactPhone || pharmacy.contact,
        rating: pharmacy.rating,
        imageUrl: pharmacy.imageUrl,
        operatingHours: pharmacy.operatingHours,
        location: pharmacy.location,
        distanceKm: Number((pharmacy.distanceMeters / 1000).toFixed(2)),
        inventory: pharmacy.inventory,
      })),
    });
  } catch (error) {
    console.error("Nearby pharmacy lookup failed", error);
    return res.status(500).json({
      message: "Unable to find nearby pharmacies right now.",
    });
  }
}

export async function getNearbyPharmaciesForActivePrescription(req, res) {
  try {
    const { lat, lng } = req.query;

    const prescription = await Prescription.findOne({
      patientId: req.user.id,
      status: { $in: ["Pending Dispense", "Active"] },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "medications.medicineVariantId",
        select: "dosage form medicineGroupId",
        populate: {
          path: "medicineGroupId",
          select: "genericName category",
        },
      });

    if (!prescription) {
      return res.status(200).json({
        prescription: null,
        pharmacies: [],
      });
    }

    const primaryMedication = prescription.medications[0];
    const nearbyPharmacies = await findNearbyPharmaciesForVariant({
      medicineVariantId: primaryMedication?.medicineVariantId?._id,
      lat,
      lng,
      limit: 3,
    });

    return res.status(200).json({
      prescription: {
        id: prescription._id,
        prescriptionId: prescription.prescriptionId,
        medicineVariantId: primaryMedication?.medicineVariantId?._id || null,
        medicineName:
          primaryMedication?.medicineVariantId?.medicineGroupId?.genericName || "Medicine",
        dosage: primaryMedication?.medicineVariantId?.dosage || null,
        form: primaryMedication?.medicineVariantId?.form || null,
      },
      pharmacies: nearbyPharmacies.map((pharmacy) => ({
        id: pharmacy._id,
        name: pharmacy.facilityName || pharmacy.name,
        address: pharmacy.address,
        contact: pharmacy.contactPhone || pharmacy.contact,
        rating: pharmacy.rating,
        imageUrl: pharmacy.imageUrl,
        operatingHours: pharmacy.operatingHours,
        location: pharmacy.location,
        distanceKm: Number((pharmacy.distanceMeters / 1000).toFixed(2)),
        inventory: pharmacy.inventory,
      })),
    });
  } catch (error) {
    console.error("Active prescription nearby lookup failed", error);
    return res.status(500).json({
      message: "Unable to load nearby pharmacies for your prescription.",
    });
  }
}
