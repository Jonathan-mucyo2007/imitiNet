import Claim from "../models/Claim.js";
import PharmacyProfile from "../models/PharmacyProfile.js";
import User from "../models/User.js";
import { getIO } from "../socket.js";
import { resolveInsurerScopeByUserId } from "../utils/insurerScope.js";
import { calculatePharmacyNetworkRiskScore } from "../services/aiFraudService.js";

const REVIEWABLE_STATUSES = ["Pending", "Flagged_By_AI"];
const RESOLVED_STATUSES = ["Approved", "Rejected"];

// ─── Constants ───────────────────────────────────────────────────────────────
const TZ_KIGALI = "Africa/Kigali"; // CAT = UTC+02:00 — Used in ALL date stages

function inferDistrictFromPharmacy(pharmacyProfile = {}, user = {}) {
  const source = [
    pharmacyProfile.address,
    pharmacyProfile.facilityName,
    pharmacyProfile.name,
    user.facilityId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(nyamirambo|nyarugenge|kn\s?\d)/i.test(source)) return "Nyarugenge";
  if (/(gikondo|kanombe|kicukiro|kk\s?\d)/i.test(source)) return "Kicukiro";
  if (/(remera|kacyiru|kimironko|gasabo|kg\s?\d|kibagabaga)/i.test(source)) return "Gasabo";
  return "Kigali";
}

