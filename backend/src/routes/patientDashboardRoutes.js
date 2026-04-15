import express from "express";
import {
  generatePatientQrToken,
  generatePrescriptionQrToken,
  getPatientDashboard,
} from "../controllers/patientDashboardController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", verifyToken, requireRole(["patient"]), getPatientDashboard);
router.get("/generate-qr-token", verifyToken, requireRole(["patient"]), generatePatientQrToken);
router.get(
  "/prescriptions/:prescriptionId/qr-token",
  verifyToken,
  requireRole(["patient"]),
  generatePrescriptionQrToken
);

export default router;
