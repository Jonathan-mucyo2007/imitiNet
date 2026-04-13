import crypto from "crypto";
import PatientVerification from "../models/PatientVerification.js";
import { lookupNidaRecord } from "../../mock-apis/nida.js";
import { lookupRssbRecord } from "../../mock-apis/rssb.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sanitizeNumericInput(value) {
  return String(value || "").replace(/\D/g, "");
}

function hashIdNumber(idNumber) {
  return crypto.createHash("sha256").update(idNumber).digest("hex");
}

async function expireOldTokens() {
  await PatientVerification.updateMany(
    { expiresAt: { $lte: new Date() }, isVerified: true },
    { $set: { isVerified: false } }
  );
}

export async function verifyPatient(req, res) {
  try {
    await expireOldTokens();

    const sanitizedIdNumber = sanitizeNumericInput(req.body.idNumber);
    if (!/^\d{16}$/.test(sanitizedIdNumber)) {
      return res.status(400).json({
        message: "ID number must contain exactly 16 numeric digits.",
        validation: {
          sanitizedIdNumber,
          isValid: false,
        },
      });
    }

    let nidaResponse;
    let rssbResponse;

    try {
      [nidaResponse, rssbResponse] = await Promise.all([
        lookupNidaRecord(sanitizedIdNumber),
        lookupRssbRecord(sanitizedIdNumber),
      ]);
    } catch (error) {
      return res.status(502).json({
        message: "Verification upstream service failed. Please retry shortly.",
        upstreamError: error.message,
      });
    }

    if (!nidaResponse?.success) {
      return res.status(404).json({
        message: nidaResponse?.message || "Patient could not be verified against NIDA.",
        nida: nidaResponse,
        rssb: rssbResponse,
      });
    }

    if (!rssbResponse?.success) {
      return res.status(404).json({
        message: rssbResponse?.message || "Patient could not be verified against RSSB.",
        nida: nidaResponse,
        rssb: rssbResponse,
      });
    }

    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt.getTime() + TOKEN_TTL_MS);
    const verificationToken = crypto.randomUUID();

    await PatientVerification.create({
      _id: verificationToken,
      hashedIdNumber: hashIdNumber(sanitizedIdNumber),
      receptionistId: req.user.id,
      facilityId: req.user.facilityId,
      verifiedAt,
      expiresAt,
      isVerified: true,
      insuranceActiveSnapshot: Boolean(rssbResponse.data.insurance_active),
      patientStatusSnapshot: rssbResponse.data.patient_status,
      verificationSummary: {
        nidaStatus: "verified",
        rssbStatus: rssbResponse.data.patient_status,
      },
    });

    return res.status(200).json({
      message: "Patient verification completed successfully.",
      verificationToken,
      verifiedAt: verifiedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionNotice:
        "Verification data is session-based. ImitiNet never stores full patient records.",
      nida: {
        status: "verified",
        data: {
          id_number: sanitizedIdNumber,
          patient_name: nidaResponse.data.patient_name,
          date_of_birth: nidaResponse.data.date_of_birth,
          gender: nidaResponse.data.gender,
          patient_photo: nidaResponse.data.patient_photo,
          verified_at: verifiedAt.toISOString(),
        },
      },
      rssb: {
        status: rssbResponse.data.patient_status,
        data: {
          patient_status: rssbResponse.data.patient_status,
          insurance_active: rssbResponse.data.insurance_active,
          insurance_scheme: rssbResponse.data.insurance_scheme,
          claim_reference: rssbResponse.data.claim_reference,
          provider_code: rssbResponse.data.provider_code,
          medicine_reference: rssbResponse.data.medicine_reference,
          verified_at: verifiedAt.toISOString(),
        },
      },
      bridge: {
        startClaimUrl: `/dashboard/pharmacy/claims/new?verificationToken=${verificationToken}`,
        openClinicUrl: `https://openclinic-ga.local/claims/start?verificationToken=${verificationToken}`,
      },
    });
  } catch (error) {
    console.error("Receptionist verification failed", error);
    return res.status(500).json({ message: "Unable to verify patient right now." });
  }
}
