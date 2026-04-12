import React from "react";
import {
  Bell,
  Boxes,
  FileCheck2,
  LogOut,
  Plus,
  ReceiptText,
  Settings2,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";

const sidebarItems = [
  { label: "Claim Dashboard", icon: ReceiptText, to: "/dashboard/pharmacy" },
  { label: "New Claim Submission", icon: FileCheck2, to: "/dashboard/pharmacy/claims/new" },
  { label: "Inventory Management", icon: Boxes, to: "/dashboard/pharmacy/inventory" },
  { label: "Pharmacy Settings", icon: Settings2, to: "/dashboard/pharmacy/settings", disabled: true },
];

function PharmacyLayout({ title, subtitle, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[290px] shrink-0 flex-col bg-slate-950 px-6 py-7 text-slate-100 lg:flex">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight text-white">
                ImitiNet
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Pharmacy Portal
              </p>
            </div>
          </Link>

          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Pharmacy Workspace
            </p>

            <nav className="mt-5 space-y-2">
              {sidebarItems.map(({ label, icon: Icon, to, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-500"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </div>
                ) : (
                  <NavLink
                    key={label}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
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

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">{user?.fullName || "Pharmacy User"}</p>
            <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-slate-50/95 px-6 py-5 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Claims Automation
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
              </div>

              <div className="flex items-center justify-end gap-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>

                <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {(user?.fullName || "PA")
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="pr-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.fullName || "Pharmacy Admin"}
                    </p>
                    <p className="text-xs text-slate-500">Operational Pharmacist</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 sm:px-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default PharmacyLayout;