async function buildPharmacyNetworkRegistry({
  insurerUserId,
  search = "",
  sortBy = "aiRiskScore",
  sortOrder = "desc",
}) {
  const insurerScope = await resolveInsurerScopeByUserId(insurerUserId);

  if (insurerScope.error) {
    return insurerScope;
  }

  const providerIds = insurerScope.scopedProviderIds;
  const searchRegex = search ? new RegExp(search, "i") : null;

  const groupedClaims = await Claim.aggregate([
    { $match: { insuranceProviderId: { $in: providerIds } } },
    {
      $group: {
        _id: "$pharmacyId",
        totalClaims: { $sum: 1 },
        approvedClaims: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
        rejectedClaims: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
        flaggedClaims: { $sum: { $cond: [{ $eq: ["$status", "Flagged_By_AI"] }, 1, 0] } },
        highPriceAlerts: {
          $sum: {
            $cond: [{ $eq: ["$aiFraudCheck.reasonCode", "HIGH_PRICE_OUTLIER"] }, 1, 0],
          },
        },
        totalClaimAmount: { $sum: "$totalAmountRWF" },
        averageClaimAmount: { $avg: "$totalAmountRWF" },
        averageApprovalHours: { $avg: "$approvalTimeHours" },
        lastClaimAt: { $max: "$submittedAt" },
      },
    },
  ]);

  if (!groupedClaims.length) {
    return {
      insurerScope,
      stats: {
        totalPharmacies: 0,
        nationalRiskScore: 0,
        averageDispenseTimeHours: 0,
      },
      registry: [],
      districtHeatmap: [],
    };
  }

  const pharmacyUserIds = groupedClaims.map((entry) => entry._id);
  const pharmacyUsers = await User.find({ _id: { $in: pharmacyUserIds } })
    .select("fullName facilityId pharmacyProfileId")
    .populate("pharmacyProfileId")
    .lean();

  const userById = new Map(pharmacyUsers.map((user) => [String(user._id), user]));

  const preliminaryRegistry = groupedClaims
    .map((entry) => {
      const pharmacyUser = userById.get(String(entry._id));
      const pharmacyProfile = pharmacyUser?.pharmacyProfileId || null;

      if (!pharmacyUser || !pharmacyProfile) {
        return null;
      }

      const district = inferDistrictFromPharmacy(pharmacyProfile, pharmacyUser);
      const averageClaimAmount = Number(entry.averageClaimAmount || 0);

      return {
        id: String(entry._id),
        pharmacyUserId: String(entry._id),
        pharmacyName:
          pharmacyProfile.facilityName || pharmacyProfile.name || pharmacyUser.fullName,
        district,
        facilityId: pharmacyUser.facilityId || "Facility ID unavailable",
        pharmacyProfile: {
          id: pharmacyProfile._id,
          facilityName: pharmacyProfile.facilityName || pharmacyProfile.name,
          address: pharmacyProfile.address,
          location: pharmacyProfile.location,
          contactEmail: pharmacyProfile.contactEmail || "",
        },
        totalClaims: entry.totalClaims,
        approvedClaims: entry.approvedClaims,
        rejectedClaims: entry.rejectedClaims,
        flaggedClaims: entry.flaggedClaims,
        highPriceAlerts: entry.highPriceAlerts,
        totalClaimAmount: Number(entry.totalClaimAmount || 0),
        averageClaimAmount,
        averageApprovalHours: Number(entry.averageApprovalHours || 0),
        deniedApprovedRatio:
          entry.approvedClaims > 0
            ? Number((entry.rejectedClaims / entry.approvedClaims).toFixed(2))
            : entry.rejectedClaims > 0
              ? Number(entry.rejectedClaims.toFixed(2))
              : 0,
        lastClaimAt: entry.lastClaimAt,
      };
    })
    .filter(Boolean);

  const districtMeans = preliminaryRegistry.reduce((accumulator, item) => {
    if (!accumulator[item.district]) {
      accumulator[item.district] = { total: 0, count: 0 };
    }

    accumulator[item.district].total += item.averageClaimAmount;
    accumulator[item.district].count += 1;
    return accumulator;
  }, {});

  const registry = preliminaryRegistry
    .map((item) => {
      const districtAverage = districtMeans[item.district];
      const regionalMeanAmount = districtAverage
        ? districtAverage.total / districtAverage.count
        : item.averageClaimAmount;

      const risk = calculatePharmacyNetworkRiskScore({
        totalClaims: item.totalClaims,
        rejectedClaims: item.rejectedClaims,
        flaggedClaims: item.flaggedClaims,
        highPriceAlerts: item.highPriceAlerts,
        averageClaimAmount: item.averageClaimAmount,
        regionalMeanAmount,
      });

      return {
        ...item,
        aiRiskScore: risk.score,
        aiRiskBand: risk.riskBand,
        status: risk.status,
        contributingFactors: risk.contributingFactors,
      };
    })
    .filter((item) => {
      if (!searchRegex) {
        return true;
      }

      return [
        item.pharmacyName,
        item.district,
        item.facilityId,
        item.pharmacyProfile.address,
      ]
        .filter(Boolean)
        .some((value) => searchRegex.test(value));
    });

  const sortMultiplier = sortOrder === "asc" ? 1 : -1;
  registry.sort((first, second) => {
    const comparableFields = {
      aiRiskScore: [first.aiRiskScore, second.aiRiskScore],
      totalClaims: [first.totalClaims, second.totalClaims],
      deniedApprovedRatio: [first.deniedApprovedRatio, second.deniedApprovedRatio],
      averageApprovalHours: [first.averageApprovalHours, second.averageApprovalHours],
      pharmacyName: [first.pharmacyName, second.pharmacyName],
    };

    const [a, b] = comparableFields[sortBy] || comparableFields.aiRiskScore;

    if (typeof a === "string" || typeof b === "string") {
      return String(a).localeCompare(String(b)) * sortMultiplier;
    }

    return (Number(a) - Number(b)) * sortMultiplier;
  });

  const districtHeatmap = Object.entries(
    registry.reduce((accumulator, item) => {
      if (!accumulator[item.district]) {
        accumulator[item.district] = {
          district: item.district,
          totalRisk: 0,
          pharmacies: 0,
          coordinates: item.pharmacyProfile.location?.coordinates || [30.06, -1.95],
        };
      }

      accumulator[item.district].totalRisk += item.aiRiskScore;
      accumulator[item.district].pharmacies += 1;
      return accumulator;
    }, {})
  ).map(([, value]) => ({
    district: value.district,
    averageRiskScore: Number((value.totalRisk / value.pharmacies).toFixed(2)),
    pharmacies: value.pharmacies,
    coordinates: value.coordinates,
  }));

  const stats = {
    totalPharmacies: registry.length,
    nationalRiskScore: Number(
      (
        registry.reduce((sum, item) => sum + item.aiRiskScore, 0) /
        Math.max(1, registry.length)
      ).toFixed(2)
    ),
    averageDispenseTimeHours: Number(
      (
        registry.reduce((sum, item) => sum + item.averageApprovalHours, 0) /
        Math.max(1, registry.length)
      ).toFixed(1)
    ),
  };

  return {
    insurerScope,
    stats,
    registry,
    districtHeatmap,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generate12Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const monthStr = `${d.getFullYear()}-${month}`;
    months.push({ 
      month: monthStr, 
      currentAmount: 0, 
      volume: 0,
      bankTransfer: 0,
      momo: 0,
      airtelMoney: 0,
      internalCheck: 0
    });
  }
  return months;
};

