import React from "react";
import { ActivitySquare, ClipboardCheck, Home, LogOut, Plus } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";

const navItems = [
  { label: "Reception Home", icon: Home, to: "/dashboard/receptionist" },
  {
    label: "Patient Verification",
    icon: ClipboardCheck,
    to: "/dashboard/receptionist/verify",
  },
  {
    label: "Analytics Dashboard",
    icon: ActivitySquare,
    to: "/dashboard/receptionist/analytics",
  },
];

function ReceptionistLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-[286px] shrink-0 flex-col border-r border-slate-200 bg-white px-6 py-7 lg:flex">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1E56D0]">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight text-slate-900">
                ImitiNet
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Reception Hub
              </p>
            </div>
          </Link>

          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Hospital Receptionist Portal
            </p>
            <nav className="mt-5 space-y-2">
              {navItems.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={to === "/dashboard/receptionist"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-[#1E56D0]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-auto rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
            <p className="mt-1 text-xs text-slate-500">{user?.facilityId}</p>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1E56D0]">
              Session-based verification
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              Hospital Receptionist Verification Hub
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Verify patient identity, confirm insurance response signals, and hand over a secure
              verification token to downstream claim workflows.
            </p>
          </header>

          <main className="flex-1 px-6 py-8 sm:px-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default ReceptionistLayout;
