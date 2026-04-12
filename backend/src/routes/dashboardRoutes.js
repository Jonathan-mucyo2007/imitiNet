import express from "express";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";
import {
  getDashboardStats,
  getProcessingTrends,
  getRecentClaims,
  updateClaimStatus,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.use(verifyToken, requireRole(["pharmacy"]));

router.get("/stats", getDashboardStats);
router.get("/recent-claims", getRecentClaims);
router.get("/processing-trends", getProcessingTrends);
router.patch("/claims/:id/status", updateClaimStatus);

export default router;
