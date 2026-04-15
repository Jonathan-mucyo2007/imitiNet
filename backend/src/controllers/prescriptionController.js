import Prescription from "../models/Prescription.js";
import User from "../models/User.js";
import Inventory from "../models/Inventory.js";
import { verifyPharmacyQrToken } from "../utils/pharmacyQrToken.js";

const ACTIVE_PRESCRIPTION_STATUS = "Active";

function looksLikeJwtCredential(value) {
  const normalizedValue = String(value || "").trim();
  const parts = normalizedValue.split(".");
  return parts.length === 3 && normalizedValue.length > 40;
}

function isRawRxCredential(value) {
  return /^RX-[A-Z0-9-]+$/i.test(String(value || "").trim());
}

function resolveRetrievalCredential(credential) {
  const normalizedValue = String(credential || "").trim();
  const normalizedUpperValue = normalizedValue.toUpperCase();

  if (!normalizedValue) {
    return {
      error: { status: 400, message: "Retrieval credential is required." },
    };
  }

  if (looksLikeJwtCredential(normalizedValue)) {
    try {
      const decoded = verifyPharmacyQrToken(normalizedValue);
      return {
        lookup: {
          _id: decoded.prescriptionId,
          prescriptionId: String(decoded.rxCode || "").trim().toUpperCase(),
          status: ACTIVE_PRESCRIPTION_STATUS,
        },
      };
    } catch (_error) {
      return {
        error: { status: 403, message: "Token expired or invalid." },
      };
    }
  }

  if (isRawRxCredential(normalizedValue)) {
    return {
      lookup: {
        prescriptionId: normalizedUpperValue,
        status: ACTIVE_PRESCRIPTION_STATUS,
      },
    };
  }

  return {
    error: { status: 400, message: "Invalid retrieval credential format." },
  };
}

export async function getPrescriptionByRetrieveCode(req, res) {
  try {
    const { lookup, error: credentialError } = resolveRetrievalCredential(req.params.rxCode);

    if (credentialError) {
      return res.status(credentialError.status).json({ message: credentialError.message });
    }

    const prescription = await Prescription.findOne(lookup)
      .populate("patientId", "fullName insuranceStatus")
      .populate({
        path: "medications.medicineVariantId",
        select: "dosage form basePrice medicineGroupId",
        populate: {
          path: "medicineGroupId",
          select: "genericName category description",
        },
      });

    if (!prescription) {
      const relaxedLookup = { ...lookup };
      delete relaxedLookup.status;
      const matchedInactivePrescription = await Prescription.findOne(relaxedLookup).select("status");

      if (matchedInactivePrescription) {
        return res.status(403).json({
          message: "This RX code is no longer available for dispensing.",
        });
      }

      return res.status(404).json({ message: "Prescription not found. Please verify the code." });
    }

    const pharmacyUser = await User.findById(req.user.id).select("pharmacyProfileId");
    if (!pharmacyUser || !pharmacyUser.pharmacyProfileId) {
      return res.status(403).json({ message: "Only pharmacies can fetch these prescription pricing details." });
    }

    const inventoryRecords = await Inventory.find({
      pharmacyId: pharmacyUser.pharmacyProfileId,
      medicineVariantId: {
        $in: prescription.medications.map((item) => item.medicineVariantId._id),
      },
    }).select("medicineVariantId priceRWF quantity stockStatus");

    const inventoryMap = new Map(
      inventoryRecords.map((record) => [String(record.medicineVariantId), record])
    );

    return res.status(200).json({
      prescription: {
        id: prescription._id,
        rxCode: prescription.prescriptionId,
        patient: {
          fullName: prescription.patientId.fullName,
        },
        prescribingDoctor: prescription.prescribingDoctor,
        originatingEmr: prescription.originatingEmr,
        status: "Pending Dispense",
        createdAt: prescription.createdAt,
        medications: prescription.medications.map((item) => {
          const inv = inventoryMap.get(String(item.medicineVariantId._id));
          return {
            medicineVariantId: item.medicineVariantId._id,
            medicineGroupId: item.medicineVariantId.medicineGroupId._id,
            medicineName: item.medicineVariantId.medicineGroupId.genericName,
            category: item.medicineVariantId.medicineGroupId.category,
            dosage: item.medicineVariantId.dosage,
            form: item.medicineVariantId.form,
            basePrice: item.medicineVariantId.basePrice,
            inventoryPriceRWF: inv ? inv.priceRWF : null,
            inventoryQuantity: inv ? inv.quantity : 0,
            stockStatus: inv ? inv.stockStatus : "Out of Stock",
            quantity: item.quantity,
            instructions: item.instructions,
          };
        }),
      },
    });
  } catch (error) {
    console.error("Failed to fetch prescription", error);
    return res.status(500).json({ message: "Unable to fetch prescription right now." });
  }
}
