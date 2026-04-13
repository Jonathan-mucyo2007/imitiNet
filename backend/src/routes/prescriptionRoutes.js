import express from "express";
import { getPrescriptionByRetrieveCode } from "../controllers/prescriptionController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/retrieve/:rxCode", verifyToken, requireRole(["pharmacy"]), getPrescriptionByRetrieveCode);

export default router;