const calcPct = (current, previous, isNegativeIsGood = false) => {
  if (previous === 0) {
    if (current === 0) return { pct: "0%", isPos: true, rawPct: 0 };
    return { pct: "+100%", isPos: !isNegativeIsGood, rawPct: 100 };
  }
  const rawPct = ((current - previous) / previous) * 100;
  const displayPct = Math.round(rawPct * 100) / 100;
  const roundedForDisplay = Math.round(rawPct);
  const isPos = isNegativeIsGood ? rawPct <= 0 : rawPct >= 0;
  return {
    pct: `${roundedForDisplay > 0 ? "+" : ""}${roundedForDisplay}%`,
    isPos,
    rawPct: displayPct,
  };
};

const getQuarterBoundaries = () => {
  const kigaliFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_KIGALI,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = kigaliFmt.formatToParts(new Date());
  const kigaliYear = parseInt(parts.find((p) => p.type === "year").value);
  const kigaliMonth = parseInt(parts.find((p) => p.type === "month").value);

  const currentQ = Math.floor((kigaliMonth - 1) / 3);
  const currentQStartUTC = new Date(
    Date.UTC(kigaliYear, currentQ * 3, 1, -2, 0, 0, 0)
  );

  let prevQStartYear = kigaliYear;
  let prevQ = currentQ - 1;
  if (prevQ < 0) {
    prevQ = 3;
    prevQStartYear--;
  }
  const prevQStartUTC = new Date(
    Date.UTC(prevQStartYear, prevQ * 3, 1, -2, 0, 0, 0)
  );

  return { currentQStartUTC, prevQStartUTC };
};

