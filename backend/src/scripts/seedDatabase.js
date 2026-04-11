import dotenv from "dotenv";
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import MedicineGroup from "../models/MedicineGroup.js";
import MedicineVariant from "../models/MedicineVariant.js";
import Pharmacy from "../models/Pharmacy.js";
import InsuranceProvider from "../models/InsuranceProvider.js";
import Prescription from "../models/Prescription.js";
import Claim from "../models/Claim.js";
import User from "../models/User.js";

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

const medicineGroups = [
  {
    genericName: "Paracetamol",
    category: "Pain Relief",
    description: "Common analgesic and fever reducer used for mild to moderate pain.",
    variants: [
      { dosage: "250mg", form: "Tablet", basePrice: 500 },
      { dosage: "500mg", form: "Tablet", basePrice: 800 },
      { dosage: "120mg/5ml", form: "Syrup", basePrice: 1400 },
    ],
  },
  {
    genericName: "Ibuprofen",
    category: "Pain Relief",
    description: "Anti-inflammatory medicine for pain, swelling, and fever relief.",
    variants: [
      { dosage: "200mg", form: "Tablet", basePrice: 950 },
      { dosage: "400mg", form: "Tablet", basePrice: 1200 },
    ],
  },
  {
    genericName: "Diclofenac",
    category: "Pain Relief",
    description: "NSAID often used for joint pain and inflammatory conditions.",
    variants: [
      { dosage: "50mg", form: "Tablet", basePrice: 1800 },
      { dosage: "75mg/3ml", form: "Injection", basePrice: 2600 },
    ],
  },
  {
    genericName: "Amoxicillin",
    category: "Antibiotics",
    description: "Broad-spectrum antibiotic commonly prescribed for bacterial infections.",
    variants: [
      { dosage: "250mg", form: "Capsule", basePrice: 1500 },
      { dosage: "500mg", form: "Capsule", basePrice: 2200 },
      { dosage: "125mg/5ml", form: "Suspension", basePrice: 2800 },
    ],
  },
  {
    genericName: "Doxycycline",
    category: "Antibiotics",
    description: "Antibiotic used for respiratory infections, acne, and selected tropical diseases.",
    variants: [
      { dosage: "100mg", form: "Capsule", basePrice: 2500 },
    ],
  },
  {
    genericName: "Azithromycin",
    category: "Antibiotics",
    description: "Macrolide antibiotic often dispensed as short-course therapy.",
    variants: [
      { dosage: "250mg", form: "Tablet", basePrice: 4200 },
      { dosage: "500mg", form: "Tablet", basePrice: 5800 },
    ],
  },
  {
    genericName: "Vitamin C",
    category: "Vitamins",
    description: "Supplement used to support immunity and nutritional recovery.",
    variants: [
      { dosage: "500mg", form: "Tablet", basePrice: 700 },
      { dosage: "1000mg", form: "Tablet", basePrice: 900 },
    ],
  },
  {
    genericName: "Multivitamin",
    category: "Vitamins",
    description: "Daily multivitamin supplement for general wellness support.",
    variants: [
      { dosage: "Daily", form: "Tablet", basePrice: 2500 },
    ],
  },
  {
    genericName: "Zinc",
    category: "Vitamins",
    description: "Mineral supplement frequently used in recovery and immune support plans.",
    variants: [
      { dosage: "10mg", form: "Tablet", basePrice: 900 },
      { dosage: "20mg", form: "Tablet", basePrice: 1300 },
    ],
  },
  {
    genericName: "Benylin",
    category: "Cough & Cold",
    description: "Cough syrup used to relieve throat irritation and cough symptoms.",
    variants: [
      { dosage: "100ml", form: "Syrup", basePrice: 2000 },
    ],
  },
  {
    genericName: "Cetirizine",
    category: "Cough & Cold",
    description: "Antihistamine commonly used for allergy-related cold symptoms.",
    variants: [
      { dosage: "10mg", form: "Tablet", basePrice: 1700 },
      { dosage: "5mg/5ml", form: "Syrup", basePrice: 2100 },
    ],
  },
  {
    genericName: "Salbutamol",
    category: "Cough & Cold",
    description: "Bronchodilator used to relieve wheezing and breathing difficulty.",
    variants: [
      { dosage: "100mcg", form: "Inhaler", basePrice: 3200 },
      { dosage: "2mg/5ml", form: "Syrup", basePrice: 2600 },
    ],
  },
  {
    genericName: "Omeprazole",
    category: "Digestion",
    description: "Acid-reducing medicine used for ulcers, reflux, and gastritis.",
    variants: [
      { dosage: "20mg", form: "Capsule", basePrice: 2600 },
      { dosage: "40mg", form: "Capsule", basePrice: 3400 },
    ],
  },
  {
    genericName: "ORS",
    category: "Digestion",
    description: "Oral rehydration salts for dehydration caused by diarrhea or vomiting.",
    variants: [
      { dosage: "Single Sachet", form: "Powder", basePrice: 700 },
      { dosage: "Box of 10", form: "Powder", basePrice: 6200 },
    ],
  },
  {
    genericName: "Metronidazole",
    category: "Digestion",
    description: "Antimicrobial medicine frequently used for gastrointestinal infections.",
    variants: [
      { dosage: "200mg", form: "Tablet", basePrice: 1500 },
      { dosage: "400mg", form: "Tablet", basePrice: 2100 },
    ],
  },
  {
    genericName: "Panadol",
    category: "Pain Relief",
    description: "Branded paracetamol line used for pain and fever reduction.",
    variants: [
      { dosage: "500mg", form: "Tablet", basePrice: 1000 },
    ],
  },
  {
    genericName: "Cough Syrup",
    category: "Cough & Cold",
    description: "General cough relief syrup available in child and adult strengths.",
    variants: [
      { dosage: "60ml", form: "Syrup", basePrice: 1600 },
      { dosage: "120ml", form: "Syrup", basePrice: 2300 },
    ],
  },
  {
    genericName: "Folic Acid",
    category: "Vitamins",
    description: "Supplement commonly dispensed in antenatal and anemia support care.",
    variants: [
      { dosage: "5mg", form: "Tablet", basePrice: 1100 },
    ],
  },
  {
    genericName: "Ciprofloxacin",
    category: "Antibiotics",
    description: "Broad-spectrum antibiotic reserved for selected bacterial infections.",
    variants: [
      { dosage: "250mg", form: "Tablet", basePrice: 3200 },
      { dosage: "500mg", form: "Tablet", basePrice: 4600 },
    ],
  },
  {
    genericName: "Loperamide",
    category: "Digestion",
    description: "Anti-diarrheal medicine used for short-term symptom control.",
    variants: [
      { dosage: "2mg", form: "Capsule", basePrice: 1500 },
    ],
  },
];

