import dotenv from "dotenv";
import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import MedicineGroup from "../models/MedicineGroup.js";
import MedicineVariant from "../models/MedicineVariant.js";
import Pharmacy from "../models/Pharmacy.js";
import InsuranceProvider from "../models/InsuranceProvider.js";
import Prescription from "../models/Prescription.js";
import Claim from "../models/Claim.js";
import PatientVerification from "../models/PatientVerification.js";
import PatientQrSession from "../models/PatientQrSession.js";
import User from "../models/User.js";
import NationalStatsMaterialized from "../models/NationalStatsMaterialized.js";
import {
  buildInventoryMedicineName,
  buildNationalMedicineId,
} from "../utils/nationalMedicineCatalog.js";

dotenv.config({ path: "./.env" });

const pharmacies = [
  {
    name: "Kigali Central Pharmacy",
    address: "KN 3 Rd, Nyarugenge, Kigali",
    contact: "+250 788 100 101",
    operatingHours: "Mon-Sun, 06:30 - 22:00",
    rating: 4.8,
    location: { type: "Point", coordinates: [30.0619, -1.9441] },
  },
  {
    name: "Remera Care Pharmacy",
    address: "KG 11 Ave, Remera, Kigali",
    contact: "+250 788 100 102",
    operatingHours: "Mon-Sun, 07:00 - 22:00",
    rating: 4.6,
    location: { type: "Point", coordinates: [30.1127, -1.9566] },
  },
  {
    name: "Kimironko Family Pharmacy",
    address: "KG 28 Ave, Kimironko, Kigali",
    contact: "+250 788 100 103",
    operatingHours: "Mon-Sat, 07:00 - 21:30",
    rating: 4.5,
    location: { type: "Point", coordinates: [30.1264, -1.9497] },
  },
  {
    name: "Kacyiru Health Hub",
    address: "KG 7 Ave, Kacyiru, Kigali",
    contact: "+250 788 100 104",
    operatingHours: "Mon-Sun, 06:00 - 23:00",
    rating: 4.7,
    location: { type: "Point", coordinates: [30.0891, -1.9352] },
  },
  {
    name: "Nyamirambo Community Pharmacy",
    address: "KN 2 St, Nyamirambo, Kigali",
    contact: "+250 788 100 105",
    operatingHours: "Mon-Sun, 07:00 - 21:00",
    rating: 4.4,
    location: { type: "Point", coordinates: [30.0395, -1.9706] },
  },
  {
    name: "Kimironko District Pharmacy",
    address: "KG 17 Ave, Kibagabaga, Kigali",
    contact: "+250 788 100 106",
    operatingHours: "Mon-Sat, 07:00 - 22:00",
    rating: 4.3,
    location: { type: "Point", coordinates: [30.1169, -1.9283] },
  },
  {
    name: "Gikondo Wellness Pharmacy",
    address: "KK 15 Rd, Gikondo, Kigali",
    contact: "+250 788 100 107",
    operatingHours: "Mon-Sun, 06:30 - 21:30",
    rating: 4.2,
    location: { type: "Point", coordinates: [30.0708, -1.9872] },
  },
  {
    name: "Kanombe Essential Pharmacy",
    address: "KN 5 Rd, Kanombe, Kigali",
    contact: "+250 788 100 108",
    operatingHours: "Mon-Sun, 07:00 - 22:30",
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
      { dosage: "250mg", form: "Tablet", basePrice: 500, sku: "PARA-250-TAB" },
      { dosage: "500mg", form: "Tablet", basePrice: 800, sku: "PARA-500-TAB" },
      { dosage: "120mg/5ml", form: "Syrup", basePrice: 1400, sku: "PARA-120-SYR" },
    ],
  },
  {
    genericName: "Ibuprofen",
    category: "Pain Relief",
    description: "Anti-inflammatory medicine for pain, swelling, and fever relief.",
    variants: [
      { dosage: "200mg", form: "Tablet", basePrice: 950, sku: "IBUP-200-TAB" },
      { dosage: "400mg", form: "Tablet", basePrice: 1200, sku: "IBUP-400-TAB" },
    ],
  },
  {
    genericName: "Diclofenac",
    category: "Pain Relief",
    description: "NSAID often used for joint pain and inflammatory conditions.",
    variants: [
      { dosage: "50mg", form: "Tablet", basePrice: 1800, sku: "DICL-050-TAB" },
      { dosage: "75mg/3ml", form: "Injection", basePrice: 2600, sku: "DICL-075-INJ" },
    ],
  },
  {
    genericName: "Amoxicillin",
    category: "Antibiotics",
    description: "Broad-spectrum antibiotic commonly prescribed for bacterial infections.",
    variants: [
      { dosage: "250mg", form: "Capsule", basePrice: 1500, sku: "AMOX-250-CAP" },
      { dosage: "500mg", form: "Capsule", basePrice: 2200, sku: "AMOX-500-CAP" },
      { dosage: "125mg/5ml", form: "Suspension", basePrice: 2800, sku: "AMOX-125-SUS" },
    ],
  },
  {
    genericName: "Doxycycline",
    category: "Antibiotics",
    description: "Antibiotic used for respiratory infections, acne, and selected tropical diseases.",
    variants: [
      { dosage: "100mg", form: "Capsule", basePrice: 2500, sku: "DOXY-100-CAP" },
    ],
  },
  {
    genericName: "Azithromycin",
    category: "Antibiotics",
    description: "Macrolide antibiotic often dispensed as short-course therapy.",
    variants: [
      { dosage: "250mg", form: "Tablet", basePrice: 4200, sku: "AZIT-250-TAB" },
      { dosage: "500mg", form: "Tablet", basePrice: 5800, sku: "AZIT-500-TAB" },
    ],
  },
  {
    genericName: "Vitamin C",
    category: "Vitamins",
    description: "Supplement used to support immunity and nutritional recovery.",
    variants: [
      { dosage: "500mg", form: "Tablet", basePrice: 700, sku: "VITC-500-TAB" },
      { dosage: "1000mg", form: "Tablet", basePrice: 900, sku: "VITC-1KG-TAB" },
    ],
  },
  {
    genericName: "Multivitamin",
    category: "Vitamins",
    description: "Daily multivitamin supplement for general wellness support.",
    variants: [
      { dosage: "Daily", form: "Tablet", basePrice: 2500, sku: "MULT-DLY-TAB" },
    ],
  },
  {
    genericName: "Zinc",
    category: "Vitamins",
    description: "Mineral supplement frequently used in recovery and immune support plans.",
    variants: [
      { dosage: "10mg", form: "Tablet", basePrice: 900, sku: "ZINC-010-TAB" },
      { dosage: "20mg", form: "Tablet", basePrice: 1300, sku: "ZINC-020-TAB" },
    ],
  },
  {
    genericName: "Benylin",
    category: "Cough & Cold",
    description: "Cough syrup used to relieve throat irritation and cough symptoms.",
    variants: [
      { dosage: "100ml", form: "Syrup", basePrice: 2000, sku: "BENY-100-SYR" },
    ],
  },
  {
    genericName: "Cetirizine",
    category: "Cough & Cold",
    description: "Antihistamine commonly used for allergy-related cold symptoms.",
    variants: [
      { dosage: "10mg", form: "Tablet", basePrice: 1700, sku: "CETI-010-TAB" },
      { dosage: "5mg/5ml", form: "Syrup", basePrice: 2100, sku: "CETI-005-SYR" },
    ],
  },
  {
    genericName: "Salbutamol",
    category: "Cough & Cold",
    description: "Bronchodilator used to relieve wheezing and breathing difficulty.",
    variants: [
      { dosage: "100mcg", form: "Inhaler", basePrice: 3200, sku: "SALB-100-INH" },
      { dosage: "2mg/5ml", form: "Syrup", basePrice: 2600, sku: "SALB-002-SYR" },
    ],
  },
  {
    genericName: "Omeprazole",
    category: "Digestion",
    description: "Acid-reducing medicine used for ulcers, reflux, and gastritis.",
    variants: [
      { dosage: "20mg", form: "Capsule", basePrice: 2600, sku: "OMEP-020-CAP" },
      { dosage: "40mg", form: "Capsule", basePrice: 3400, sku: "OMEP-040-CAP" },
    ],
  },
  {
    genericName: "ORS",
    category: "Digestion",
    description: "Oral rehydration salts for dehydration caused by diarrhea or vomiting.",
    variants: [
      { dosage: "Single Sachet", form: "Powder", basePrice: 700, sku: "ORSS-001-PWD" },
      { dosage: "Box of 10", form: "Powder", basePrice: 6200, sku: "ORSS-010-PWD" },
    ],
  },
  {
    genericName: "Metronidazole",
    category: "Digestion",
    description: "Antimicrobial medicine frequently used for gastrointestinal infections.",
    variants: [
      { dosage: "200mg", form: "Tablet", basePrice: 1500, sku: "METR-200-TAB" },
      { dosage: "400mg", form: "Tablet", basePrice: 2100, sku: "METR-400-TAB" },
    ],
  },
  {
    genericName: "Panadol",
    category: "Pain Relief",
    description: "Branded paracetamol line used for pain and fever reduction.",
    variants: [
      { dosage: "500mg", form: "Tablet", basePrice: 1000, sku: "PNDL-500-TAB" },
    ],
  },
  {
    genericName: "Cough Syrup",
    category: "Cough & Cold",
    description: "General cough relief syrup available in child and adult strengths.",
    variants: [
      { dosage: "60ml", form: "Syrup", basePrice: 1600, sku: "CGHS-060-SYR" },
      { dosage: "120ml", form: "Syrup", basePrice: 2300, sku: "CGHS-120-SYR" },
    ],
  },
  {
    genericName: "Folic Acid",
    category: "Vitamins",
    description: "Supplement commonly dispensed in antenatal and anemia support care.",
    variants: [
      { dosage: "5mg", form: "Tablet", basePrice: 1100, sku: "FOLC-005-TAB" },
    ],
  },
  {
    genericName: "Ciprofloxacin",
    category: "Antibiotics",
    description: "Broad-spectrum antibiotic reserved for selected bacterial infections.",
    variants: [
      { dosage: "250mg", form: "Tablet", basePrice: 3200, sku: "CIPR-250-TAB" },
      { dosage: "500mg", form: "Tablet", basePrice: 4600, sku: "CIPR-500-TAB" },
    ],
  },
  {
    genericName: "Loperamide",
    category: "Digestion",
    description: "Anti-diarrheal medicine used for short-term symptom control.",
    variants: [
      { dosage: "2mg", form: "Capsule", basePrice: 1500, sku: "LOPE-002-CAP" },
    ],
  },
  {
    genericName: "Artemether-Lumefantrin",
    category: "Anti-Malarial",
    description: "First-line ACT combination therapy for uncomplicated malaria.",
    variants: [
      { dosage: "20/120mg", form: "Tablet", basePrice: 3500, sku: "ARTL-020-TAB" },
    ],
  },
  {
    genericName: "Zinc Sulphate Syrup",
    category: "Vitamins",
    description: "Zinc supplement syrup used in pediatric diarrhea management.",
    variants: [
      { dosage: "10mg/5ml", form: "Syrup", basePrice: 1800, sku: "ZNCS-010-SYR" },
    ],
  },
];

