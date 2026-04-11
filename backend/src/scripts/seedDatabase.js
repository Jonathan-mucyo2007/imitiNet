import dotenv from "dotenv";
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Medicine from "../models/Medicine.js";
import Pharmacy from "../models/Pharmacy.js";

dotenv.config({ path: "./.env" });

const pharmacies = [
  {
    name: "Kigali Central Pharmacy",
    address: "KN 3 Rd, Nyarugenge, Kigali",
    contact: "+250 788 100 101",
    rating: 4.8,
    location: { type: "Point", coordinates: [30.0619, -1.9441] },
  },
  {
    name: "Remera Care Pharmacy",
    address: "KG 11 Ave, Remera, Kigali",
    contact: "+250 788 100 102",
    rating: 4.6,
    location: { type: "Point", coordinates: [30.1127, -1.9566] },
  },
  {
    name: "Kimironko Family Pharmacy",
    address: "KG 28 Ave, Kimironko, Kigali",
    contact: "+250 788 100 103",
    rating: 4.5,
    location: { type: "Point", coordinates: [30.1264, -1.9497] },
  },
  {
    name: "Kacyiru Health Hub",
    address: "KG 7 Ave, Kacyiru, Kigali",
    contact: "+250 788 100 104",
    rating: 4.7,
    location: { type: "Point", coordinates: [30.0891, -1.9352] },
  },
  {
    name: "Nyamirambo Community Pharmacy",
    address: "KN 2 St, Nyamirambo, Kigali",
    contact: "+250 788 100 105",
    rating: 4.4,
    location: { type: "Point", coordinates: [30.0395, -1.9706] },
  },
  {
    name: "Kimironko District Pharmacy",
    address: "KG 17 Ave, Kibagabaga, Kigali",
    contact: "+250 788 100 106",
    rating: 4.3,
    location: { type: "Point", coordinates: [30.1169, -1.9283] },
  },
  {
    name: "Gikondo Wellness Pharmacy",
    address: "KK 15 Rd, Gikondo, Kigali",
    contact: "+250 788 100 107",
    rating: 4.2,
    location: { type: "Point", coordinates: [30.0708, -1.9872] },
  },
  {
    name: "Kanombe Essential Pharmacy",
    address: "KN 5 Rd, Kanombe, Kigali",
    contact: "+250 788 100 108",
    rating: 4.6,
    location: { type: "Point", coordinates: [30.1517, -1.9722] },
  },
];

const medicines = [
  ["Paracetamol", "Pain Relief", 800],
  ["Ibuprofen", "Pain Relief", 1200],
  ["Diclofenac", "Pain Relief", 1800],
  ["Amoxicillin", "Antibiotics", 2200],
  ["Doxycycline", "Antibiotics", 2500],
  ["Azithromycin", "Antibiotics", 4200],
  ["Vitamin C", "Vitamins", 900],
  ["Multivitamin", "Vitamins", 2500],
  ["Zinc", "Vitamins", 1300],
  ["Benylin", "Cough & Cold", 2000],
  ["Cetirizine", "Cough & Cold", 1700],
  ["Salbutamol", "Cough & Cold", 3200],
  ["Omeprazole", "Digestion", 2600],
  ["ORS", "Digestion", 700],
  ["Metronidazole", "Digestion", 2100],
  ["Panadol", "Pain Relief", 1000],
  ["Cough Syrup", "Cough & Cold", 2300],
  ["Folic Acid", "Vitamins", 1100],
  ["Ciprofloxacin", "Antibiotics", 4600],
  ["Loperamide", "Digestion", 1500],
];

const stockStatuses = ["In Stock", "Low Stock", "Out of Stock"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomStatus() {
  const roll = Math.random();
  if (roll < 0.65) {
    return "In Stock";
  }
  if (roll < 0.88) {
    return "Low Stock";
  }
  return "Out of Stock";
}

async function seedDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for seeding");

    await Promise.all([
      Inventory.deleteMany({}),
      Medicine.deleteMany({}),
      Pharmacy.deleteMany({}),
    ]);

    const createdPharmacies = await Pharmacy.insertMany(pharmacies);
    const createdMedicines = await Medicine.insertMany(
      medicines.map(([genericName, category, basePrice]) => ({
        genericName,
        category,
        basePrice,
      }))
    );

    const inventoryDocuments = [];

    createdPharmacies.forEach((pharmacy) => {
      createdMedicines.forEach((medicine) => {
        if (Math.random() < 0.68) {
          const variance = randomInt(-300, 1800);
          inventoryDocuments.push({
            pharmacyId: pharmacy._id,
            medicineId: medicine._id,
            stockStatus: pickRandomStatus(),
            priceRWF: Math.max(500, medicine.basePrice + variance),
          });
        }
      });
    });

    await Inventory.insertMany(inventoryDocuments);

    console.log(
      `Seed complete: ${createdPharmacies.length} pharmacies, ${createdMedicines.length} medicines, ${inventoryDocuments.length} inventory records`
    );
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();
