import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import claimsRoutes from "./routes/claimsRoutes.js";
import patientDashboardRoutes from "./routes/patientDashboardRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import pharmacyInventoryRoutes from "./routes/pharmacyInventoryRoutes.js";
import insurerRoutes from "./routes/insurerRoutes.js";
import regulatorRoutes from "./routes/regulatorRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/patient", patientDashboardRoutes);
  app.use("/api/pharmacy/prescription", prescriptionRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/claims", claimsRoutes);
  app.use("/api/pharmacy/dashboard", dashboardRoutes);
  app.use("/api/pharmacy/inventory", pharmacyInventoryRoutes);
  app.use("/api/insurer", insurerRoutes);
  app.use("/api/regulator", regulatorRoutes);
  app.use("/api/receptionist", receptionistRoutes);
  app.use("/api/public", publicRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal server error",
    });
  });

  return app;
}
