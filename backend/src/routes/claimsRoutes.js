import express from "express";
import {
  adjudicateClaim,
  cancelClaim,
  checkCoverage,
  getProviders,
  previewPrescriptionClaim,
  submitClaim,
} from "../controllers/claimsController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Both endpoints require authentication
router.get("/providers", verifyToken, getProviders);
router.post("/check-coverage", verifyToken, checkCoverage);
router.post("/preview", verifyToken, requireRole(["pharmacy"]), previewPrescriptionClaim);
router.post("/submit", verifyToken, requireRole(["pharmacy"]), submitClaim);
router.patch("/:id/cancel", verifyToken, requireRole(["pharmacy"]), cancelClaim);
router.put("/:id/adjudicate", verifyToken, adjudicateClaim);

export default router;
