import express from "express";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";
import {
  getCommandCenter,
  getFullList,
  addStock,
  getSyncStatus,
  triggerManualSync,
  updateInventoryLot,
} from "../controllers/pharmacyInventoryController.js";

const router = express.Router();

router.use(verifyToken, requireRole(["pharmacy"]));

router.get("/command-center", getCommandCenter);
router.get("/full-list", getFullList);
router.post("/add-stock", addStock);
router.get("/sync-status", getSyncStatus);
router.post("/trigger-sync", triggerManualSync);
router.put("/:id", updateInventoryLot);

export default router;
