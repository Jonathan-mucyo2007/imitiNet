/**
 * One-time legacy fulfillment migration.
 *
 * Run from the backend directory:
 * `node src/scripts/migrateLegacyFulfillments.js`
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import Claim from "../models/Claim.js";
import Prescription from "../models/Prescription.js";

dotenv.config({ path: "./.env" });

async function migrateLegacyFulfillments() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected for legacy fulfillment migration");

    const claimedPrescriptionIds = await Claim.distinct("prescriptionId", {
      prescriptionId: { $ne: null },
    });

    if (claimedPrescriptionIds.length === 0) {
      console.log("No claims found. No legacy prescriptions needed updating.");
      return;
    }

    const legacyActiveCount = await Prescription.countDocuments({
      _id: { $in: claimedPrescriptionIds },
      status: "Active",
    });

    const result = await Prescription.updateMany(
      {
        _id: { $in: claimedPrescriptionIds },
        status: "Active",
      },
      {
        $set: { status: "Fulfilled" },
      }
    );

    console.log(
      `Legacy fulfillment migration complete. Updated ${result.modifiedCount} prescriptions from Active to Fulfilled.`
    );
    console.log(
      `Scanned ${claimedPrescriptionIds.length} unique claimed prescription IDs. ${legacyActiveCount} legacy Active prescriptions were eligible for synchronization.`
    );
  } catch (error) {
    console.error("Legacy fulfillment migration failed", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

migrateLegacyFulfillments();
