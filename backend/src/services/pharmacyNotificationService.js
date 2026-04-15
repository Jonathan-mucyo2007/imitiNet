export async function sendMockPharmacyNotification({
  pharmacyProfile,
  claim,
  rejectionReason,
}) {
  const targetEmail = pharmacyProfile.contactEmail || "pharmacy@imitinet.local";

  console.log(
    `[mock-email] Claim rejection alert queued for ${targetEmail} (${pharmacyProfile.facilityName || pharmacyProfile.name}) on claim ${claim.claimId}. Reason: ${rejectionReason}`
  );

  return {
    delivered: true,
    targetEmail,
    notificationType: "claim_rejected",
  };
}
