import express from "express";
import { getImpactMetrics } from "../controllers/publicController.js";

const router = express.Router();

// No auth required — public endpoint
router.get("/impact-metrics", getImpactMetrics);

export default router;
