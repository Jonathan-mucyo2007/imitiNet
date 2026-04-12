import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, 
  LayoutDashboard, 
  Scan, 
  Activity, 
  Gavel, 
  LogOut,
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";

const RegulatorLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate("/login/regulator");
  };

  const navLinks = [
    { name: "National Dashboard", path: "/dashboard/regulator", icon: LayoutDashboard },
    { name: "Medicine Traceability", path: "/dashboard/regulator/traceability", icon: Scan },
    { name: "Indicators", path: "/dashboard/regulator/indicators", icon: Activity },
    { name: "Governance Framework", path: "/dashboard/regulator/governance", icon: Gavel },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-xl font-bold text-slate-800 font-display tracking-tight">ImitiNet</span>
          </div>

          <div className="mt-6">
            <h3 className="px-7 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              REGULATOR OVERSIGHT
            </h3>
            <nav className="px-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-slate-100 text-slate-900 border border-slate-200 shadow-sm" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-slate-700' : 'text-slate-400'}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
           <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center px-3 py-2.5 text-sm font-medium text-white bg-red-600 shadow-sm rounded-lg hover:bg-red-700 transition-colors"
           >
             <LogOut className="h-4 w-4 mr-2" />
             Logout
           </button>
           <div className="mt-4 text-center">
             <p className="text-xs text-slate-400 font-medium">&copy; ImitiNet 2026</p>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
};
export default RegulatorLayout;