// ─── Main Controller ─────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    const { search } = req.query;
    const insurerScope = await resolveInsurerScopeByUserId(req.user.id);

    if (insurerScope.error) {
      return res.status(insurerScope.error.status).json({ message: insurerScope.error.message });
    }

    const providerIds = insurerScope.scopedProviderIds;

    const { currentQStartUTC, prevQStartUTC } = getQuarterBoundaries();

    // Omni-Search Logic for Claims Table
    const recentClaimMatch = { insuranceProviderId: { $in: providerIds } };
    if (search) {
      const regex = new RegExp(search, "i");
      recentClaimMatch.$or = [
        { claimId: regex },
        { patientName: regex },
        { "medicineSnapshot.name": regex },
        { "medicineSnapshot.standardizedCode": regex }
      ];
    }

    // Fire recentClaims asynchronously in parallel with the heavy aggregation
    const recentClaimsPromise = Claim.find(recentClaimMatch)
      .select('claimId patientName pharmacyId insurerName approvalTimeHours totalAmountRWF coveredAmountRWF patientPaysRWF status medicineSnapshot submittedAt paymentChannel aiFraudCheck rejectionReason')
      .populate('pharmacyId', 'fullName facilityId location pharmacyProfileId')
      .populate({
        path: 'pharmacyId',
        populate: {
          path: 'pharmacyProfileId',
          select: 'name',
        },
      })
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean();

    const aggregatedResultPromise = Claim.aggregate([
      { $match: { insuranceProviderId: { $in: providerIds } } },
      {
        $facet: {
          qMetricData: [
            {
              $group: {
                _id: null,
                cqTotalClaims: { $sum: { $cond: [{ $gte: ["$submittedAt", currentQStartUTC] }, 1, 0] } },
                cqApprovedClaims: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", currentQStartUTC] }, { $eq: ["$status", "Approved"] }] }, 1, 0] } },
                cqPendingClaims: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", currentQStartUTC] }, { $in: ["$status", REVIEWABLE_STATUSES] }] }, 1, 0] } },
                cqTotalPayoutRWF: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", currentQStartUTC] }, { $eq: ["$status", "Approved"] }] }, "$coveredAmountRWF", 0] } },
                pqTotalClaims: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", prevQStartUTC] }, { $lt: ["$submittedAt", currentQStartUTC] }] }, 1, 0] } },
                pqApprovedClaims: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", prevQStartUTC] }, { $lt: ["$submittedAt", currentQStartUTC] }, { $eq: ["$status", "Approved"] }] }, 1, 0] } },
                pqPendingClaims: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", prevQStartUTC] }, { $lt: ["$submittedAt", currentQStartUTC] }, { $in: ["$status", REVIEWABLE_STATUSES] }] }, 1, 0] } },
                pqTotalPayoutRWF: { $sum: { $cond: [{ $and: [{ $gte: ["$submittedAt", prevQStartUTC] }, { $lt: ["$submittedAt", currentQStartUTC] }, { $eq: ["$status", "Approved"] }] }, "$coveredAmountRWF", 0] } },
              },
            },
          ],

          trendTimeSeries: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m", date: "$submittedAt", timezone: TZ_KIGALI }
                },
                volume: { $sum: 1 },
                currentAmount: {
                  $sum: { $cond: [{ $eq: ["$status", "Approved"] }, "$coveredAmountRWF", 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],

          categoryDistribution: [
            { $unwind: "$medicineSnapshot" },
            {
              $group: {
                _id: "$medicineSnapshot.category",
                value: { $sum: 1 }
              }
            },
            { $sort: { value: -1 } }
          ],

          payoutByChannel: [
            {
              $group: {
                _id: {
                  month: { $dateToString: { format: "%Y-%m", date: "$submittedAt", timezone: TZ_KIGALI } },
                  channel: "$paymentChannel"
                },
                amount: {
                  $sum: { $cond: [{ $eq: ["$status", "Approved"] }, "$coveredAmountRWF", 0] },
                }
              }
            }
          ]
        },
      },
    ]);

    const [recentClaims, aggregatedResult] = await Promise.all([recentClaimsPromise, aggregatedResultPromise]);
    const result = aggregatedResult[0];
    
    // Resolve Metrics
    const rawMetrics = result.qMetricData[0] || {
      cqTotalClaims: 0, cqApprovedClaims: 0, cqPendingClaims: 0, cqTotalPayoutRWF: 0,
      pqTotalClaims: 0, pqApprovedClaims: 0, pqPendingClaims: 0, pqTotalPayoutRWF: 0,
    };

    const totalClaimsPctObj = calcPct(rawMetrics.cqTotalClaims, rawMetrics.pqTotalClaims);
    const approvedClaimsPctObj = calcPct(rawMetrics.cqApprovedClaims, rawMetrics.pqApprovedClaims);
    const pendingClaimsPctObj = calcPct(rawMetrics.cqPendingClaims, rawMetrics.pqPendingClaims, true);
    const totalPayoutPctObj = calcPct(rawMetrics.cqTotalPayoutRWF, rawMetrics.pqTotalPayoutRWF);

    const metrics = {
      totalClaims: rawMetrics.cqTotalClaims,
      totalClaimsPctChange: totalClaimsPctObj.pct,
      totalClaimsPositive: totalClaimsPctObj.isPos,
      approvedClaims: rawMetrics.cqApprovedClaims,
      approvedClaimsPctChange: approvedClaimsPctObj.pct,
      approvedClaimsPositive: approvedClaimsPctObj.isPos,
      pendingClaims: rawMetrics.cqPendingClaims,
      pendingClaimsPctChange: pendingClaimsPctObj.pct,
      pendingClaimsPositive: pendingClaimsPctObj.isPos,
      totalPayoutRWF: rawMetrics.cqTotalPayoutRWF,
      totalPayoutPctChange: totalPayoutPctObj.pct,
      totalPayoutPositive: totalPayoutPctObj.isPos,
    };

    // Construct 12 Month Basis Data
    const baseMonths = generate12Months();
    
    // Map Top-Level Volume and Overall Payout Trends
    result.trendTimeSeries.forEach((t) => {
      const idx = baseMonths.findIndex((m) => m.month === t._id);
      if (idx !== -1) {
        baseMonths[idx].currentAmount = t.currentAmount;
        baseMonths[idx].volume = t.volume;
      }
    });

    // Map Payment Channel Breakdown (Phase 5)
    result.payoutByChannel.forEach((p) => {
      const monthStr = p._id.month;
      const channelStr = p._id.channel;
      const idx = baseMonths.findIndex((m) => m.month === monthStr);
      if (idx !== -1) {
        if (channelStr === 'Bank Transfer') baseMonths[idx].bankTransfer += p.amount;
        if (channelStr === 'MTN MoMo') baseMonths[idx].momo += p.amount;
        if (channelStr === 'Airtel Money') baseMonths[idx].airtelMoney += p.amount;
        if (channelStr === 'Internal Check') baseMonths[idx].internalCheck += p.amount;
      }
    });

    const formattedTrendData = baseMonths.map((item) => {
      const parts = item.month.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return {
        ...item,
        month: d.toLocaleString("default", { month: "short" }),
      };
    });

    // Standardize Category Distribution
    const categoryDistribution = result.categoryDistribution.map((c) => ({
      name: c._id || 'Unknown',
      value: c.value
    }));

    const finalPayload = {
      insurer: {
        id: insurerScope.primaryProvider._id,
        name: insurerScope.primaryProvider.name,
        umbrellaCode: insurerScope.primaryProvider.umbrellaCode || null,
      },
      metrics,
      trendData: formattedTrendData,
      categoryDistribution,
      recentClaims,
    };

    return res.status(200).json(finalPayload);
  } catch (error) {
    console.error("Dashboard QoQ Aggregation failed:", error);
    return res.status(500).json({ message: "Failed to load dashboard statistics." });
  }
};

