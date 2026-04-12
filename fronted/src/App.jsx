import CheckInsurance from './pages/patient/CheckInsurance';
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/auth/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import FindMedicine from "./pages/patient/FindMedicine";
import NewClaim from "./pages/pharmacy/NewClaim";
import DashboardPharmacy from "./pages/pharmacy/Dashboard";
import InventoryPharmacy from "./pages/pharmacy/Inventory";
import InsurerDashboard from "./pages/insurer/InsurerDashboard";
import InsurerLayout from "./components/layout/InsurerLayout";
import RegulatorLayout from "./components/layout/RegulatorLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login/:role" element={<AuthPage />} />
      <Route
        path="/patient/check-insurance"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <CheckInsurance />
          </ProtectedRoute>
        }
      />
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
            <DashboardPharmacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pharmacy/claims/new"
        element={
          <ProtectedRoute allowedRoles={["pharmacy"]}>
            <NewClaim />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pharmacy/inventory"
        element={
          <ProtectedRoute allowedRoles={["pharmacy"]}>
            <InventoryPharmacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/insurer"
        element={
          <ProtectedRoute allowedRoles={["insurer"]}>
            <InsurerLayout>
              <InsurerDashboard />
            </InsurerLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/regulator"
        element={
          <ProtectedRoute allowedRoles={["regulator"]}>
            <RegulatorLayout>
              <DashboardPage role="regulator" />
            </RegulatorLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
