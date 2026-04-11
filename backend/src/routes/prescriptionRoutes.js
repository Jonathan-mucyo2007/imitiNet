import express from "express";
import { getActivePrescriptionForPatient } from "../controllers/prescriptionController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/patient/:id", verifyToken, requireRole(["pharmacy"]), getActivePrescriptionForPatient);

export default router;
