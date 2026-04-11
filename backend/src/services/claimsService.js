export function validateCoverageInputs({ medicineId, insuranceProviderId, quantity }) {
  if (!medicineId || !insuranceProviderId) {
    return "Medicine ID and Insurance Provider ID are required.";
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return "Quantity must be a whole number greater than or equal to 1.";
  }

  return null;
}

export function calculateCoverageBreakdown({
  unitPriceRWF,
  quantity,
  coveragePercentage,
}) {
  const totalPriceRWF = Math.round(unitPriceRWF * quantity);
  const coveredRWF = Math.round((totalPriceRWF * coveragePercentage) / 100);
  const patientPaysRWF = totalPriceRWF - coveredRWF;

  return {
    totalPriceRWF,
    coveredRWF,
    patientPaysRWF,
  };
}
