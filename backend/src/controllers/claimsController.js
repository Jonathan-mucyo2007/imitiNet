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
import { evaluateClaimFraudRisk } from "../services/aiFraudService.js";
import PharmacyProfile from "../models/PharmacyProfile.js";
import { sendMockPharmacyNotification } from "../services/pharmacyNotificationService.js";
import traceabilityGateway from "../services/traceabilityGatewaySync.js";
import { getIO } from "../socket.js";
import { resolveInsurerScopeByUserId } from "../utils/insurerScope.js";

const REVIEWABLE_CLAIM_STATUSES = ["Pending", "Flagged_By_AI"];

function buildClaimId() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `CLM-${random}`;
}

async function buildPrescriptionCoverageSummary({
  prescriptionId,
  insuranceProviderId,
  pharmacyUserId,
  session = null,
}) {
  if (
    !mongoose.Types.ObjectId.isValid(prescriptionId) ||
    !mongoose.Types.ObjectId.isValid(insuranceProviderId)
  ) {
    return { error: { status: 400, message: "Invalid prescription or insurance provider ID." } };
  }

  const pharmacyUserQuery = User.findById(pharmacyUserId).select("role pharmacyProfileId");
  const prescriptionQuery = Prescription.findById(prescriptionId)
    .populate("patientId", "fullName email insuranceStatus")
    .populate({
      path: "medications.medicineVariantId",
      select: "dosage form basePrice medicineGroupId sku",
      populate: {
        path: "medicineGroupId",
        select: "genericName category",
      },
    });
  const providerQuery = InsuranceProvider.findById(insuranceProviderId);

  if (session) {
    pharmacyUserQuery.session(session);
    prescriptionQuery.session(session);
    providerQuery.session(session);
  }

  const [pharmacyUser, prescription, provider] = await Promise.all([
    pharmacyUserQuery,
    prescriptionQuery,
    providerQuery,
  ]);

  if (!pharmacyUser) {
    return { error: { status: 404, message: "Pharmacy user not found." } };
  }

  if (pharmacyUser.role !== "pharmacy") {
    return { error: { status: 403, message: "Only pharmacies can process claims." } };
  }

  if (!pharmacyUser.pharmacyProfileId) {
    return {
      error: { status: 400, message: "Pharmacy account is not linked to a pharmacy profile." },
    };
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

  const inventoryQuery = Inventory.find({
    pharmacyId: pharmacyUser.pharmacyProfileId,
    medicineVariantId: {
      $in: prescription.medications.map((item) => item.medicineVariantId._id),
    },
    quantity: { $gt: 0 },
  })
    .sort({ expiryDate: 1 })
    .select("medicineVariantId priceRWF stockStatus quantity expiryDate batchNumber");

  if (session) {
    inventoryQuery.session(session);
  }

  const inventoryRecords = await inventoryQuery;
  const inventoryMap = new Map();

  inventoryRecords.forEach((record) => {
    const key = String(record.medicineVariantId);
    if (!inventoryMap.has(key)) {
      inventoryMap.set(key, []);
    }

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

    const totalAvailable = lots.reduce((sum, lot) => sum + lot.quantity, 0);

    if (totalAvailable < medication.quantity) {
      return {
        error: {
          status: 400,
          message: `${medication.medicineVariantId.medicineGroupId.genericName} ${medication.medicineVariantId.dosage} ${medication.medicineVariantId.form} has insufficient stock (need ${medication.quantity}, have ${totalAvailable}).`,
        },
      };
    }

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
    const providers = await InsuranceProvider.find({ isUmbrellaProvider: { $ne: true } }).sort({
      name: 1,
    });
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

    if (!variant) {
      return res.status(404).json({ message: "Medicine variant not found." });
    }

    if (!provider) {
      return res.status(404).json({ message: "Insurance provider not found." });
    }

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
  let session = null;

  try {
    const { prescriptionId, insuranceProviderId, verificationToken } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(prescriptionId) ||
      !mongoose.Types.ObjectId.isValid(insuranceProviderId)
    ) {
      return res.status(400).json({ message: "Invalid prescription or insurance provider ID." });
    }

    session = await mongoose.startSession();

    const queuedTraceabilityEvents = [];
    const queuedSocketEvents = [];
    let responsePayload = null;

    await session.withTransaction(async () => {
      const summary = await buildPrescriptionCoverageSummary({
        prescriptionId,
        insuranceProviderId,
        pharmacyUserId: req.user.id,
        session,
      });

      if (summary.error) {
        throw Object.assign(new Error(summary.error.message), {
          statusCode: summary.error.status,
        });
      }

      const existingClaim = await Claim.findOne({
        prescriptionId,
        pharmacyId: req.user.id,
        insuranceProviderId,
        status: { $in: ["Pending", "Flagged_By_AI", "Approved"] },
      }).session(session);

      if (existingClaim) {
        throw Object.assign(
          new Error(`Claim ${existingClaim.claimId} has already been submitted for this prescription.`),
          { statusCode: 409 }
        );
      }

      if (verificationToken) {
        const activeVerification = await PatientVerification.findOne({
          _id: verificationToken,
          isVerified: true,
          expiresAt: { $gt: new Date() },
        }).session(session);

        if (!activeVerification) {
          throw Object.assign(new Error("Verification token is invalid or has expired."), {
            statusCode: 400,
          });
        }
      }

      const medicineSnapshot = summary.prescription.medications.map((item) => ({
        name: item.medicineVariantId.medicineGroupId.genericName,
        category: item.medicineVariantId.medicineGroupId.category,
        standardizedCode: `${item.medicineVariantId.sku}-${item.medicineVariantId.dosage}`,
        quantity: item.quantity,
      }));

      const fraudAssessment = evaluateClaimFraudRisk({
        patientName: summary.prescription.patientId.fullName,
        insurerName: summary.provider.name,
        totalAmountRWF: summary.totals.totalAmountRWF,
        coveredAmountRWF: summary.totals.coveredAmountRWF,
        patientPaysRWF: summary.totals.patientPaysRWF,
        medicineSnapshot,
      });

      const initialStatus = fraudAssessment.isAnomalous ? "Flagged_By_AI" : "Pending";
      const [claim] = await Claim.create(
        [
          {
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
            status: initialStatus,
            aiFraudCheck: fraudAssessment,
            medicineSnapshot,
            submittedAt: new Date(),
          },
        ],
        { session }
      );

      for (const item of summary.prescription.medications) {
        let remainingToDeduct = item.quantity;
        const lots = await Inventory.find({
          pharmacyId: summary.pharmacyUser.pharmacyProfileId,
          medicineVariantId: item.medicineVariantId._id,
          quantity: { $gt: 0 },
        })
          .sort({ expiryDate: 1 })
          .session(session);

        for (const lot of lots) {
          if (remainingToDeduct <= 0) {
            break;
          }

          const deductFromThisLot = Math.min(lot.quantity, remainingToDeduct);
          lot.quantity -= deductFromThisLot;
          remainingToDeduct -= deductFromThisLot;

          if (lot.quantity <= 0) {
            lot.stockStatus = "Out of Stock";
          } else if (lot.quantity < 20) {
            lot.stockStatus = "Low Stock";
          }

          await lot.save({ session });

          queuedTraceabilityEvents.push({
            pharmacyId: String(summary.pharmacyUser.pharmacyProfileId),
            variantId: String(item.medicineVariantId._id),
            changeType: "DISPENSED",
            quantityDelta: -deductFromThisLot,
            batchNumber: lot.batchNumber,
          });
        }
      }

      summary.prescription.status = "Fulfilled";
      await summary.prescription.save({ session });

      if (fraudAssessment.isAnomalous) {
        queuedSocketEvents.push({
          event: "fraud_alert_detected",
          payload: {
            type: "AI Fraud Review Required",
            message: `Claim ${claim.claimId} was flagged before insurer review.`,
            claimId: claim.claimId,
            reasonCode: fraudAssessment.reasonCode,
            anomalyScore: fraudAssessment.anomalyScore,
            timestamp: new Date().toISOString(),
          },
        });
      }

      queuedSocketEvents.push({
        event: "claim_status_updated",
        payload: {
          claimId: claim.claimId,
          claimObjectId: String(claim._id),
          status: claim.status,
          pharmacyId: String(claim.pharmacyId),
          insuranceProviderId: String(claim.insuranceProviderId),
        },
      });

      queuedSocketEvents.push({
        event: "prescription_fulfilled",
        payload: {
          patientId: String(summary.prescription.patientId._id),
          prescriptionId: String(summary.prescription._id),
          rxCode: summary.prescription.prescriptionId,
          fulfilledAt: new Date().toISOString(),
        },
      });

      responsePayload = {
        message: `Claim ${claim.claimId} Submitted Successfully.`,
        claim: {
          id: claim._id,
          claimId: claim.claimId,
          status: claim.status,
          aiFraudCheck: claim.aiFraudCheck,
          verificationToken: claim.verificationToken,
          submittedAt: claim.submittedAt,
        },
        breakdown: summary.totals,
      };
    });

    queuedTraceabilityEvents.forEach((payload) => {
      traceabilityGateway.emit("inventory_mutated", payload);
    });

    const io = getIO();
    queuedSocketEvents.forEach(({ event, payload }) => {
      io.emit(event, payload);
    });

    return res.status(201).json(responsePayload);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error("Claim submission failed", error);
    return res.status(500).json({ message: "Unable to submit claim right now." });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const cancelClaim = async (req, res) => {
  try {
    const claim = await Claim.findOne({
      _id: req.params.id,
      pharmacyId: req.user.id,
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found or access denied." });
    }

    if (!REVIEWABLE_CLAIM_STATUSES.includes(claim.status)) {
      return res.status(400).json({
        message: "Only pending insurer-review claims can be cancelled.",
      });
    }

    claim.status = "Cancelled";
    await claim.save();

    getIO().emit("claim_status_updated", {
      claimId: claim.claimId,
      claimObjectId: String(claim._id),
      status: claim.status,
      pharmacyId: String(claim.pharmacyId),
      insuranceProviderId: String(claim.insuranceProviderId),
    });

    return res.status(200).json({
      message: `Claim ${claim.claimId} has been cancelled.`,
      claim: {
        id: claim._id,
        claimId: claim.claimId,
        status: claim.status,
      },
    });
  } catch (error) {
    console.error("Claim cancellation failed", error);
    return res.status(500).json({ message: "Failed to cancel claim." });
  }
};

export const adjudicateClaim = async (req, res) => {
  try {
    if (req.user?.role === "pharmacy") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (req.user?.role !== "insurer") {
      return res.status(403).json({ message: "Only insurers can adjudicate claims." });
    }

    const { status, rejectionReason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'." });
    }

    if (status === "Rejected" && !String(rejectionReason || "").trim()) {
      return res.status(400).json({ message: "Reason for rejection is required." });
    }

    const insurerScope = await resolveInsurerScopeByUserId(req.user.id);

    if (insurerScope.error) {
      return res.status(insurerScope.error.status).json({ message: insurerScope.error.message });
    }

    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Claim not found." });
    }

    if (!REVIEWABLE_CLAIM_STATUSES.includes(claim.status)) {
      return res.status(400).json({
        message: `Claim has already been ${claim.status.toLowerCase()}.`,
      });
    }

    const isWithinInsurerScope = insurerScope.scopedProviderIds.some(
      (providerId) => String(providerId) === String(claim.insuranceProviderId)
    );

    if (!isWithinInsurerScope) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const now = new Date();
    const submittedAt = new Date(claim.submittedAt);
    const approvalTimeHours = Math.max(1, Math.round((now - submittedAt) / (1000 * 60 * 60)));

    claim.status = status;
    claim.approvalTimeHours = approvalTimeHours;
    claim.rejectionReason = status === "Rejected" ? String(rejectionReason).trim() : null;
    await claim.save();

    if (status === "Rejected") {
      const pharmacyUser = await User.findById(claim.pharmacyId).select(
        "pharmacyProfileId fullName email"
      );

      if (pharmacyUser?.pharmacyProfileId) {
        const pharmacyProfile = await PharmacyProfile.findById(
          pharmacyUser.pharmacyProfileId
        ).select("facilityName name contactEmail notificationPreferences");

        if (pharmacyProfile?.notificationPreferences?.emailOnClaimRejected !== false) {
          const emailResult = await sendMockPharmacyNotification({
            pharmacyProfile,
            claim,
            rejectionReason: claim.rejectionReason,
          });

          getIO().emit("pharmacy_notification_queued", {
            pharmacyUserId: String(claim.pharmacyId),
            claimId: claim.claimId,
            type: emailResult.notificationType,
            targetEmail: emailResult.targetEmail,
          });
        }
      }
    }

    getIO().emit("claim_status_updated", {
      claimId: claim.claimId,
      claimObjectId: String(claim._id),
      status: claim.status,
      pharmacyId: String(claim.pharmacyId),
      insuranceProviderId: String(claim.insuranceProviderId),
      rejectionReason: claim.rejectionReason,
    });

    return res.status(200).json({
      message: `Claim ${claim.claimId} has been ${status.toLowerCase()}.`,
      claim: {
        id: claim._id,
        claimId: claim.claimId,
        status: claim.status,
        approvalTimeHours: claim.approvalTimeHours,
        rejectionReason: claim.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Claim adjudication failed", error);
    return res.status(500).json({ message: "Failed to adjudicate claim." });
  }
};