export const manualTriggerFraudScan = async (req, res) => {
  try {
    const io = getIO();
    const anomalyScores = [0.89, 0.94, 0.99, 0.85];
    const reasons = [
      { code: "ERR-ML-089", desc: "Duplicated submission pattern flagged across localized Kigali cluster." },
      { code: "ERR-ML-092", desc: "High velocity claim frequency exceeds rolling 24hr standard deviation threshold." },
      { code: "ERR-ML-045", desc: "Medicine variance mapping failed FHIR code match validation." },
      { code: "ERR-ML-094", desc: "Unusual payout grouping mapped to singular Airtel Money recipient." }
    ];

    const randomAnomaly = anomalyScores[Math.floor(Math.random() * anomalyScores.length)];
    const randomReason = reasons[Math.floor(Math.random() * reasons.length)];

    const payload = {
      type: "Isolation Forest Anomaly Detected",
      message: randomReason.desc,
      reasonCode: randomReason.code,
      anomalyScore: randomAnomaly,
      timestamp: new Date().toISOString()
    };

    io.emit("fraud_alert_detected", payload);
    return res.status(200).json({ message: "Fraud ML pipeline triggered", payload });
  } catch (error) {
    console.error("Fraud trigger error:", error);
    return res.status(500).json({ message: "Socket dispatch failed." });
  }
};

export const getPharmacyNetworkStats = async (req, res) => {
  try {
    const networkData = await buildPharmacyNetworkRegistry({
      insurerUserId: req.user.id,
    });

    if (networkData.error) {
      return res.status(networkData.error.status).json({ message: networkData.error.message });
    }

    return res.status(200).json({
      insurer: {
        id: networkData.insurerScope.primaryProvider._id,
        name: networkData.insurerScope.primaryProvider.name,
        umbrellaCode: networkData.insurerScope.primaryProvider.umbrellaCode || null,
      },
      stats: networkData.stats,
      districtHeatmap: networkData.districtHeatmap,
    });
  } catch (error) {
    console.error("Pharmacy network stats failed", error);
    return res.status(500).json({ message: "Failed to load pharmacy network stats." });
  }
};

export const getPharmacyNetworkRegistry = async (req, res) => {
  try {
    const networkData = await buildPharmacyNetworkRegistry({
      insurerUserId: req.user.id,
      search: String(req.query.search || "").trim(),
      sortBy: String(req.query.sortBy || "aiRiskScore").trim(),
      sortOrder: String(req.query.sortOrder || "desc").trim(),
    });

    if (networkData.error) {
      return res.status(networkData.error.status).json({ message: networkData.error.message });
    }

    return res.status(200).json({
      insurer: {
        id: networkData.insurerScope.primaryProvider._id,
        name: networkData.insurerScope.primaryProvider.name,
        umbrellaCode: networkData.insurerScope.primaryProvider.umbrellaCode || null,
      },
      registry: networkData.registry,
    });
  } catch (error) {
    console.error("Pharmacy network registry failed", error);
    return res.status(500).json({ message: "Failed to load pharmacy network registry." });
  }
};
