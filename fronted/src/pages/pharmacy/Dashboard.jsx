import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { io } from "socket.io-client";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

const STATUS_COLORS = {
  Pending: "#0A0A0A",
  Flagged_By_AI: "#DC2626",
  Approved: "#D1D5DB",
  Rejected: "#EF4444",
  Cancelled: "#94A3B8",
};

const REVIEWABLE_STATUSES = ["Pending", "Flagged_By_AI"];

function formatCurrency(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-CA");
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

function getStatusBadgeClass(status) {
  if (status === "Approved") return "bg-emerald-50 text-emerald-700";
  if (status === "Rejected") return "bg-rose-50 text-rose-700";
  if (status === "Flagged_By_AI") return "bg-red-50 text-red-700";
  if (status === "Cancelled") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function ClaimDetailsModal({ claim, onClose }) {
  if (!claim) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          className="w-full max-w-2xl rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Claim Details</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">{claim.claimId}</h3>
              <p className="mt-1 text-sm text-slate-500">{claim.patientName} • {claim.insurerName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{claim.status}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Submitted</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(claim.submittedAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Claim Amount</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(claim.totalAmountRWF)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Patient Pays</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(claim.patientPaysRWF)}</p>
            </div>
          </div>

          {claim.aiFraudCheck?.isAnomalous ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="h-4 w-4" />
                <p className="text-sm font-semibold">AI fraud review required</p>
              </div>
              <p className="mt-2 text-sm text-red-700">
                {claim.aiFraudCheck.reasonCode} • Score {claim.aiFraudCheck.anomalyScore}
              </p>
            </div>
          ) : null}

          {claim.rejectionReason ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-700">Rejection Reason</p>
              <p className="mt-2 text-sm text-rose-700">{claim.rejectionReason}</p>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedClaim, setSelectedClaim] = useState(null);

  const statsQuery = useQuery({
    queryKey: ["pharmacy-dashboard", "stats"],
    queryFn: async () => (await api.get("/pharmacy/dashboard/stats")).data,
    staleTime: 30000,
  });

  const recentClaimsQuery = useQuery({
    queryKey: ["pharmacy-dashboard", "recent-claims"],
    queryFn: async () => (await api.get("/pharmacy/dashboard/recent-claims")).data,
    staleTime: 15000,
  });

  const trendsQuery = useQuery({
    queryKey: ["pharmacy-dashboard", "processing-trends"],
    queryFn: async () => (await api.get("/pharmacy/dashboard/processing-trends")).data,
    staleTime: 30000,
  });

  const cancelClaimMutation = useMutation({
    mutationFn: async (claimId) => (await api.patch(`/claims/${claimId}/cancel`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["insurer-dashboard"] });
    },
  });

  useEffect(() => {
    const socket = io("http://localhost:5000", { withCredentials: true });

    const handleRegistryUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["insurer-dashboard"] });
    };

    socket.on("claim_status_updated", handleRegistryUpdate);
    socket.on("fraud_alert_detected", handleRegistryUpdate);

    return () => {
      socket.off("claim_status_updated", handleRegistryUpdate);
      socket.off("fraud_alert_detected", handleRegistryUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  if (statsQuery.isLoading || recentClaimsQuery.isLoading || trendsQuery.isLoading) {
    return (
      <PharmacyLayout title="Claim Dashboard" subtitle="Loading operational analytics...">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-400">Aggregating claim data...</p>
          </div>
        </div>
      </PharmacyLayout>
    );
  }

  const stats = statsQuery.data || {};
  const recentClaims = recentClaimsQuery.data || [];
  const trends = trendsQuery.data || [];

  const kpis = stats.kpis || {
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
  };
  const statusDistribution = stats.statusDistribution || [];
  const averageApprovalHours = stats.averageApprovalHours || 0;

  const total = kpis.totalClaims || 1;
  const pendingPct = Math.round((kpis.pendingClaims / total) * 100);
  const approvedPct = Math.round((kpis.approvedClaims / total) * 100);
  const deniedPct = Math.round((kpis.rejectedClaims / total) * 100);

  return (
    <PharmacyLayout
      title="Claim Dashboard"
      subtitle="Submission oversight only. Final claim adjudication is restricted to the insurer."
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              <span>Pending Review</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{kpis.pendingClaims}</p>
            <p className="mt-1 text-xs text-slate-400">Includes AI-flagged insurer review items.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4" />
              <span>Approved Claims</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{kpis.approvedClaims}</p>
            <p className="mt-1 text-xs text-slate-400">Completed by insurer adjudication.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <XCircle className="h-4 w-4" />
              <span>Rejected Claims</span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{kpis.rejectedClaims}</p>
            <p className="mt-1 text-xs text-slate-400">Rejected by insurer review.</p>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">Claim Status Distribution</h3>
            <p className="mt-1 text-xs text-slate-400">Breakdown of claim states across the pharmacy submission queue.</p>

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
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#CBD5E1"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{kpis.totalClaims}</span>
                  <span className="text-xs text-slate-400">Total</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-black" />
                <span className="text-slate-500">Pending <span className="font-semibold text-slate-700">{pendingPct}%</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="text-slate-500">Approved <span className="font-semibold text-slate-700">{approvedPct}%</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-500">Denied <span className="font-semibold text-slate-700">{deniedPct}%</span></span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Avg. Approval Time</h3>
              <p className="mt-1 text-xs text-slate-400">Measured only on insurer-resolved claims.</p>
            </div>
            <div className="flex w-full flex-col items-center justify-center py-8">
              <motion.span initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-6xl font-bold tracking-tighter text-slate-900">
                {averageApprovalHours} <span className="text-3xl font-medium text-slate-400">hrs</span>
              </motion.span>
            </div>
            <div className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Live updates sync automatically with insurer actions.</span>
            </div>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white">
          <div className="px-6 py-5">
            <h3 className="text-base font-semibold text-slate-900">Recent Claims</h3>
            <p className="mt-1 text-xs text-slate-400">Pharmacies can retract open claims, but only insurers can approve or reject them.</p>
          </div>

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

            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {recentClaims.map((claim, idx) => {
                    const isReviewable = REVIEWABLE_STATUSES.includes(claim.status);

                    return (
                      <motion.tr
                        key={claim._id || claim.claimId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        className="transition-colors hover:bg-slate-50/60"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{claim.claimId}</td>
                        <td className="px-6 py-4 text-slate-700">{claim.patientName}</td>
                        <td className="px-6 py-4 text-slate-500">{claim.insurerName}</td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(claim.submittedAt)}</td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{formatCurrency(claim.totalAmountRWF)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {claim.status === "Flagged_By_AI" ? (
                              <ShieldAlert className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(claim.status)}`}>
                              {claim.status}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isReviewable ? (
                              <button
                                type="button"
                                onClick={() => cancelClaimMutation.mutate(claim._id)}
                                disabled={cancelClaimMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Cancel Claim
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setSelectedClaim(claim)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}

                  {recentClaims.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-slate-400">
                        No recent claims found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">Claim Processing Time</h3>
          <p className="mt-1 text-xs text-slate-400">Average time to process insurer decisions over the last 7 days.</p>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={formatShortDate} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} ticks={[0, 6, 12, 18, 24]} domain={[0, 24]} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="avgTime" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <AnimatePresence>{selectedClaim ? <ClaimDetailsModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} /> : null}</AnimatePresence>
    </PharmacyLayout>
  );
}