const insurerSeeds = {
  parents: [
    { key: "rssb", name: "RSSB - Mutuelle", coveragePercentage: 0, tier: 0, umbrellaCode: "RSSB", isUmbrellaProvider: true },
    { key: "radiant", name: "Radiant", coveragePercentage: 75, tier: 0, umbrellaCode: "RADIANT", isUmbrellaProvider: false },
    { key: "mmi", name: "MMI", coveragePercentage: 90, tier: 0, umbrellaCode: "MMI", isUmbrellaProvider: false },
  ],
  children: [
    { key: "rssb-cat-1", parentKey: "rssb", name: "RSSB - Mutuelle (Category 1)", coveragePercentage: 100, tier: 1, umbrellaCode: "RSSB" },
    { key: "rssb-cat-2", parentKey: "rssb", name: "RSSB - Mutuelle (Category 2)", coveragePercentage: 90, tier: 2, umbrellaCode: "RSSB" },
    { key: "rssb-cat-3", parentKey: "rssb", name: "RSSB - Mutuelle (Category 3)", coveragePercentage: 85, tier: 3, umbrellaCode: "RSSB" },
  ],
};

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
  {
    fullName: "RSSB Lead Administrator",
    email: "rssb@gmail.com",
    password: "rssb@2026",
    role: "insurer",
    facilityId: "RSSB-HQ-001",
    insuranceProviderKey: "rssb",
  },
  {
    fullName: "Radiant Lead Administrator",
    email: "radiant@imitinet.rw",
    password: "radiant@2026",
    role: "insurer",
    facilityId: "RAD-001",
    insuranceProviderKey: "radiant",
  },
  {
    fullName: "MMI Lead Administrator",
    email: "mmi@imitinet.rw",
    password: "mmi@2026",
    role: "insurer",
    facilityId: "MMI-001",
    insuranceProviderKey: "mmi",
  },
  {
    fullName: "Minisante Chief Regulator",
    email: "Minisante@gmail.com",
    password: "minisante@2026",
    role: "regulator",
  },
  {
    fullName: "Kigali Reception Lead",
    email: "reception@imitinet.rw",
    password: "reception@2026",
    role: "receptionist",
    facilityId: "HOSP-KGL-001",
  },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const locations = [
  "Shelf A1", "Shelf A2", "Shelf B1", "Shelf B2",
  "Shelf C1", "Shelf C3", "Refrigerator B2", "Refrigerator A1",
];

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
      mongoose.connection.dropCollection("patientverifications").catch(() => null),
      mongoose.connection.dropCollection("patientqrsessions").catch(() => null),
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
      PatientVerification.deleteMany({}),
      PatientQrSession.deleteMany({}),
      User.deleteMany({}),
      Pharmacy.deleteMany({}),
      InsuranceProvider.deleteMany({}),
    ]);

    const createdPharmacies = await Pharmacy.insertMany(pharmacies);
    const createdParentInsurers = await InsuranceProvider.insertMany(
      insurerSeeds.parents.map((provider) => ({
        name: provider.name,
        coveragePercentage: provider.coveragePercentage,
        tier: provider.tier,
        umbrellaCode: provider.umbrellaCode,
        isUmbrellaProvider: provider.isUmbrellaProvider,
      }))
    );
    const insurerKeyMap = new Map(
      insurerSeeds.parents.map((provider, index) => [provider.key, createdParentInsurers[index]])
    );
    const createdChildInsurers = await InsuranceProvider.insertMany(
      insurerSeeds.children.map((provider) => ({
        name: provider.name,
        coveragePercentage: provider.coveragePercentage,
        tier: provider.tier,
        umbrellaCode: provider.umbrellaCode,
        parentProviderId: insurerKeyMap.get(provider.parentKey)._id,
      }))
    );
    const createdInsurers = [...createdParentInsurers, ...createdChildInsurers];
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
        sku: variant.sku,
      }));
    });

    const createdVariants = await MedicineVariant.insertMany(variantDocuments);

    // ─── Enhanced Inventory Seeding with Traceability ───
    const inventoryDocuments = [];
    const now = new Date();

    // Define edge-case variants for Kigali Central (pharmacy[0])
    const lowStockSKUs = new Set([
      "AMOX-250-CAP", "DICL-075-INJ", "DOXY-100-CAP",
      "AZIT-500-TAB", "LOPE-002-CAP", "ARTL-020-TAB",
      "CETI-005-SYR", "METR-400-TAB",
    ]);
    const expiringSoonSKUs = new Set([
      "IBUP-400-TAB", "PARA-120-SYR", "BENY-100-SYR",
      "OMEP-020-CAP", "ZNCS-010-SYR",
    ]);

    const createdUsers = await User.create(
      users.map((user) => ({
        ...user,
        pharmacyProfileId:
          user.role === "pharmacy" ? createdPharmacies[0]._id : undefined,
        insuranceProviderId:
          user.role === "insurer" ? insurerKeyMap.get(user.insuranceProviderKey)?._id : undefined,
        location:
          user.role === "pharmacy" ? createdPharmacies[0].location : undefined,
      }))
    );

    let batchCounter = 0;

    createdPharmacies.forEach((pharmacy, pharmacyIndex) => {
      createdVariants.forEach((variant) => {
        if (Math.random() < 0.72) {
          batchCounter++;
          const variance = randomInt(-300, 1800);
          const isKigaliCentral = pharmacyIndex === 0;
          const sku = variant.sku;
          const group = createdMedicineGroups.find((item) =>
            item._id.equals(variant.medicineGroupId)
          );

          let quantity;
          let expiryDate;

          if (isKigaliCentral && lowStockSKUs.has(sku)) {
            // Low stock: 3-18 units
            quantity = randomInt(3, 18);
            expiryDate = new Date(now);
            expiryDate.setMonth(expiryDate.getMonth() + randomInt(8, 24));
          } else if (isKigaliCentral && expiringSoonSKUs.has(sku)) {
            // Expiring soon: < 3 months
            quantity = randomInt(30, 100);
            expiryDate = new Date(now);
            expiryDate.setDate(expiryDate.getDate() + randomInt(15, 85));
          } else {
            quantity = randomInt(20, 200);
            expiryDate = new Date(now);
            expiryDate.setMonth(expiryDate.getMonth() + randomInt(6, 36));
          }

          let stockStatus = "In Stock";
          if (quantity < 20) stockStatus = "Low Stock";
          if (quantity <= 0) stockStatus = "Out of Stock";

          inventoryDocuments.push({
            pharmacyId: pharmacy._id,
            medicineVariantId: variant._id,
            nationalMedicineId: buildNationalMedicineId({
              genericName: group?.genericName || variant.sku,
              sku: variant.sku,
            }),
            medicineName: buildInventoryMedicineName({
              genericName: group?.genericName || variant.sku,
              dosage: variant.dosage,
              form: variant.form,
            }),
            sku: variant.sku,
            category: group?.category || "General",
            batchNumber: `BATCH-${String(batchCounter).padStart(4, "0")}`,
            stockStatus,
            quantity,
            unitPrice: Math.max(500, variant.basePrice + variance),
            priceRWF: Math.max(500, variant.basePrice + variance),
            expiryDate,
            location: locations[randomInt(0, locations.length - 1)],
          });
        }
      });
    });

    await Inventory.insertMany(inventoryDocuments);


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

    const insertedPrescriptions = await Prescription.insertMany(prescriptions);

    const claimDocuments = [];
    const statuses = ["Approved", "Pending", "Rejected"];

    const targetPharmacy = createdUsers.find((u) => u.role === "pharmacy");
    const patientUsers = createdUsers.filter((u) => u.role === "patient");
    const insurerDocs = createdInsurers.filter((provider) => !provider.isUmbrellaProvider);

    for (let i = 0; i < 75; i++) {
      const claimStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const submittedAt = new Date();
      submittedAt.setDate(submittedAt.getDate() - Math.floor(Math.random() * 7));
      submittedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const totalAmountRWF = Math.floor(Math.random() * 15000) + 1500;
      const coveragePercentage = Math.random() < 0.5 ? 85 : 100;
      const coveredAmountRWF = Math.round((totalAmountRWF * coveragePercentage) / 100);
      const patientPaysRWF = totalAmountRWF - coveredAmountRWF;

      let approvalTimeHours = 0;
      if (claimStatus !== "Pending") {
        approvalTimeHours = Math.floor(Math.random() * 24) + 12;
      }

      const selectedPatient = patientUsers[Math.floor(Math.random() * patientUsers.length)];
      const selectedInsurer = insurerDocs[Math.floor(Math.random() * insurerDocs.length)];

      const selectedVariant = createdVariants[Math.floor(Math.random() * createdVariants.length)];
      const selectedGroup = createdMedicineGroups.find(g => String(g._id) === String(selectedVariant.medicineGroupId));
      
      const paymentChannels = ["Bank Transfer", "MTN MoMo", "Airtel Money", "Internal Check"];
      const selectedPaymentChannel = paymentChannels[Math.floor(Math.random() * paymentChannels.length)];

      const medicineSnapshot = [{
        name: selectedGroup.genericName,
        category: selectedGroup.category,
        system: ["Antibiotics", "Pain Relief", "Anti-Malarial"].includes(selectedGroup.category) ? "ATC" : "MoH-RW",
        standardizedCode: `${selectedVariant.sku}-${selectedVariant.dosage}`,
        quantity: Math.floor(Math.random() * 5) + 1,
      }];

      claimDocuments.push({
        claimId: `CLM-${Math.floor(10000 + Math.random() * 90000)}`,
        patientId: selectedPatient._id,
        pharmacyId: targetPharmacy._id,
        prescriptionId: insertedPrescriptions[Math.floor(Math.random() * insertedPrescriptions.length)]._id,
        insuranceProviderId: selectedInsurer._id,
        patientName: selectedPatient.fullName,
        insurerName: selectedInsurer.name,
        approvalTimeHours,
        totalAmountRWF,
        coveredAmountRWF,
        patientPaysRWF,
        paymentChannel: selectedPaymentChannel,
        status: claimStatus,
        medicineSnapshot,
        submittedAt,
      });
    }

    await Claim.insertMany(claimDocuments);

    // ─── Seed Materialized View Baseline ───
    await mongoose.connection.dropCollection("nationalstats_materialized").catch(() => null);
    await NationalStatsMaterialized.create({
      kpis: { ibitaro: 450, patients: 18000, pharmacyCoverage: 85, medicinesTracked: 2500000 },
      coverageByRegion: [
        { region: "Kigali", actualCoverage: 88, targetCoverage: 95 },
        { region: "South", actualCoverage: 82, targetCoverage: 90 },
        { region: "East", actualCoverage: 78, targetCoverage: 85 },
        { region: "West", actualCoverage: 86, targetCoverage: 92 },
        { region: "North", actualCoverage: 91, targetCoverage: 96 }
      ],
      consultationTrends: [
        { category: "Malaria", cases2025: 450000, cases2026: 400000 },
        { category: "HIV/AIDS", cases2025: 210000, cases2026: 205000 },
        { category: "Resp.", cases2025: 320000, cases2026: 350000 },
        { category: "TB", cases2025: 20000, cases2026: 18000 },
        { category: "Diabetes", cases2025: 65000, cases2026: 72000 }
      ],
      complianceStatus: { compliant: 75, underReview: 15, nonCompliant: 10 },
      recentSupplyChain: [
        { medication: "Amoxicillin", status: "Delivered", location: "Kigali Central Pharmacy", time: "10:30" },
        { medication: "Paracetamol", status: "In Transit", location: "Muhanga District Hospital", time: "15:00" },
        { medication: "Insulin", status: "Shipped", location: "Rubavu Regional Warehouse", time: "09:15" },
        { medication: "Antimalarial", status: "Delivered", location: "Gisenyi Health Center", time: "18:45" },
        { medication: "Vaccine A", status: "Pending Auth.", location: "National Vaccine Cold Store", time: "11:00" }
      ],
      facilityPerformance: { patientRatio: "1:500", avgWaitTimeMin: 45, portalUtilization: 78, supplyChainScore: 92 }
    });

    console.log(
      `Seed complete: ${createdUsers.length} users, ${createdPharmacies.length} pharmacies, ${createdMedicineGroups.length} medicine groups, ${createdVariants.length} variants, ${createdInsurers.length} insurers, ${inventoryDocuments.length} inventory records, ${prescriptions.length} prescriptions, ${claimDocuments.length} claims`
    );
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();
