import express from "express";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";
import { getDashboardStats, manualTriggerFraudScan } from "../controllers/insurerDashboardController.js";

const router = express.Router();

router.use(verifyToken, requireRole(["insurer"]));

router.get("/dashboard", getDashboardStats);
router.post("/trigger-fraud-scan", manualTriggerFraudScan);

export default router;
