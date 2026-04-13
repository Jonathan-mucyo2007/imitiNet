import fs from "fs/promises";
import path from "path";

const targetFile = path.resolve("backend/data/HospitalDashboard_Materialized.js");

const payload = `const hospitalDashboardMaterialized = {
  generatedAt: "${new Date().toISOString()}",
  verificationTrendBaseline: [
    { day: "Mon", verifications: 18, claimsStarted: 7 },
    { day: "Tue", verifications: 21, claimsStarted: 9 },
    { day: "Wed", verifications: 24, claimsStarted: 11 },
    { day: "Thu", verifications: 22, claimsStarted: 10 },
    { day: "Fri", verifications: 27, claimsStarted: 14 },
    { day: "Sat", verifications: 14, claimsStarted: 5 },
    { day: "Sun", verifications: 11, claimsStarted: 4 }
  ],
  insuranceStatusDistribution: [
    { name: "Active", value: 61, color: "#1E56D0" },
    { name: "Inactive", value: 22, color: "#94A3B8" },
    { name: "Pending Review", value: 17, color: "#38BDF8" }
  ],
  recentActivity: [
    {
      token: "VRF-KGL-24001",
      patientLabel: "Aline U.",
      facility: "HOSP-KGL-001",
      status: "verified",
      timestamp: "${new Date().toISOString()}"
    }
  ]
};

export default hospitalDashboardMaterialized;
`;

async function seedMaterializedHospitalData() {
  await fs.writeFile(targetFile, payload, "utf8");
  console.log(`Hospital materialized dashboard data written to ${targetFile}`);
}

seedMaterializedHospitalData().catch((error) => {
  console.error("Unable to seed hospital dashboard materialized data", error);
  process.exit(1);
});
