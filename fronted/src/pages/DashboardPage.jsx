import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  Activity, Printer, Hospital, Users, Pill, Stethoscope,
  Truck, CheckCircle2, Clock, ShieldAlert, MapPin
} from "lucide-react";
import api from "../services/api";
import RwandaGeoMap from "../components/charts/RwandaGeoMap";

// ─── Formatters ──────────────────────────────────────────────────────────────

const formatK = (n) => {
  if (!n && n !== 0) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K+`;
  return `${n}+`;
};

// ─── Custom Recharts Tooltip ─────────────────────────────────────────────────

const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-3 z-50">
      <p className="text-sm font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
          <span className="font-semibold text-slate-600">{entry.name}:</span>
          <span className="font-bold text-slate-900">
            {typeof entry.value === "number" ? new Intl.NumberFormat().format(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const CoverageTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-3 z-50">
      <p className="text-sm font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.stroke }}></span>
          <span className="font-semibold text-slate-600">{entry.name}:</span>
          <span className="font-bold text-slate-900">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
};

// ─── Status Badge Helper ─────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const styles = {
    "Delivered": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "In Transit": "bg-amber-100 text-amber-700 border-amber-200",
    "Shipped": "bg-blue-100 text-blue-700 border-blue-200",
    "Pending Auth.": "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md border ${styles[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
};

// ─── Compliance Donut Colors ─────────────────────────────────────────────────

const COMPLIANCE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444"];

// ─── Main Component ──────────────────────────────────────────────────────────

function DashboardPage() {
  const [data, setData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const pollRef = useRef(null);
  const isFirstFetch = useRef(true);

  const fetchSync = useCallback(async () => {
    try {
      const res = await api.get("/regulator/sync");
      const payload = res.data?.entry?.[0]?.resource?.payload;
      if (payload) {
        setData(payload);
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      if (isFirstFetch.current) {
        setInitialLoading(false);
        isFirstFetch.current = false;
      }
    }
  }, []);

  useEffect(() => {
    fetchSync();
    pollRef.current = setInterval(fetchSync, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchSync]);

  const handleQuickAudit = async () => {
    try {
      await api.post("/regulator/audit-log");
    } catch (e) {
      console.log("Audit log dispatch error:", e);
    }
    window.print();
  };

  if (initialLoading || !data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const { kpis, consultationTrends, coverageByRegion, complianceStatus, recentSupplyChain, facilityPerformance } = data;

  const complianceData = [
    { name: "Compliant", value: complianceStatus?.compliant || 0 },
    { name: "Under Review", value: complianceStatus?.underReview || 0 },
    { name: "Non-Compliant", value: complianceStatus?.nonCompliant || 0 },
  ];

  const kpiCards = [
    { title: "Ibitaro", value: formatK(kpis?.ibitaro), Icon: Hospital, color: "text-blue-500" },
    { title: "Patients", value: formatK(kpis?.patients), Icon: Users, color: "text-blue-500" },
    { title: "Pharmacy", value: `${kpis?.pharmacyCoverage || 0}%`, Icon: Stethoscope, color: "text-blue-500" },
    { title: "Medicines Tracked", value: formatK(kpis?.medicinesTracked), Icon: Pill, color: "text-blue-500" },
  ];

  return (
    <div className="p-8 max-w-[1500px] mx-auto print:p-2" id="regulator-dashboard-print-area">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight" data-testid="national-title">
            National Dashboard
          </h1>
        </div>
        <button
          onClick={handleQuickAudit}
          className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors print:hidden"
          data-testid="quick-audit-btn"
        >
          <Printer className="h-4 w-4" />
          Quick Audit
        </button>
      </div>

      {/* ── National Health Overview KPIs ─────────────────────────────────── */}
      <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-5">National Health Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5" data-testid="kpi-row">
          {kpiCards.map((card, i) => {
            const Icon = card.Icon;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-start gap-3 hover:shadow-md transition-shadow group" data-testid={`kpi-${card.title.toLowerCase().replace(/\s/g, '-')}`}>
                <Icon className={`h-7 w-7 ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`} strokeWidth={1.5} />
                <div>
                  <p className="text-2xl font-display font-bold text-slate-900">{card.value}</p>
                  <p className="text-sm text-slate-500 font-medium mt-1">{card.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Charts Row 1: Bar + Line ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Medical Consultations Trends */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Medical Consultations Trends</h3>
          <p className="text-sm text-slate-500 mb-5">Year-over-year comparison across national disease categories.</p>
          <div className="h-[280px]" data-testid="bar-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consultationTrends} margin={{ top: 5, right: 10, bottom: 5, left: -10 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                <RechartsTooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar name="Cases 2025" dataKey="cases2025" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={800} />
                <Bar name="Cases 2026" dataKey="cases2026" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ImitiNet Coverage by Region */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">ImitiNet Coverage by Region</h3>
          <p className="text-sm text-slate-500 mb-5">Actual vs Target adoption across five Rwandan provinces.</p>
          <div className="h-[280px]" data-testid="line-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={coverageByRegion} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip content={<CoverageTip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line name="Actual Coverage" type="monotone" dataKey="actualCoverage" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} animationDuration={800} />
                <Line name="Target" type="monotone" dataKey="targetCoverage" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Row 2: Supply Chain Table + Facility Performance ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Supply Chain Movements */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-slate-400" />
              Recent Supply Chain Movements
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="supply-chain-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Medication</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSupplyChain?.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.medication}</td>
                    <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.location}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 text-right font-medium">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Healthcare Facility Performance */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Healthcare Facility Performance</h3>
          <div className="space-y-5" data-testid="facility-performance">
            {[
              { label: "ImitiNet-Patient Ratio", value: facilityPerformance?.patientRatio },
              { label: "Avg. Wait Time (min)", value: facilityPerformance?.avgWaitTimeMin },
              { label: "Portal Utilization", value: `${facilityPerformance?.portalUtilization}%` },
              { label: "Supply Chain Score", value: `${facilityPerformance?.supplyChainScore}%` },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Compliance Donut + Geospatial Placeholder ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Status */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5">Compliance Status</h3>
          <div className="flex flex-col md:flex-row items-center">
            <div className="h-[220px] w-full md:w-1/2" data-testid="donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {complianceData.map((_, idx) => (
                      <Cell key={idx} fill={COMPLIANCE_COLORS[idx]} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 flex flex-col gap-3 pl-4 mt-4 md:mt-0">
              {complianceData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COMPLIANCE_COLORS[i] }}></span>
                    <span className="font-semibold text-slate-700">{entry.name}</span>
                  </div>
                  <span className="text-slate-500 font-bold">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Geospatial Health Data — Real Interactive Rwanda Map */}
        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Geospatial Health Data</h3>
          <p className="text-sm text-slate-500 mb-4">ImitiNet coverage by province. Hover for details.</p>
          <div className="flex-1" data-testid="geo-map">
            <RwandaGeoMap coverageByRegion={coverageByRegion} />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 print:hidden">
        <div className="flex gap-4 font-medium">
          <span>Product</span>
          <span>Resources</span>
          <span>Legal</span>
        </div>
        <div className="flex gap-3 mt-3 sm:mt-0">
          <span className="h-5 w-5 bg-slate-200 rounded-full inline-block"></span>
          <span className="h-5 w-5 bg-slate-200 rounded-full inline-block"></span>
          <span className="h-5 w-5 bg-slate-200 rounded-full inline-block"></span>
          <span className="h-5 w-5 bg-slate-200 rounded-full inline-block"></span>
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;
