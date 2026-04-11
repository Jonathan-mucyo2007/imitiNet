import dotenv from "dotenv";
import mongoose from "mongoose";
import Medicine from "../models/Medicine.js";

dotenv.config({ path: "./.env" });

const dosageByMedicineName = {
  Paracetamol: "500mg tablets",
  Ibuprofen: "400mg tablets",
  Diclofenac: "50mg tablets",
  Amoxicillin: "500mg capsules",
  Doxycycline: "100mg capsules",
  Azithromycin: "250mg tablets",
  "Vitamin C": "1000mg tablets",
  Multivitamin: "Daily tablets",
  Zinc: "20mg tablets",
  Benylin: "100ml syrup",
  Cetirizine: "10mg tablets",
  Salbutamol: "100mcg inhaler",
  Omeprazole: "20mg capsules",
  ORS: "Sachet",
  Metronidazole: "400mg tablets",
  Panadol: "500mg tablets",
  "Cough Syrup": "120ml bottle",
  "Folic Acid": "5mg tablets",
  Ciprofloxacin: "500mg tablets",
  Loperamide: "2mg capsules",
};

async function migrateMedicineDosage() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for dosage migration");

    const medicines = await Medicine.collection
      .find({
        $or: [{ dosage: { $exists: false } }, { dosage: null }, { dosage: "" }],
      })
      .toArray();

    let updatedCount = 0;

    for (const medicine of medicines) {
      const dosage = dosageByMedicineName[medicine.genericName] || "Standard dosage";

      const result = await Medicine.updateOne(
        { _id: medicine._id },
        { $set: { dosage } }
      );

      updatedCount += result.modifiedCount;
    }

    console.log(`Dosage migration complete. Updated ${updatedCount} medicines.`);
  } catch (error) {
    console.error("Dosage migration failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

migrateMedicineDosage();