const insurers = [
  { name: "RSSB - Mutuelle (Category 1)", coveragePercentage: 100, tier: 1 },
  { name: "RSSB - Mutuelle (Category 3)", coveragePercentage: 85, tier: 3 },
  { name: "MMI (Military)", coveragePercentage: 90, tier: 0 },
  { name: "Radiant (Private)", coveragePercentage: 75, tier: 0 },
];

const users = [
  {
    fullName: "Aline Uwase",
    email: "aline.uwase@imitinet.rw",
    password: "Password123!",
    role: "patient",
    nationalId: "1199580012345678",
    insuranceStatus: "active",
  },
  {
    fullName: "Claude Niyomugabo",
    email: "claude.niyo@imitinet.rw",
    password: "Password123!",
    role: "patient",
    nationalId: "1199600098765432",
    insuranceStatus: "active",
  },
  {
    fullName: "Vestine Mukamana",
    email: "vestine.muka@imitinet.rw",
    password: "Password123!",
    role: "patient",
    nationalId: "1199620011112222",
    insuranceStatus: "inactive",
  },
  {
    fullName: "Kigali Central Pharmacy Admin",
    email: "pharmacy.admin@imitinet.rw",
    password: "Password123!",
    role: "pharmacy",
    facilityId: "PHARM-KGL-CENTRAL",
  },
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
      mongoose.connection.dropCollection("inventories").catch(() => null),
      mongoose.connection.dropCollection("medicines").catch(() => null),
      mongoose.connection.dropCollection("medicinegroups").catch(() => null),
      mongoose.connection.dropCollection("medicinevariants").catch(() => null),
      mongoose.connection.dropCollection("prescriptions").catch(() => null),
      mongoose.connection.dropCollection("claims").catch(() => null),
      mongoose.connection.dropCollection("users").catch(() => null),
      mongoose.connection.dropCollection("pharmacies").catch(() => null),
      mongoose.connection.dropCollection("insuranceproviders").catch(() => null),
    ]);

    await Promise.all([
      Inventory.deleteMany({}),
      MedicineVariant.deleteMany({}),
      MedicineGroup.deleteMany({}),
      Prescription.deleteMany({}),
      Claim.deleteMany({}),
      User.deleteMany({}),
      Pharmacy.deleteMany({}),
      InsuranceProvider.deleteMany({}),
    ]);

    const createdPharmacies = await Pharmacy.insertMany(pharmacies);
    const createdInsurers = await InsuranceProvider.insertMany(insurers);
    const createdMedicineGroups = await MedicineGroup.insertMany(
      medicineGroups.map(({ genericName, category, description }) => ({
        genericName,
        category,
        description,
      }))
    );

    const variantDocuments = createdMedicineGroups.flatMap((group) => {
      const sourceGroup = medicineGroups.find(({ genericName }) => genericName === group.genericName);
      return sourceGroup.variants.map((variant) => ({
        medicineGroupId: group._id,
        dosage: variant.dosage,
        form: variant.form,
        basePrice: variant.basePrice,
      }));
    });

    const createdVariants = await MedicineVariant.insertMany(variantDocuments);

    const inventoryDocuments = [];

    createdPharmacies.forEach((pharmacy) => {
      createdVariants.forEach((variant) => {
        if (Math.random() < 0.68) {
          const variance = randomInt(-300, 1800);
          inventoryDocuments.push({
            pharmacyId: pharmacy._id,
            medicineVariantId: variant._id,
            stockStatus: pickRandomStatus(),
            priceRWF: Math.max(500, variant.basePrice + variance),
          });
        }
      });
    });

    await Inventory.insertMany(inventoryDocuments);

    const createdUsers = await User.create(
      users.map((user) => ({
        ...user,
        pharmacyProfileId:
          user.role === "pharmacy" ? createdPharmacies[0]._id : undefined,
      }))
    );

    const findVariant = (genericName, dosage, form) =>
      createdVariants.find((variant) => {
        const group = createdMedicineGroups.find((item) =>
          item._id.equals(variant.medicineGroupId)
        );

        return (
          group?.genericName === genericName &&
          variant.dosage === dosage &&
          variant.form === form
        );
      });

    const aline = createdUsers.find((user) => user.email === "aline.uwase@imitinet.rw");
    const claude = createdUsers.find((user) => user.email === "claude.niyo@imitinet.rw");
    const vestine = createdUsers.find((user) => user.email === "vestine.muka@imitinet.rw");

    const prescriptions = [
      {
        prescriptionId: "RX-77123",
        patientId: aline._id,
        prescribingDoctor: "Dr. Ange Mukeshimana",
        medications: [
          {
            medicineVariantId: findVariant("Amoxicillin", "500mg", "Capsule")._id,
            quantity: 2,
            instructions: "Take one capsule twice daily after meals for 5 days.",
          },
          {
            medicineVariantId: findVariant("Paracetamol", "500mg", "Tablet")._id,
            quantity: 1,
            instructions: "Take one tablet every 8 hours as needed for fever.",
          },
        ],
        originatingEmr: "eUbuzima",
        status: "Active",
      },
      {
        prescriptionId: "RX-77124",
        patientId: claude._id,
        prescribingDoctor: "Dr. Patrick Nshimiyimana",
        medications: [
          {
            medicineVariantId: findVariant("Omeprazole", "20mg", "Capsule")._id,
            quantity: 1,
            instructions: "Take one capsule every morning before food for 14 days.",
          },
          {
            medicineVariantId: findVariant("ORS", "Single Sachet", "Powder")._id,
            quantity: 4,
            instructions: "Mix one sachet with clean water after each loose stool.",
          },
        ],
        originatingEmr: "OpenClinic",
        status: "Active",
      },
      {
        prescriptionId: "RX-77125",
        patientId: vestine._id,
        prescribingDoctor: "Dr. Diane Uwera",
        medications: [
          {
            medicineVariantId: findVariant("Cetirizine", "10mg", "Tablet")._id,
            quantity: 1,
            instructions: "Take one tablet every evening for 7 days.",
          },
        ],
        originatingEmr: "eUbuzima",
        status: "Active",
      },
    ];

    await Prescription.insertMany(prescriptions);

    console.log(
      `Seed complete: ${createdUsers.length} users, ${createdPharmacies.length} pharmacies, ${createdMedicineGroups.length} medicine groups, ${createdVariants.length} variants, ${createdInsurers.length} insurers, ${inventoryDocuments.length} inventory records, ${prescriptions.length} prescriptions`
    );
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();
