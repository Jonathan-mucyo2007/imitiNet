import User from "../models/User.js";

export async function listPatients(_req, res) {
  try {
    const patients = await User.find({ role: "patient" })
      .sort({ fullName: 1 })
      .select("fullName email nationalId insuranceStatus");

    return res.status(200).json({
      patients: patients.map((patient) => ({
        id: patient._id,
        fullName: patient.fullName,
        email: patient.email,
        nationalId: patient.nationalId || null,
        insuranceStatus: patient.insuranceStatus || null,
      })),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Unable to fetch patients" });
  }
}
