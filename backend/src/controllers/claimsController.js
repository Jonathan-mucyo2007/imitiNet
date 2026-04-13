import mongoose from "mongoose";
import Claim from "../models/Claim.js";
import Inventory from "../models/Inventory.js";
import MedicineVariant from "../models/MedicineVariant.js";
import MedicineGroup from "../models/MedicineGroup.js";
import InsuranceProvider from "../models/InsuranceProvider.js";
import Prescription from "../models/Prescription.js";
import PatientVerification from "../models/PatientVerification.js";
import User from "../models/User.js";
import {
  calculateCoverageBreakdown,
  validateCoverageInputs,
} from "../services/claimsService.js";
import traceabilityGateway from "../services/traceabilityGatewaySync.js";

function buildClaimId() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `CLM-${random}`;
}

async function buildPrescriptionCoverageSummary({ prescriptionId, insuranceProviderId, pharmacyUserId }) {
  if (
    !mongoose.Types.ObjectId.isValid(prescriptionId) ||
    !mongoose.Types.ObjectId.isValid(insuranceProviderId)
  ) {
    return { error: { status: 400, message: "Invalid prescription or insurance provider ID." } };
  }

  const [pharmacyUser, prescription, provider] = await Promise.all([
    User.findById(pharmacyUserId).select("role pharmacyProfileId"),
    Prescription.findById(prescriptionId)
      .populate("patientId", "fullName email insuranceStatus")
      .populate({
        path: "medications.medicineVariantId",
        select: "dosage form basePrice medicineGroupId",
        populate: {
          path: "medicineGroupId",
          select: "genericName category",
        },
      }),
    InsuranceProvider.findById(insuranceProviderId),
  ]);

  if (!pharmacyUser) {
    return { error: { status: 404, message: "Pharmacy user not found." } };
  }

  if (pharmacyUser.role !== "pharmacy") {
    return { error: { status: 403, message: "Only pharmacies can process claims." } };
  }

  if (!pharmacyUser.pharmacyProfileId) {
    return { error: { status: 400, message: "Pharmacy account is not linked to a pharmacy profile." } };
  }

  if (!prescription) {
    return { error: { status: 404, message: "Prescription not found." } };
  }

  if (prescription.status !== "Active") {
    return { error: { status: 400, message: "Prescription has already been fulfilled." } };
  }

  if (!provider) {
    return { error: { status: 404, message: "Insurance provider not found." } };
  }

  if (prescription.patientId?.insuranceStatus === "inactive") {
    return { error: { status: 403, message: "Insurance inactive. Please contact RSSB." } };
  }

  // FIFO: query all lots per variant, sorted oldest expiry first
  const inventoryRecords = await Inventory.find({
    pharmacyId: pharmacyUser.pharmacyProfileId,
    medicineVariantId: {
      $in: prescription.medications.map((item) => item.medicineVariantId._id),
    },
    quantity: { $gt: 0 },
  })
    .sort({ expiryDate: 1 })
    .select("medicineVariantId priceRWF stockStatus quantity expiryDate batchNumber");

  // Group lots by variant for FIFO iteration
  const inventoryMap = new Map();
  inventoryRecords.forEach((record) => {
    const key = String(record.medicineVariantId);
    if (!inventoryMap.has(key)) inventoryMap.set(key, []);
    inventoryMap.get(key).push(record);
  });

  const lineItems = [];
  let totalAmountRWF = 0;
  let coveredAmountRWF = 0;

  for (const medication of prescription.medications) {
    const lots = inventoryMap.get(String(medication.medicineVariantId._id));

    if (!lots || lots.length === 0) {
      return {
        error: {
          status: 400,
          message: `Selected pharmacy does not stock ${medication.medicineVariantId.medicineGroupId.genericName} ${medication.medicineVariantId.dosage} ${medication.medicineVariantId.form}.`,
        },
      };
    }

    // FIFO total availability check across all lots
    const totalAvailable = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (totalAvailable < medication.quantity) {
      return {
        error: {
          status: 400,
          message: `${medication.medicineVariantId.medicineGroupId.genericName} ${medication.medicineVariantId.dosage} ${medication.medicineVariantId.form} has insufficient stock (need ${medication.quantity}, have ${totalAvailable}).`,
        },
      };
    }

    // Use the oldest lot's price for billing
    const inventoryRecord = lots[0];

    const breakdown = calculateCoverageBreakdown({
      unitPriceRWF: inventoryRecord.priceRWF,
      quantity: medication.quantity,
      coveragePercentage: provider.coveragePercentage,
    });

    totalAmountRWF += breakdown.totalPriceRWF;
    coveredAmountRWF += breakdown.coveredRWF;

    lineItems.push({
      medicineVariantId: medication.medicineVariantId._id,
      medicineName: medication.medicineVariantId.medicineGroupId.genericName,
      dosage: medication.medicineVariantId.dosage,
      form: medication.medicineVariantId.form,
      quantity: medication.quantity,
      instructions: medication.instructions,
      stockStatus: inventoryRecord.stockStatus,
      unitPriceRWF: inventoryRecord.priceRWF,
      lineTotalRWF: breakdown.totalPriceRWF,
      coveredRWF: breakdown.coveredRWF,
      patientPaysRWF: breakdown.patientPaysRWF,
    });
  }

  console.log("--- MATH AUDIT ---");
  console.log("Line Items:", lineItems);
  console.log("Calculated Total:", totalAmountRWF);

  return {
    pharmacyUser,
    prescription,
    provider,
    lineItems,
    totals: {
      totalAmountRWF,
      coveredAmountRWF,
      patientPaysRWF: totalAmountRWF - coveredAmountRWF,
    },
  };
}

