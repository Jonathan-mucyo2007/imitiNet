import express from "express";
import {
  getPharmacySettings,
  updatePharmacySettings,
} from "../controllers/pharmacySettingsController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyToken, requireRole(["pharmacy"]));

router.get("/", getPharmacySettings);
router.put("/", updatePharmacySettings);

export default router;
