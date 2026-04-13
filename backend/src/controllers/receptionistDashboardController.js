import Claim from "../models/Claim.js";
import PatientVerification from "../models/PatientVerification.js";
import hospitalDashboardMaterialized from "../../data/HospitalDashboard_Materialized.js";

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getReceptionistDashboard(req, res) {
  try {
    const facilityId = req.user.facilityId;
    const todayStart = startOfDay();

    await PatientVerification.updateMany(
      { expiresAt: { $lte: new Date() }, isVerified: true },
      { $set: { isVerified: false } }
    );

    const [verifiedToday, activeInsuredToday, claimsStarted, recentVerifications, weeklyVerifications] =
      await Promise.all([
        PatientVerification.countDocuments({
          facilityId,
          verifiedAt: { $gte: todayStart },
          isVerified: true,
        }),
        PatientVerification.countDocuments({
          facilityId,
          verifiedAt: { $gte: todayStart },
          insuranceActiveSnapshot: true,
        }),
        Claim.countDocuments({
          verificationToken: { $ne: null },
          createdAt: { $gte: todayStart },
        }),
        PatientVerification.find({ facilityId })
          .sort({ verifiedAt: -1 })
          .limit(5)
          .select("_id verifiedAt insuranceActiveSnapshot patientStatusSnapshot"),
        PatientVerification.aggregate([
          {
            $match: {
              facilityId,
              verifiedAt: {
                $gte: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                dayOfWeek: { $dayOfWeek: "$verifiedAt" },
              },
              verifications: { $sum: 1 },
              insured: {
                $sum: {
                  $cond: [{ $eq: ["$insuranceActiveSnapshot", true] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

    const weeklyMap = new Map(
      weeklyVerifications.map((entry) => [
        dayLabels[(entry._id.dayOfWeek + 6) % 7],
        entry,
      ])
    );

    const dailyVerificationVolume = hospitalDashboardMaterialized.verificationTrendBaseline.map(
      (baseline) => ({
        day: baseline.day,
        verifications: weeklyMap.get(baseline.day)?.verifications ?? baseline.verifications,
        claimsStarted: baseline.claimsStarted,
      })
    );

    const insuranceStatusDistribution = [
      {
        name: "Active",
        value: activeInsuredToday || hospitalDashboardMaterialized.insuranceStatusDistribution[0].value,
        color: "#1E56D0",
      },
      {
        name: "Inactive",
        value: Math.max(verifiedToday - activeInsuredToday, 0) || hospitalDashboardMaterialized.insuranceStatusDistribution[1].value,
        color: "#94A3B8",
      },
      {
        name: "Pending Review",
        value: hospitalDashboardMaterialized.insuranceStatusDistribution[2].value,
        color: "#38BDF8",
      },
    ];

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      kpis: {
        totalPatientsVerifiedToday: verifiedToday,
        activeInsuredPatients: activeInsuredToday,
        claimsStarted,
        verificationTrends: dailyVerificationVolume[dailyVerificationVolume.length - 1]?.verifications || 0,
      },
      dailyVerificationVolume,
      insuranceStatusDistribution,
      recentVerifications: recentVerifications.map((item) => ({
        verificationToken: item._id,
        verifiedAt: item.verifiedAt,
        insuranceActive: item.insuranceActiveSnapshot,
        status: item.patientStatusSnapshot,
      })),
      notes: {
        privacy:
          "Verification data is session-based. ImitiNet never stores full patient records.",
        interoperability:
          "Use verificationToken to bridge into OpenClinic GA or internal claim filing with ATC and ICD-10 aligned references.",
      },
    });
  } catch (error) {
    console.error("Unable to fetch receptionist dashboard", error);
    return res.status(500).json({ message: "Unable to load receptionist dashboard." });
  }
}
