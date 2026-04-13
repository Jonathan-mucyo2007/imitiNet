const rssbFixtures = {
  "1199580012345678": {
    patient_status: "verified",
    insurance_active: true,
    insurance_scheme: "RSSB Mutuelle",
    claim_reference: "CLM-48392",
    provider_code: "ICD-10-RW-OPC-014",
    medicine_reference: "ATC_AMOX-125",
  },
  "1199600098765432": {
    patient_status: "verified",
    insurance_active: false,
    insurance_scheme: "RSSB Mutuelle",
    claim_reference: "CLM-51027",
    provider_code: "ICD-10-RW-OPC-021",
    medicine_reference: "ATC_PARA-500",
  },
  "1199620011112222": {
    patient_status: "not verified",
    insurance_active: false,
    insurance_scheme: "No active cover",
    claim_reference: "CLM-00000",
    provider_code: "ICD-10-RW-OPC-099",
    medicine_reference: "ATC_CETI-010",
  },
};

export async function lookupRssbRecord(idNumber) {
  await new Promise((resolve) => setTimeout(resolve, 260));

  if (idNumber === "8888888888888888") {
    throw new Error("RSSB mock timeout");
  }

  const record = rssbFixtures[idNumber];
  if (!record) {
    return {
      success: false,
      source: "RSSB",
      message: "RSSB could not find active insurance information for this ID.",
    };
  }

  return {
    success: true,
    source: "RSSB",
    data: record,
  };
}
