import mongoose from "mongoose";

const nationalStatsSchema = new mongoose.Schema(
  {
    kpis: {
      ibitaro: { type: Number, default: 450 },
      patients: { type: Number, default: 18000 },
      pharmacyCoverage: { type: Number, default: 85 },
      medicinesTracked: { type: Number, default: 2500000 },
    },
    coverageByRegion: [
      {
        region: { type: String },
        actualCoverage: { type: Number },
        targetCoverage: { type: Number },
      }
    ],
    consultationTrends: [
      {
        category: { type: String },
        cases2025: { type: Number },
        cases2026: { type: Number },
      }
    ],
    complianceStatus: {
      compliant: { type: Number, default: 75 },
      underReview: { type: Number, default: 15 },
      nonCompliant: { type: Number, default: 10 },
    },
    recentSupplyChain: [
      {
        medication: { type: String },
        status: { type: String },
        location: { type: String },
        time: { type: String }
      }
    ],
    facilityPerformance: {
      patientRatio: { type: String, default: "1:500" },
      avgWaitTimeMin: { type: Number, default: 45 },
      portalUtilization: { type: Number, default: 78 },
      supplyChainScore: { type: Number, default: 92 },
    },
    version: { type: String, default: "1.0.0" },
    lastCalculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "nationalstats_materialized" }
);

export default mongoose.model("NationalStatsMaterialized", nationalStatsSchema);