export const getProviders = async (req, res) => {
  try {
    const providers = await InsuranceProvider.find({}).sort({ name: 1 });
    return res.status(200).json(providers);
  } catch (error) {
    console.error("Failed to fetch insurance providers", error);
    return res.status(500).json({ message: "Unable to fetch providers" });
  }
};

export const checkCoverage = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity ?? 1);
    const medicineVariantId = req.body.medicineVariantId ?? req.body.medicineId;
    const { insuranceProviderId } = req.body;

    const validationMessage = validateCoverageInputs({
      medicineId: medicineVariantId,
      insuranceProviderId,
      quantity,
    });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (
      !mongoose.Types.ObjectId.isValid(medicineVariantId) ||
      !mongoose.Types.ObjectId.isValid(insuranceProviderId)
    ) {
      return res.status(400).json({ message: "Invalid medicine variant or insurance provider ID." });
    }

    const user = await User.findById(req.user.id).select("role insuranceStatus");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can verify medicine coverage." });
    }

    if (user.insuranceStatus === "inactive") {
      return res.status(403).json({ message: "Insurance inactive. Please contact RSSB." });
    }

    const [variant, provider] = await Promise.all([
      MedicineVariant.findById(medicineVariantId),
      InsuranceProvider.findById(insuranceProviderId),
    ]);

    if (!variant) return res.status(404).json({ message: "Medicine variant not found." });
    if (!provider) return res.status(404).json({ message: "Insurance provider not found." });

    const medicineGroup = await MedicineGroup.findById(variant.medicineGroupId).select(
      "genericName category"
    );

    if (!medicineGroup) {
      return res.status(404).json({ message: "Medicine group not found." });
    }

    const breakdown = calculateCoverageBreakdown({
      unitPriceRWF: variant.basePrice,
      quantity,
      coveragePercentage: provider.coveragePercentage,
    });

    return res.status(200).json({
      status: "Verified",
      medicine: {
        variantId: variant._id,
        genericName: medicineGroup.genericName,
        category: medicineGroup.category,
        dosage: variant.dosage,
        form: variant.form,
      },
      breakdown,
      message: `Coverage verified based on seeded ${provider.name} data.`,
    });
  } catch (error) {
    console.error("Coverage simulation failed", error);
    return res.status(500).json({ message: "Unable to simulate coverage right now." });
  }
};

export const previewPrescriptionClaim = async (req, res) => {
  try {
    const { prescriptionId, insuranceProviderId } = req.body;

    const summary = await buildPrescriptionCoverageSummary({
      prescriptionId,
      insuranceProviderId,
      pharmacyUserId: req.user.id,
    });

    if (summary.error) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    return res.status(200).json({
      status: "Verified",
      eligibilityMessage:
        summary.provider.tier > 0
          ? `Eligibility Verified: Category ${summary.provider.tier}.`
          : "Eligibility Verified: Standard plan.",
      prescription: {
        id: summary.prescription._id,
        prescriptionId: summary.prescription.prescriptionId,
        patientName: summary.prescription.patientId.fullName,
        prescribingDoctor: summary.prescription.prescribingDoctor,
        originatingEmr: summary.prescription.originatingEmr,
      },
      provider: {
        id: summary.provider._id,
        name: summary.provider.name,
        coveragePercentage: summary.provider.coveragePercentage,
      },
      lineItems: summary.lineItems,
      breakdown: summary.totals,
    });
  } catch (error) {
    console.error("Prescription verification failed", error);
    return res.status(500).json({ message: "Unable to verify prescription coverage right now." });
  }
};

