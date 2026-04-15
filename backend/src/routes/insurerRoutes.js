import express from "express";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";
import {
  getDashboardStats,
  getPharmacyNetworkRegistry,
  getPharmacyNetworkStats,
  manualTriggerFraudScan,
} from "../controllers/insurerDashboardController.js";
import { adjudicateClaim } from "../controllers/claimsController.js";

const router = express.Router();

router.use(verifyToken, requireRole(["insurer"]));

router.get("/dashboard", getDashboardStats);
router.get("/pharmacy-network/stats", getPharmacyNetworkStats);
router.get("/pharmacy-network/registry", getPharmacyNetworkRegistry);
router.post("/trigger-fraud-scan", manualTriggerFraudScan);
router.put("/claims/:id/adjudicate", adjudicateClaim);

export default router;
