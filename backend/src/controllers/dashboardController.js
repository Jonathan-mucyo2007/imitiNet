import mongoose from "mongoose";
import Claim from "../models/Claim.js";
import User from "../models/User.js";

const REVIEWABLE_STATUSES = ["Pending", "Flagged_By_AI"];
const RESOLVED_STATUSES = ["Approved", "Rejected"];

// GET /api/pharmacy/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    const pharmacyUser = await User.findById(req.user.id).select("pharmacyProfileId");
    if (!pharmacyUser?.pharmacyProfileId) {
      return res.status(403).json({ message: "Only pharmacies can access this dashboard." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pharmacyObjectId = new mongoose.Types.ObjectId(req.user.id);

    const aggregation = await Claim.aggregate([
      // Absolute first stage: Multi-Tenant Security $match
      { $match: { pharmacyId: pharmacyObjectId } },
      {
        $facet: {
          // KPI Counts
          kpis: [
            {
              $group: {
                _id: null,
                totalClaims: { $sum: 1 },
                pendingClaims: {
                  $sum: { $cond: [{ $in: ["$status", REVIEWABLE_STATUSES] }, 1, 0] },
                },
                approvedClaims: {
                  $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] },
                },
                rejectedClaims: {
                  $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] },
                },
              },
            },
          ],
          // Status Distribution for Donut Chart
          statusDistribution: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          // Avg. Approval Time
          avgApprovalTime: [
            { $match: { status: { $in: RESOLVED_STATUSES } } },
            {
              $group: {
                _id: null,
                averageHours: { $avg: "$approvalTimeHours" },
              },
            },
          ],
          // Claims Processed Today
          processedToday: [
            { $match: { submittedAt: { $gte: today } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const result = aggregation[0];

    const kpis = result.kpis[0] || {
      totalClaims: 0,
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
    };

    const statusDistribution = result.statusDistribution.map((item) => ({
      name: item._id, // Will display as "Approved", "Pending", "Rejected"
      value: item.count,
    }));

    const averageApprovalHours =
      result.avgApprovalTime.length > 0
        ? Math.round(result.avgApprovalTime[0].averageHours)
        : 0;

    const processedToday =
      result.processedToday.length > 0 ? result.processedToday[0].count : 0;

    console.log("--- DASHBOARD MATH AUDIT ---");
    console.log(JSON.stringify({ kpis, statusDistribution, averageApprovalHours, processedToday }, null, 2));

    return res.status(200).json({
      kpis,
      statusDistribution,
      averageApprovalHours,
      processedToday,
    });
  } catch (error) {
    console.error("Dashboard stats aggregation failed", error);
    return res.status(500).json({ message: "Failed to load dashboard statistics." });
  }
};

// GET /api/pharmacy/dashboard/recent-claims
export const getRecentClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ pharmacyId: req.user.id })
      .sort({ submittedAt: -1 })
      .limit(10)
      .select(
        "claimId patientName insurerName status totalAmountRWF submittedAt aiFraudCheck rejectionReason coveredAmountRWF patientPaysRWF"
      );

    return res.status(200).json(claims);
  } catch (error) {
    console.error("Recent claims fetch failed", error);
    return res.status(500).json({ message: "Failed to load recent claims." });
  }
};

// GET /api/pharmacy/dashboard/processing-trends
export const getProcessingTrends = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trends = await Claim.aggregate([
      // Absolute first stage: Multi-Tenant Security $match
      {
        $match: {
          pharmacyId: new mongoose.Types.ObjectId(req.user.id),
          submittedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
          totalClaims: { $sum: 1 },
          averageApproval: {
            $avg: {
              $cond: [{ $in: ["$status", RESOLVED_STATUSES] }, "$approvalTimeHours", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedTrends = trends.map((item) => ({
      date: item._id,
      volume: item.totalClaims,
      avgTime: Math.round(item.averageApproval * 10) / 10,
    }));

    return res.status(200).json(formattedTrends);
  } catch (error) {
    console.error("Trends aggregation failed", error);
    return res.status(500).json({ message: "Failed to load processing trends." });
  }
};