export const submitClaim = async (req, res) => {
  try {
    const { prescriptionId, insuranceProviderId, verificationToken } = req.body;

    const summary = await buildPrescriptionCoverageSummary({
      prescriptionId,
      insuranceProviderId,
      pharmacyUserId: req.user.id,
    });

    if (summary.error) {
      return res.status(summary.error.status).json({ message: summary.error.message });
    }

    const existingClaim = await Claim.findOne({
      prescriptionId,
      pharmacyId: req.user.id,
      insuranceProviderId,
      status: { $in: ["Pending", "Approved"] },
    });

    if (existingClaim) {
      return res.status(409).json({
        message: `Claim ${existingClaim.claimId} has already been submitted for this prescription.`,
      });
    }

    if (verificationToken) {
      const activeVerification = await PatientVerification.findOne({
        _id: verificationToken,
        isVerified: true,
        expiresAt: { $gt: new Date() },
      });

      if (!activeVerification) {
        return res.status(400).json({
          message: "Verification token is invalid or has expired.",
        });
      }
    }

    try {
      const medicineSnapshot = summary.prescription.medications.map((item) => ({
        name: item.medicineVariantId.medicineGroupId.genericName,
        category: item.medicineVariantId.medicineGroupId.category,
        standardizedCode: `${item.medicineVariantId.sku}-${item.medicineVariantId.dosage}`,
        quantity: item.quantity,
      }));

      const claim = await Claim.create({
        claimId: buildClaimId(),
        patientId: summary.prescription.patientId._id,
        pharmacyId: req.user.id,
        prescriptionId,
        insuranceProviderId,
        patientName: summary.prescription.patientId.fullName,
        insurerName: summary.provider.name,
        verificationToken: verificationToken || null,
        approvalTimeHours: 0,
        totalAmountRWF: summary.totals.totalAmountRWF,
        coveredAmountRWF: summary.totals.coveredAmountRWF,
        patientPaysRWF: summary.totals.patientPaysRWF,
        status: "Pending", 
        medicineSnapshot,
        submittedAt: new Date(),
      });

      // ─── FIFO DISPENSING: deduct from oldest-expiry lots first ───
      for (const item of summary.prescription.medications) {
        let remainingToDeduct = item.quantity;
        const lots = await Inventory.find({
          pharmacyId: summary.pharmacyUser.pharmacyProfileId,
          medicineVariantId: item.medicineVariantId._id,
          quantity: { $gt: 0 },
        }).sort({ expiryDate: 1 }); // Oldest expiry first

        for (const lot of lots) {
          if (remainingToDeduct <= 0) break;

          const deductFromThisLot = Math.min(lot.quantity, remainingToDeduct);
          lot.quantity -= deductFromThisLot;
          remainingToDeduct -= deductFromThisLot;

          if (lot.quantity <= 0) {
            lot.stockStatus = "Out of Stock";
          } else if (lot.quantity < 20) {
            lot.stockStatus = "Low Stock";
          }
          await lot.save();

          // Non-blocking FDA traceability event
          traceabilityGateway.emit("inventory_mutated", {
            pharmacyId: String(summary.pharmacyUser.pharmacyProfileId),
            variantId: String(item.medicineVariantId._id),
            changeType: "DISPENSED",
            quantityDelta: -deductFromThisLot,
            batchNumber: lot.batchNumber,
          });
        }
      }

      summary.prescription.status = "Fulfilled";
      await summary.prescription.save();

      return res.status(201).json({
        message: `Claim ${claim.claimId} Submitted Successfully.`,
        claim: {
          id: claim._id,
          claimId: claim.claimId,
          status: claim.status,
          verificationToken: claim.verificationToken,
          submittedAt: claim.submittedAt,
        },
        breakdown: summary.totals,
      });

    } catch (dbError) {
      console.error("Database operation failed during claim submission:", dbError);
      return res.status(500).json({ message: "Failed to securely execute claim submission. Transaction aborted." });
    }
  } catch (error) {
    console.error("Claim submission failed", error);
    return res.status(500).json({ message: "Unable to submit claim right now." });
  }
};
