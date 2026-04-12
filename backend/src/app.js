import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import claimsRoutes from "./routes/claimsRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import pharmacyInventoryRoutes from "./routes/pharmacyInventoryRoutes.js";
import insurerRoutes from "./routes/insurerRoutes.js";

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
  app.use("/api/patients", patientRoutes);
  app.use("/api/prescriptions", prescriptionRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/claims", claimsRoutes);
  app.use("/api/pharmacy/dashboard", dashboardRoutes);
  app.use("/api/pharmacy/inventory", pharmacyInventoryRoutes);
  app.use("/api/insurer", insurerRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal server error",
    });
  });

  return app;
}
