const hospitalDashboardMaterialized = {
  generatedAt: "2026-04-12T10:00:00.000Z",
  verificationTrendBaseline: [
    { day: "Mon", verifications: 18, claimsStarted: 7 },
    { day: "Tue", verifications: 21, claimsStarted: 9 },
    { day: "Wed", verifications: 24, claimsStarted: 11 },
    { day: "Thu", verifications: 22, claimsStarted: 10 },
    { day: "Fri", verifications: 27, claimsStarted: 14 },
    { day: "Sat", verifications: 14, claimsStarted: 5 },
    { day: "Sun", verifications: 11, claimsStarted: 4 },
  ],
  insuranceStatusDistribution: [
    { name: "Active", value: 61, color: "#1E56D0" },
    { name: "Inactive", value: 22, color: "#94A3B8" },
    { name: "Pending Review", value: 17, color: "#38BDF8" },
  ],
  recentActivity: [
    {
      token: "VRF-KGL-24001",
      patientLabel: "Aline U.",
      facility: "HOSP-KGL-001",
      status: "verified",
      timestamp: "2026-04-12T08:14:00.000Z",
    },
    {
      token: "VRF-KGL-24002",
      patientLabel: "Claude N.",
      facility: "HOSP-KGL-001",
      status: "insurance-inactive",
      timestamp: "2026-04-12T08:45:00.000Z",
    },
  ],
};

export default hospitalDashboardMaterialized;
