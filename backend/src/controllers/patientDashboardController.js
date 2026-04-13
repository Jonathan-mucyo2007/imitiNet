import crypto from "crypto";
import jwt from "jsonwebtoken";
import Claim from "../models/Claim.js";
import Pharmacy from "../models/Pharmacy.js";
import Prescription from "../models/Prescription.js";
import PatientQrSession from "../models/PatientQrSession.js";
import User from "../models/User.js";

const ACTIVE_PRESCRIPTION_STATUSES = ["Pending Dispense", "Active"];
const PATIENT_QR_TTL_SECONDS = 5 * 60;

function getFirstName(fullName = "") {
  return fullName.trim().split(/\s+/)[0] || "Patient";
}

function maskNationalId(nationalId = "") {
  if (!nationalId) {
    return null;
  }

  if (nationalId.length <= 7) {
    return `${nationalId.slice(0, 2)}***${nationalId.slice(-2)}`;
  }

  return `${nationalId.slice(0, 5)}...${nationalId.slice(-3)}`;
}

function generateRetrievalCode(prescription) {
  const numericSegment =
    prescription.prescriptionId?.replace(/\D/g, "").slice(-3).padStart(3, "0") ||
    String(prescription._id).slice(-3).toUpperCase();

  const emrSegment = prescription.originatingEmr === "eUbuzima" ? "EUB" : "OCL";
  return `RX-${numericSegment}-${emrSegment}`;
}

function inferInsuranceType(user, claims) {
  const latestInsurerName = claims.find((claim) => claim.insurerName)?.insurerName;

  if (latestInsurerName) {
    if (/rssb/i.test(latestInsurerName)) {
      return "RSSB / CBHI";
    }

    return latestInsurerName;
  }

  return user.insuranceStatus === "active" ? "RSSB / CBHI" : "Insurance Unverified";
}

function buildMockPharmacyLocator(prescription) {
  const primaryMedication = prescription.medications[0];
  const medicineName =
    primaryMedication?.medicineVariantId?.medicineGroupId?.genericName || "prescribed medicine";

  return [
    { name: "Kigali Central Pharmacy", stockStatus: "In Stock", eta: "0.9 km away", medicineName },
    { name: "Kipharma", stockStatus: "In Stock", eta: "1.4 km away", medicineName },
    { name: "Amahoro Pharmacy", stockStatus: "In Stock", eta: "2.1 km away", medicineName },
  ];
}

export async function getPatientDashboard(req, res) {
  try {
    const [user, prescriptions, recentClaims] = await Promise.all([
      User.findById(req.user.id).select("fullName email nationalId insuranceStatus role"),
      Prescription.find({
        patientId: req.user.id,
        status: { $in: ACTIVE_PRESCRIPTION_STATUSES },
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "medications.medicineVariantId",
          select: "dosage form medicineGroupId",
          populate: {
            path: "medicineGroupId",
            select: "genericName category",
          },
        }),
      Claim.find({ patientId: req.user.id })
        .sort({ submittedAt: -1 })
        .limit(5)
        .populate("pharmacyId", "fullName facilityId pharmacyProfileId")
        .select(
          "claimId insurerName totalAmountRWF coveredAmountRWF patientPaysRWF status submittedAt pharmacyId"
        ),
    ]);

    if (!user || user.role !== "patient") {
      return res.status(404).json({ message: "Patient profile not found." });
    }

    const pharmacyProfileIds = recentClaims
      .map((claim) => claim.pharmacyId?.pharmacyProfileId)
      .filter(Boolean);

    const pharmacies = await Pharmacy.find({
      _id: { $in: pharmacyProfileIds },
    }).select("name");

    const pharmacyNameMap = new Map(pharmacies.map((pharmacy) => [String(pharmacy._id), pharmacy.name]));
    const insuranceType = inferInsuranceType(user, recentClaims);

    const activePrescriptions = prescriptions.map((prescription) => ({
      id: prescription._id,
      prescriptionId: prescription.prescriptionId,
      retrievalCode: generateRetrievalCode(prescription),
      status: "Pending Dispense",
      prescribingDoctor: prescription.prescribingDoctor,
      originatingEmr: prescription.originatingEmr,
      issuedAt: prescription.createdAt,
      medications: prescription.medications.map((item) => ({
        medicineVariantId: item.medicineVariantId?._id || null,
        quantity: item.quantity,
        instructions: item.instructions,
        dosage: item.medicineVariantId?.dosage || null,
        form: item.medicineVariantId?.form || null,
        medicineName: item.medicineVariantId?.medicineGroupId?.genericName || "Medicine",
        category: item.medicineVariantId?.medicineGroupId?.category || "General",
      })),
      suggestedPharmacies: buildMockPharmacyLocator(prescription),
    }));

    const claims = recentClaims.map((claim) => ({
      id: claim._id,
      claimId: claim.claimId,
      date: claim.submittedAt,
      status: claim.status,
      providerName:
        pharmacyNameMap.get(String(claim.pharmacyId?.pharmacyProfileId)) ||
        claim.pharmacyId?.fullName ||
        claim.insurerName,
      insurerName: claim.insurerName,
      totalAmountRWF: claim.totalAmountRWF,
      coveredAmountRWF: claim.coveredAmountRWF,
      patientPaysRWF: claim.patientPaysRWF,
    }));

    return res.status(200).json({
      profile: {
        id: user._id,
        fullName: user.fullName,
        firstName: getFirstName(user.fullName),
        email: user.email,
        nationalIdMasked: maskNationalId(user.nationalId),
        insuranceStatus: user.insuranceStatus,
        insuranceType,
      },
      activePrescriptions,
      recentClaims: claims,
      meta: {
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to load patient dashboard", error);
    return res.status(500).json({ message: "Unable to load patient dashboard right now." });
  }
}

export async function generatePatientQrToken(req, res) {
  try {
    const user = await User.findById(req.user.id).select("nationalId role");

    if (!user || user.role !== "patient" || !user.nationalId) {
      return res.status(404).json({ message: "Patient profile not found." });
    }

    await PatientQrSession.deleteMany({
      patientId: user._id,
      expiresAt: { $lte: new Date() },
    });

    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PATIENT_QR_TTL_SECONDS * 1000);

    await PatientQrSession.create({
      jti,
      patientId: user._id,
      nationalId: user.nationalId,
      expiresAt,
    });

    const token = jwt.sign(
      {
        patientId: user._id,
        nationalId: user.nationalId,
        purpose: "patient-qr-verification",
        jti,
      },
      process.env.JWT_SECRET,
      { expiresIn: PATIENT_QR_TTL_SECONDS }
    );

    return res.status(200).json({
      token,
      expiresAt: expiresAt.toISOString(),
      refreshAfterMs: 270000,
    });
  } catch (error) {
    console.error("Failed to generate patient QR token", error);
    return res.status(500).json({ message: "Unable to generate patient QR token right now." });
  }
}
