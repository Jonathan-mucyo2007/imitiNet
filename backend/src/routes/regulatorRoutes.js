import express from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";
import { syncNationalStats, auditLogEvent } from "../controllers/regulatorController.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(["regulator"]));

router.get("/sync", syncNationalStats);
router.post("/audit-log", auditLogEvent);

export default router;
