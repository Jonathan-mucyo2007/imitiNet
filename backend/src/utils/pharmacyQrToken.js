import jwt from "jsonwebtoken";

export const PHARMACY_QR_TOKEN_PURPOSE = "pharmacy-prescription-retrieval";
export const PHARMACY_QR_TTL_SECONDS = 5 * 60;

export function signPharmacyQrToken({ prescription }) {
  return jwt.sign(
    {
      purpose: PHARMACY_QR_TOKEN_PURPOSE,
      prescriptionId: prescription._id,
      rxCode: prescription.prescriptionId,
      patientId: prescription.patientId,
    },
    process.env.JWT_SECRET,
    { expiresIn: PHARMACY_QR_TTL_SECONDS }
  );
}

export function verifyPharmacyQrToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (
    decoded?.purpose !== PHARMACY_QR_TOKEN_PURPOSE ||
    !decoded?.prescriptionId ||
    !decoded?.rxCode
  ) {
    throw new Error("Malformed pharmacy QR token.");
  }

  return decoded;
}
