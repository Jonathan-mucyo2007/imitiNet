import express from "express";
import { searchInventory } from "../controllers/inventoryController.js";
import { requireRole, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/search", verifyToken, requireRole(["patient"]), searchInventory);

export default router;
