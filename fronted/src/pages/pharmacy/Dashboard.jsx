import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

const STATUS_COLORS = {
  Pending: "#0A0A0A",
  Approved: "#D1D5DB",
  Rejected: "#EF4444",
};

function formatCurrency(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = React.useRef(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function loadDashboard() {
      try {
        const [statsRes, claimsRes, trendsRes] = await Promise.all([
          api.get("/pharmacy/dashboard/stats"),
          api.get("/pharmacy/dashboard/recent-claims"),
          api.get("/pharmacy/dashboard/processing-trends"),
        ]);
        setStats(statsRes.data);
        setRecentClaims(claimsRes.data);
        setTrends(trendsRes.data);
      } catch (error) {
        console.error("Dashboard data load failed", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  async function handleClaimAction(claimId, newStatus) {
    setActionLoading(claimId);
    try {
      await api.patch(`/pharmacy/dashboard/claims/${claimId}/status`, { status: newStatus });

      // Optimistic UI update: update the claim in local state immediately
      setRecentClaims((prev) =>
        prev.map((c) => (c._id === claimId ? { ...c, status: newStatus } : c))
      );

      // Refresh stats to keep KPIs and donut chart in sync
      const statsRes = await api.get("/pharmacy/dashboard/stats");
      setStats(statsRes.data);
    } catch (error) {
      console.error("Claim action failed", error);
      alert(error.response?.data?.message || "Failed to update claim status.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <PharmacyLayout
        title="Claim Dashboard"
        subtitle="Loading operational analytics..."
      >
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-400">Aggregating claim data...</p>
          </div>
        </div>
      </PharmacyLayout>
    );
  }

  const kpis = stats?.kpis || {
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
  };
  const statusDistribution = stats?.statusDistribution || [];
  const averageApprovalHours = stats?.averageApprovalHours || 0;
  const processedToday = stats?.processedToday || 0;

  // Calculate donut percentage labels
  const total = kpis.totalClaims || 1;
  const pendingPct = Math.round((kpis.pendingClaims / total) * 100);
  const approvedPct = Math.round((kpis.approvedClaims / total) * 100);
  const deniedPct = Math.round((kpis.rejectedClaims / total) * 100);

  return (
    <PharmacyLayout
      title="Claim Dashboard"
      subtitle="Administrative commands center and real-time operational analytics."
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── Section 1: KPI Cards (3 cards) ── */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white px-6 py-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              <span>Pending Claims</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {kpis.pendingClaims}
            </p>
            <p className="mt-1 text-xs text-slate-400">Currently under review.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-slate-200 bg-white px-6 py-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>Approved Claims</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {kpis.approvedClaims}
            </p>
            <p className="mt-1 text-xs text-slate-400">Successfully processed.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-slate-200 bg-white px-6 py-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <XCircle className="h-4 w-4" />
              <span>Denied Claims</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {kpis.rejectedClaims}
            </p>
            <p className="mt-1 text-xs text-slate-400">Rejected by insurer.</p>
          </motion.div>
        </section>

        {/* ── Section 2: Donut + Avg Approval Time ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="text-base font-semibold text-slate-900">
              Claim Status Distribution
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Breakdown of all claims by current status.
            </p>

            <div className="mt-4 flex items-center justify-center">
              <div className="relative h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={1}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.name] || "#CBD5E1"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "13px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">
                    {kpis.totalClaims}
                  </span>
                  <span className="text-xs text-slate-400">Total</span>
                </div>
              </div>
            </div>

            {/* Percentage legend row below donut */}
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-black" />
                <span className="text-slate-500">
                  Pending{" "}
                  <span className="font-semibold text-slate-700">{pendingPct}%</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="text-slate-500">
                  Approved{" "}
                  <span className="font-semibold text-slate-700">{approvedPct}%</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-500">
                  Denied{" "}
                  <span className="font-semibold text-slate-700">{deniedPct}%</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* Avg. Approval Time */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-start justify-between"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Avg. Approval Time
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Average insurer turnaround.
              </p>
            </div>
            <div className="flex w-full flex-col items-center justify-center py-8">
              <motion.span
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-6xl font-bold tracking-tighter text-slate-900"
              >
                {averageApprovalHours}{" "}
                <span className="text-3xl font-medium text-slate-400">hrs</span>
              </motion.span>
            </div>
            <div className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+6% from last period</span>
            </div>
          </motion.div>
        </section>

        {/* ── Section 3: Recent Claims Table (full-width, scrollable) ── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="px-6 py-5">
            <h3 className="text-base font-semibold text-slate-900">
              Recent Claims
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Latest claims submitted for review and action.
            </p>
          </div>

          {/* Sticky header + scrollable body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50/95 text-xs uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-6 py-3 font-medium">Claim ID</th>
                  <th className="px-6 py-3 font-medium">Patient Name</th>
                  <th className="px-6 py-3 font-medium">Insurer</th>
                  <th className="px-6 py-3 font-medium">Date Submitted</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
            </table>

            {/* Scrollable body */}
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {recentClaims.map((claim, idx) => (
                    <motion.tr
                      key={claim._id || claim.claimId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="transition-colors hover:bg-slate-50/60"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                        {claim.claimId}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {claim.patientName}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {claim.insurerName}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(claim.submittedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                        {formatCurrency(claim.totalAmountRWF)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            claim.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : claim.status === "Rejected"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {claim.status === "Rejected" ? "Denied" : claim.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {claim.status === "Pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleClaimAction(claim._id, "Approved")}
                              disabled={actionLoading === claim._id}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClaimAction(claim._id, "Rejected")}
                              disabled={actionLoading === claim._id}
                              className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {recentClaims.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-10 text-center text-slate-400"
                      >
                        No recent claims found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* ── Section 4: Bar Chart (full-width) ── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h3 className="text-base font-semibold text-slate-900">
            Claim Processing Time
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Average time to process claims over the last 7 days.
          </p>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trends}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94A3B8" }}
                  ticks={[0, 6, 12, 18, 24]}
                  domain={[0, 24]}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                />
                <Bar
                  dataKey="avgTime"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>
    </PharmacyLayout>
  );
}
