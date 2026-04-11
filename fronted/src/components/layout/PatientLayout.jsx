import React from "react";
import {
  Bell,
  CalendarDays,
  LayoutGrid,
  LogOut,
  Pill,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";

const sidebarItems = [
  { label: "My Dashboard", icon: LayoutGrid, to: "/dashboard/patient-overview", disabled: true },
  { label: "Find Medicine", icon: Pill, to: "/dashboard/patient" },
  { label: "Check Insurance", icon: ShieldCheck, to: "/dashboard/patient-insurance", disabled: true },
  { label: "My Appointments", icon: CalendarDays, to: "/dashboard/patient-appointments", disabled: true },
];

function PatientLayout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative w-full border-b border-slate-200 bg-white px-6 py-8 lg:min-h-screen lg:w-[270px] lg:border-b-0 lg:border-r">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <p className="font-display text-xl font-semibold tracking-tight text-blue-600">
              ImitiNet
            </p>
          </Link>

          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              All Online Services
            </p>

            <nav className="mt-5 space-y-2">
              {sidebarItems.map(({ label, icon: Icon, to, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-400"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </div>
                ) : (
                  <NavLink
                    key={label}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition ${
                        isActive
                          ? "border-blue-600 bg-slate-100 font-medium text-slate-900"
                          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </NavLink>
                )
              )}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="mt-10 inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 lg:absolute lg:bottom-8 lg:left-6"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <div className="flex-1 bg-slate-50">
          <header className="border-b border-slate-200 bg-slate-50/90 px-6 py-5 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </button>

              <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80"
                  alt="User avatar"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="pr-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.email?.split("@")[0] || "Patient"}
                  </p>
                  <p className="text-xs text-slate-500">Patient Portal</p>
                </div>
              </div>
            </div>
          </header>

          <main className="px-6 py-8 sm:px-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default PatientLayout;
