import Inventory from "../models/Inventory.js";
import Pharmacy from "../models/Pharmacy.js";

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
          name: "$pharmacy.name",
          address: "$pharmacy.address",
          contact: "$pharmacy.contact",
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
