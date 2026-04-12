import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";
import { Activity, ShieldAlert, ShieldCheck, FileText, CheckCircle, AlertTriangle, BarChart as BarChartIcon, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import api from "../../services/api";
import { io } from "socket.io-client";

// --- Formatter Helpers ---

const formatCurrencyMillions = (amount) => {
  if (!amount) return "0 RWF";
  const formatter = new Intl.NumberFormat("rw-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  const formattedString = formatter.format(amount / 1000000);
  return formattedString.replace("RWF", "").replace("Fw", "").trim() + "M RWF";
};

const formatCurrency = (amount) => {
  if (!amount) return "0 RWF";
  const formatter = new Intl.NumberFormat("rw-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  });
  return formatter.format(amount).replace("RWF", "").replace("Fw", "").trim() + " RWF";
};

// --- Custom Components ---

const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-3 border border-slate-200 shadow-xl rounded-xl custom-tooltip-container z-50 relative">
        <p className="text-sm font-semibold text-slate-700 mb-1 tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex flex-col">
             <span className="text-xs font-bold" style={{ color: entry.stroke || entry.fill }}>
              {entry.name}: {isCurrency ? formatCurrencyMillions(entry.value) : new Intl.NumberFormat('rw-RW').format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const KPIDataCard = ({ title, value, percentageStr, isPositive, description, Icon, testId }) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow" data-testid={testId}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">{value}</h2>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {percentageStr} This Quarter
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-3">{description}</p>
      </div>
    </div>
  );
};

const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];

const InsurerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState({
    metrics: { 
      totalClaims: 0, totalClaimsPctChange: "+0%", totalClaimsPositive: true,
      approvedClaims: 0, approvedClaimsPctChange: "+0%", approvedClaimsPositive: true,
      pendingClaims: 0, pendingClaimsPctChange: "-0%", pendingClaimsPositive: true,
      totalPayoutRWF: 0, totalPayoutPctChange: "+0%", totalPayoutPositive: true
    },
    trendData: [],
    categoryDistribution: [],
    recentClaims: [],
  });

  const [realTimeAlerts, setRealTimeAlerts] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:5000", { withCredentials: true });

    socket.on("fraud_alert_detected", (fraudData) => {
      setRealTimeAlerts((prev) => [fraudData, ...prev]);
    });

    const fetchData = async () => {
      try {
        const response = await api.get("/insurer/dashboard");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => socket.disconnect();
  }, []);

  const triggerFraudTest = async () => {
    try {
      await api.post("/insurer/trigger-fraud-scan");
    } catch(err) {
      console.log("Failed fraud test", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const { metrics, trendData, categoryDistribution, recentClaims } = data;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      
      {/* Header Context */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-slate-800 tracking-tight">Overview Metrics</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time aggregate financial evaluations and fraud monitoring.</p>
        </div>
        <button
           onClick={triggerFraudTest} 
           className="bg-red-50 text-red-600 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100 flex items-center font-semibold text-sm transition-colors shadow-sm"
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Simulate Network Alert
        </button>
      </div>

      {/* Phase 2: Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPIDataCard 
          title="Total Claims" 
          value={new Intl.NumberFormat('rw-RW').format(metrics.totalClaims)} 
          percentageStr={metrics.totalClaimsPctChange} 
          isPositive={metrics.totalClaimsPositive} 
          description="Total claim submissions received."
          Icon={FileText}
          testId="kpi-total-claims"
        />
        <KPIDataCard 
          title="Approved Claims" 
          value={new Intl.NumberFormat('rw-RW').format(metrics.approvedClaims)} 
          percentageStr={metrics.approvedClaimsPctChange} 
          isPositive={metrics.approvedClaimsPositive} 
          description="Successfully processed claims."
          Icon={CheckCircle}
          testId="kpi-approved-claims"
        />
        <KPIDataCard 
          title="Pending Claims" 
          value={new Intl.NumberFormat('rw-RW').format(metrics.pendingClaims)} 
          percentageStr={metrics.pendingClaimsPctChange} 
          isPositive={metrics.pendingClaimsPositive} 
          description="Claims awaiting approval."
          Icon={AlertTriangle}
          testId="kpi-pending-claims"
        />
        <KPIDataCard 
          title="Total Payout" 
          value={formatCurrencyMillions(metrics.totalPayoutRWF)} 
          percentageStr={metrics.totalPayoutPctChange} 
          isPositive={metrics.totalPayoutPositive} 
          description="Total amount disbursed in RWF."
          Icon={BarChartIcon}
          testId="kpi-total-payout"
        />
      </div>

      {/* Phase 3: First Super Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Volume Trend Chart */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl p-6 border border-slate-200 relative">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Claim Volume Trend</h3>
          <p className="text-sm text-slate-500 mb-6">Monthly count of claims over a rolling 12-month period.</p>
          <div className="h-[280px]" data-testid="volume-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis type="number" domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip content={<CustomTooltip isCurrency={false} />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} wrapperStyle={{ zIndex: 100 }} />
                <Line animationBegin={200} type="monotone" name="Claims" dataKey="volume" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Cost Trend Analysis Chart */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 border border-slate-200 relative">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Cost Trend Analysis (M RWF)</h3>
          <p className="text-sm text-slate-500 mb-6">Total payout trajectory distributed in millions of RWF.</p>
          <div className="h-[280px]" data-testid="cost-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis type="number" tickFormatter={(val) => `${val/1000000}M`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={45} />
                <RechartsTooltip content={<CustomTooltip isCurrency={true} />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} wrapperStyle={{ zIndex: 100 }} />
                <Line animationBegin={400} type="monotone" name="Cost" dataKey="currentAmount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Phase 5: Third Super Chart - Stacked Financial Detail */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 border border-slate-200 relative">
         <h3 className="text-lg font-bold text-slate-900 mb-1">Detailed Financial Payout Trend (Month-over-Month)</h3>
         <p className="text-sm text-slate-500 mb-6">A stacked macroscopic view of fulfilled claim disbursements by payment channel logic.</p>
         <div className="h-[350px]">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorMomo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCheck" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis type="number" tickFormatter={(val) => `${val/1000000}M`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={45} />
                <RechartsTooltip content={<CustomTooltip isCurrency={true} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                <Area animationDuration={1500} type="monotone" name="MTN MoMo" dataKey="momo" stackId="1" stroke="#facc15" fill="url(#colorMomo)" />
                <Area animationDuration={1500} type="monotone" name="Bank Transfer" dataKey="bankTransfer" stackId="1" stroke="#3b82f6" fill="url(#colorBank)" />
                <Area animationDuration={1500} type="monotone" name="Internal Check" dataKey="internalCheck" stackId="1" stroke="#10b981" fill="url(#colorCheck)" />
                <Area animationDuration={1500} type="monotone" name="Airtel Money" dataKey="airtelMoney" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
             </AreaChart>
           </ResponsiveContainer>
         </div>
      </motion.div>

      {/* Phase 4: Second Super Section - Donut & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Medicine Category */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 border border-slate-200">
           <h3 className="text-lg font-bold text-slate-900 mb-1">Claims Breakdown by Medicine Category</h3>
           <p className="text-sm text-slate-500 mb-6">Distribution mapping aligned with ATC / Rwandan MoH baseline structures.</p>
           <div className="flex flex-col md:flex-row items-center h-[280px]">
             <div className="h-[220px] w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      animationBegin={600}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <RechartsTooltip wrapperStyle={{ zIndex: 100 }} itemStyle={{ color: '#333' }} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             {/* Custom Interactive Legend */}
             <div className="w-full md:w-1/2 flex flex-col gap-3 justify-center pl-4 mt-6 md:mt-0">
               {categoryDistribution.map((entry, index) => (
                 <div key={index} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                     <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                     <span className="font-semibold text-slate-700">{entry.name}</span>
                   </div>
                   <span className="text-slate-500 font-medium">{new Intl.NumberFormat().format(entry.value)}</span>
                 </div>
               ))}
               {categoryDistribution.length === 0 && (
                 <p className="text-xs text-slate-400">Loading categorized payloads...</p>
               )}
             </div>
           </div>
        </motion.div>

        {/* Real-time Network Alerts (Fraud Detection) */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col">
           <h3 className="text-lg font-bold text-slate-900 mb-1">Real-Time Network Alerts</h3>
           <p className="text-sm text-slate-500 mb-6">Suspicious claim patterns detected via AI ML Pipeline.</p>
           <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex-1 overflow-auto max-h-[280px]">
              {realTimeAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
                      <ShieldCheck className="h-10 w-10 mb-2" />
                      <p className="text-sm font-medium">Network is secure. No anomalies detected.</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {realTimeAlerts.map((alert, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-lg border border-red-100 border-l-4 border-l-red-500 shadow-sm flex items-start gap-4 transition-all">
                              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 px-2 py-0.5 bg-red-50 inline-block rounded">
                                      {alert.type || 'Anomaly Limit Reached'}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      Score: {alert.anomalyScore}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800 mt-2">{alert.message || 'Suspicious payload intercepted.'}</p>
                                  <div className="flex items-center gap-3 mt-3">
                                    <p className="text-xs font-mono text-slate-500">Code: <span className="text-slate-700">{alert.reasonCode || 'N/A'}</span></p>
                                    <span className="text-xs text-slate-300">•</span>
                                    <p className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                    <div className="flex-1"></div>
                                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                                      Review Details &rarr;
                                    </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
           </div>
        </motion.div>
      </div>

      {/* Phase 6: Full Recent Claims Table */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h3 className="text-lg font-bold text-slate-900">Recent Claims Registry</h3>
             <p className="text-sm text-slate-500">Latest structural claims processed mapped to FHIR system metrics.</p>
           </div>
           <div className="relative w-full sm:w-auto">
             <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
             <input
               type="text"
               placeholder="Search registry..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64"
             />
           </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200">Claim ID / Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200">Patient</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200">Core Medicine (FHIR Code)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200 text-right">Amount (RWF)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap border-b border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentClaims?.filter(claim => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  claim?.claimId?.toLowerCase().includes(term) ||
                  claim?.patientName?.toLowerCase().includes(term)
                );
              }).map((claim, idx) => {
                // Safely extract the primary snapshot item
                const primaryMeds = claim.medicineSnapshot?.[0];

                return (
                  <tr key={claim._id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-slate-900">{claim.claimId}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(claim.submittedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{claim.patientName}</div>
                      <div className="text-xs text-slate-500 mt-0.5 capitalize">{claim.paymentChannel || 'Bank Transfer'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{primaryMeds?.name || 'Unspecified'}</div>
                      {primaryMeds?.system && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">{primaryMeds.system}</span>
                          <span className="text-xs font-mono text-slate-500">{primaryMeds.standardizedCode}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="text-sm font-bold text-slate-900">{formatCurrency(claim.totalAmountRWF)}</div>
                       <div className="text-xs text-slate-500 mt-0.5 opacity-70">Paid: {formatCurrency(claim.coveredAmountRWF)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${
                        claim.status === "Approved" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                        claim.status === "Pending" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        "bg-red-100 text-red-700 border border-red-200"
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentClaims?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm font-medium">Registry is currently empty.</p>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default InsurerDashboard;
