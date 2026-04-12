import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, 
  LayoutDashboard, 
  UserPlus, 
  ShieldAlert, 
  FileText, 
  Network, 
  ClipboardList, 
  PieChart, 
  LogOut,
  Bell,
  WifiOff
} from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { io } from "socket.io-client";

const InsurerLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const [socketConnected, setSocketConnected] = useState(true);

  useEffect(() => {
    // Configure socket resilience
    const socket = io("http://localhost:5000", { 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login/insurer");
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard/insurer", icon: LayoutDashboard },
    { name: "Onboarding", path: "/dashboard/insurer/onboarding", icon: UserPlus },
    { name: "Fraud Alerts", path: "/dashboard/insurer/alerts", icon: ShieldAlert },
  ];

  const portalLinks = [
    { name: "Claims Overview", path: "/dashboard/insurer/claims", icon: FileText },
    { name: "Pharmacy Network", path: "/dashboard/insurer/network", icon: Network },
    { name: "Onboarding Workflow", path: "/dashboard/insurer/workflow", icon: ClipboardList },
    { name: "Reports", path: "/dashboard/insurer/reports", icon: PieChart },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-xl font-bold text-slate-800 font-display tracking-tight">ImitiNet</span>
          </div>

          {/* Main Navigation */}
          <nav className="p-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Portal Navigation */}
          <div className="mt-4">
            <h3 className="px-7 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Insurer Portal
            </h3>
            <nav className="px-4 space-y-1">
              {portalLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-blue-50 text-blue-700" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100">
           <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
           >
             <LogOut className="h-5 w-5 mr-3 text-red-500" />
             Logout
           </button>
           <div className="px-3 mt-4">
             <p className="text-xs text-slate-400 font-medium">&copy; 2026 ImitiNet Rwanda.</p>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold font-display text-slate-800">Insurer Dashboard</h1>
             {!socketConnected && (
               <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
                 <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                 <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Reconnecting...</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-5">
            <button className="relative p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.fullName?.charAt(0) || "I"}
            </div>
          </div>
        </header>

        {/* Scrollable Main View */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default InsurerLayout;
