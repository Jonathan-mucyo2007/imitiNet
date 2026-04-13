import express from "express";
import {
  getNearbyPharmaciesForActivePrescription,
  getNearbyPharmaciesForMedicine,
  searchInventory,
} from "../controllers/inventoryController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", verifyToken, requireRole(["patient"]), searchInventory);
router.get("/nearby", verifyToken, requireRole(["patient"]), getNearbyPharmaciesForMedicine);
router.get(
  "/nearby/active-prescription",
  verifyToken,
  requireRole(["patient"]),
  getNearbyPharmaciesForActivePrescription
);

export default router;
