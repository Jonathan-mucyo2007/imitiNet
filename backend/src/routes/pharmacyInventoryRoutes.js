import express from "express";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";
import {
  addInventoryStock,
  getInventoryKpis,
  getInventoryList,
  searchNationalCatalog,
  triggerInventorySync,
} from "../controllers/pharmacyInventoryController.js";

const router = express.Router();

router.use(verifyToken, requireRole(["pharmacy"]));

router.get("/kpis", getInventoryKpis);
router.get("/catalog", searchNationalCatalog);
router.get("/", getInventoryList);
router.post("/", addInventoryStock);
router.post("/sync", triggerInventorySync);

export default router;
