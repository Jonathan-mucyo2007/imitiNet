import express from "express";
import { listPatients } from "../controllers/patientController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, requireRole(["pharmacy"]), listPatients);

export default router;
