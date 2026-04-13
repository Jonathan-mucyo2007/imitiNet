import express from "express";
import { getReceptionistDashboard } from "../controllers/receptionistDashboardController.js";
import {
  scanVerifyPatient,
  verifyPatient,
} from "../controllers/patientVerificationController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyToken, requireRole(["receptionist"]));

router.get("/dashboard", getReceptionistDashboard);
router.post("/verify-patient", verifyPatient);
router.post("/scan-verify", scanVerifyPatient);

export default router;
