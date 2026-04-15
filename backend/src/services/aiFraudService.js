function buildDeterministicScoreSeed(claimData) {
  const seedSource = [
    claimData.patientName,
    claimData.insurerName,
    claimData.totalAmountRWF,
    claimData.coveredAmountRWF,
    ...(claimData.medicineSnapshot || []).map(
      (item) => `${item.name}:${item.standardizedCode}:${item.quantity}`
    ),
  ].join("|");

  return seedSource.split("").reduce((sum, character, index) => {
    return sum + character.charCodeAt(0) * (index + 1);
  }, 0);
}

export function evaluateClaimFraudRisk(claimData) {
  const deterministicSeed = buildDeterministicScoreSeed(claimData);
  const anomalyScore = Number((((deterministicSeed % 61) + 30) / 100).toFixed(2));
  const maxLineQuantity = Math.max(
    0,
    ...(claimData.medicineSnapshot || []).map((item) => Number(item.quantity || 0))
  );

  if (Number(claimData.totalAmountRWF || 0) >= 45000) {
    return {
      isAnomalous: true,
      anomalyScore: Math.max(anomalyScore, 0.94),
      reasonCode: "HIGH_PRICE_OUTLIER",
    };
  }

  if (Number(claimData.patientPaysRWF || 0) >= 15000) {
    return {
      isAnomalous: true,
      anomalyScore: Math.max(anomalyScore, 0.9),
      reasonCode: "PATIENT_SHARE_SPIKE",
    };
  }

  if (maxLineQuantity >= 4 && anomalyScore >= 0.74) {
    return {
      isAnomalous: true,
      anomalyScore: Math.max(anomalyScore, 0.87),
      reasonCode: "CLINICAL_MISMATCH_SIGNAL",
    };
  }

  return {
    isAnomalous: anomalyScore >= 0.86,
    anomalyScore,
    reasonCode: anomalyScore >= 0.86 ? "ANOMALY_PATTERN_DETECTED" : "CLEAR",
  };
}

export function calculatePharmacyNetworkRiskScore({
  totalClaims = 0,
  rejectedClaims = 0,
  flaggedClaims = 0,
  highPriceAlerts = 0,
  averageClaimAmount = 0,
  regionalMeanAmount = 0,
}) {
  if (!totalClaims) {
    return {
      score: 0,
      riskBand: "Low",
      status: "Active",
      contributingFactors: {
        rejectionRate: 0,
        flaggedRate: 0,
        priceAlertRate: 0,
        regionalDeviation: 0,
      },
    };
  }

  const rejectionRate = rejectedClaims / totalClaims;
  const flaggedRate = flaggedClaims / totalClaims;
  const priceAlertRate = highPriceAlerts / totalClaims;
  const regionalDeviation =
    regionalMeanAmount > 0
      ? Math.min(1, Math.abs(averageClaimAmount - regionalMeanAmount) / regionalMeanAmount)
      : 0;

  const weightedScore =
    rejectionRate * 0.34 +
    priceAlertRate * 0.29 +
    regionalDeviation * 0.22 +
    flaggedRate * 0.15;

  const score = Number(Math.min(1, weightedScore).toFixed(2));

  if (score >= 0.67) {
    return {
      score,
      riskBand: "High",
      status: "Flagged",
      contributingFactors: {
        rejectionRate: Number(rejectionRate.toFixed(2)),
        flaggedRate: Number(flaggedRate.toFixed(2)),
        priceAlertRate: Number(priceAlertRate.toFixed(2)),
        regionalDeviation: Number(regionalDeviation.toFixed(2)),
      },
    };
  }

  if (score >= 0.4) {
    return {
      score,
      riskBand: "Moderate",
      status: "Watchlist",
      contributingFactors: {
        rejectionRate: Number(rejectionRate.toFixed(2)),
        flaggedRate: Number(flaggedRate.toFixed(2)),
        priceAlertRate: Number(priceAlertRate.toFixed(2)),
        regionalDeviation: Number(regionalDeviation.toFixed(2)),
      },
    };
  }

  return {
    score,
    riskBand: "Low",
    status: "Active",
    contributingFactors: {
      rejectionRate: Number(rejectionRate.toFixed(2)),
      flaggedRate: Number(flaggedRate.toFixed(2)),
      priceAlertRate: Number(priceAlertRate.toFixed(2)),
      regionalDeviation: Number(regionalDeviation.toFixed(2)),
    },
  };
}
