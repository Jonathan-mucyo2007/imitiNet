import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/auth/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import FindMedicine from "./pages/patient/FindMedicine";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login/:role" element={<AuthPage />} />
      <Route
        path="/dashboard/patient"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <FindMedicine />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pharmacy"
        element={
          <ProtectedRoute allowedRoles={["pharmacy"]}>
            <DashboardPage role="pharmacy" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/insurer"
        element={
          <ProtectedRoute allowedRoles={["insurer"]}>
            <DashboardPage role="insurer" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/regulator"
        element={
          <ProtectedRoute allowedRoles={["regulator"]}>
            <DashboardPage role="regulator" />
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
