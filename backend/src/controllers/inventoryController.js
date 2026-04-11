import Inventory from "../models/Inventory.js";
import Pharmacy from "../models/Pharmacy.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildInventoryStages({ query, category }) {
  const stages = [
    {
      $lookup: {
        from: "medicines",
        localField: "medicineId",
        foreignField: "_id",
        as: "medicine",
      },
    },
    { $unwind: "$medicine" },
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

  if (category && category !== "All") {
    match["medicine.category"] = category;
  }

  if (query) {
    const searchRegex = new RegExp(escapeRegex(query), "i");
    match.$or = [
      { "medicine.genericName": searchRegex },
      { "medicine.category": searchRegex },
      { "pharmacy.name": searchRegex },
      { "pharmacy.address": searchRegex },
    ];
  }

  if (Object.keys(match).length > 0) {
    stages.push({ $match: match });
  }

  return stages;
}

async function buildSearchResults({ query, category, lat, lng }) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const hasCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

  if (hasCoordinates) {
    return Pharmacy.aggregate([
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
          localField: "_id",
          foreignField: "pharmacyId",
          as: "inventoryItems",
        },
      },
      { $unwind: "$inventoryItems" },
      {
        $lookup: {
          from: "medicines",
          localField: "inventoryItems.medicineId",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      ...(category && category !== "All"
        ? [{ $match: { "medicine.category": category } }]
        : []),
      ...(query
        ? [
            {
              $match: {
                $or: [
                  { "medicine.genericName": new RegExp(escapeRegex(query), "i") },
                  { "medicine.category": new RegExp(escapeRegex(query), "i") },
                  { name: new RegExp(escapeRegex(query), "i") },
                  { address: new RegExp(escapeRegex(query), "i") },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: "$inventoryItems._id",
          stockStatus: "$inventoryItems.stockStatus",
          priceRWF: "$inventoryItems.priceRWF",
          medicine: {
            id: "$medicine._id",
            genericName: "$medicine.genericName",
            category: "$medicine.category",
            basePrice: "$medicine.basePrice",
          },
          pharmacy: {
            id: "$_id",
            name: "$name",
            address: "$address",
            contact: "$contact",
            rating: "$rating",
            imageUrl: "$imageUrl",
            location: "$location",
          },
          distanceMeters: 1,
        },
      },
      { $sort: { distanceMeters: 1, stockStatus: 1, priceRWF: 1 } },
    ]);
  }

  return Inventory.aggregate([
    ...buildInventoryStages({ query, category }),
    {
      $project: {
        _id: 1,
        stockStatus: 1,
        priceRWF: 1,
        medicine: {
          id: "$medicine._id",
          genericName: "$medicine.genericName",
          category: "$medicine.category",
          basePrice: "$medicine.basePrice",
        },
        pharmacy: {
          id: "$pharmacy._id",
          name: "$pharmacy.name",
          address: "$pharmacy.address",
          contact: "$pharmacy.contact",
          rating: "$pharmacy.rating",
          imageUrl: "$pharmacy.imageUrl",
          location: "$pharmacy.location",
        },
      },
    },
    { $sort: { stockStatus: 1, priceRWF: 1 } },
  ]);
}

export async function searchInventory(req, res) {
  try {
    const { query = "", category = "All", lat, lng } = req.query;

    const [results, featuredPharmacies] = await Promise.all([
      buildSearchResults({ query: query.trim(), category, lat, lng }),
      Pharmacy.find({})
        .sort({ rating: -1, createdAt: -1 })
        .limit(6)
        .select("name address contact rating imageUrl location"),
    ]);

    return res.status(200).json({
      results,
      featuredPharmacies,
    });
  } catch (error) {
    console.error("Inventory search failed", error);
    return res.status(500).json({
      message: "Unable to search inventory right now",
    });
  }
}
