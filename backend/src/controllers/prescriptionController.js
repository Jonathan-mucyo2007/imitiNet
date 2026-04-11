import mongoose from "mongoose";
import Prescription from "../models/Prescription.js";

export async function getActivePrescriptionForPatient(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid patient ID." });
    }

    const prescription = await Prescription.findOne({
      patientId: id,
      status: "Active",
    })
      .sort({ createdAt: -1 })
      .populate("patientId", "fullName email nationalId insuranceStatus")
      .populate({
        path: "medications.medicineVariantId",
        select: "dosage form basePrice medicineGroupId",
        populate: {
          path: "medicineGroupId",
          select: "genericName category description",
        },
      });

    if (!prescription) {
      return res.status(404).json({ message: "No active prescription found for this patient." });
    }

    return res.status(200).json({
      prescription: {
        id: prescription._id,
        prescriptionId: prescription.prescriptionId,
        patient: prescription.patientId,
        prescribingDoctor: prescription.prescribingDoctor,
        originatingEmr: prescription.originatingEmr,
        status: prescription.status,
        medications: prescription.medications.map((item) => ({
          medicineVariantId: item.medicineVariantId._id,
          medicineGroupId: item.medicineVariantId.medicineGroupId._id,
          medicineName: item.medicineVariantId.medicineGroupId.genericName,
          category: item.medicineVariantId.medicineGroupId.category,
          dosage: item.medicineVariantId.dosage,
          form: item.medicineVariantId.form,
          basePrice: item.medicineVariantId.basePrice,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch prescription", error);
    return res.status(500).json({ message: "Unable to fetch prescription right now." });
  }
}
