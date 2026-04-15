import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { io } from "socket.io-client";
import api from "../../services/api";

const REVIEWABLE_STATUSES = ["Pending", "Flagged_By_AI"];
const PIE_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];

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

const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="relative z-50 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur-md">
      <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex flex-col">
          <span className="text-xs font-bold" style={{ color: entry.stroke || entry.fill }}>
            {entry.name}: {isCurrency ? formatCurrencyMillions(entry.value) : new Intl.NumberFormat("rw-RW").format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const KPIDataCard = ({ title, value, percentageStr, isPositive, description, Icon, testId }) => (
  <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md" data-testid={testId}>
    <div className="mb-4 flex items-start justify-between">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <Icon className="h-5 w-5 text-slate-400" />
    </div>
    <div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900 font-display">{value}</h2>
      <div className="flex items-center gap-1">
        {isPositive ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
        <span className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>{percentageStr} This Quarter</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  </div>
);

function RejectionModal({ claim, rejectionReason, setRejectionReason, onClose, onConfirm, isLoading }) {
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
          className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">Reject Claim</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">{claim.claimId}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Add a concise rejection reason before finalizing the insurer decision.
          </p>

          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Price gouging, Incorrect FHIR mapping, Clinical mismatch..."
            className="mt-5 min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
          />

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || !rejectionReason.trim()}
              className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Rejecting..." : "Submit Rejection"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const InsurerDashboard = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  const dashboardSummaryQuery = useQuery({
    queryKey: ["insurer-dashboard", "summary"],
    queryFn: async () => (await api.get("/insurer/dashboard")).data,
    staleTime: 15000,
  });

  const claimsRegistryQuery = useQuery({
    queryKey: ["insurer-dashboard", "recent-claims", debouncedSearch],
    queryFn: async () => {
      const query = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      const response = await api.get(`/insurer/dashboard${query}`);
      return response.data.recentClaims || [];
    },
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
  });

  const adjudicateClaimMutation = useMutation({
    mutationFn: async ({ claimId, status, rejectionReason: reason }) =>
      (
        await api.put(`/insurer/claims/${claimId}/adjudicate`, {
          status,
          rejectionReason: reason,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-dashboard"] });
      setRejectionTarget(null);
      setRejectionReason("");
    },
  });

  useEffect(() => {
    const socket = io("http://localhost:5000", { withCredentials: true });

    const handleRegistryUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["insurer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-dashboard"] });
    };

    socket.on("claim_status_updated", handleRegistryUpdate);
    socket.on("fraud_alert_detected", (fraudData) => {
      setRealTimeAlerts((prev) => [fraudData, ...prev].slice(0, 8));
      handleRegistryUpdate();
    });

    return () => {
      socket.off("claim_status_updated", handleRegistryUpdate);
      socket.off("fraud_alert_detected");
      socket.disconnect();
    };
  }, [queryClient]);

  const triggerFraudTest = async () => {
    try {
      await api.post("/insurer/trigger-fraud-scan");
    } catch (error) {
      console.error("Failed fraud test", error);
    }
  };

  const data = dashboardSummaryQuery.data || {
    metrics: {
      totalClaims: 0,
      totalClaimsPctChange: "+0%",
      totalClaimsPositive: true,
      approvedClaims: 0,
      approvedClaimsPctChange: "+0%",
      approvedClaimsPositive: true,
      pendingClaims: 0,
      pendingClaimsPctChange: "-0%",
      pendingClaimsPositive: true,
      totalPayoutRWF: 0,
      totalPayoutPctChange: "+0%",
      totalPayoutPositive: true,
    },
    trendData: [],
    categoryDistribution: [],
  };

  const { metrics, trendData, categoryDistribution } = data;
  const recentClaims = claimsRegistryQuery.data || [];

  const searchableClaims = useMemo(() => recentClaims || [], [recentClaims]);

  if (dashboardSummaryQuery.isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Activity className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-800">Overview Metrics</h2>
          <p className="mt-1 text-sm text-slate-500">AI-assisted insurer adjudication and fraud surveillance.</p>
        </div>
        <button
          onClick={triggerFraudTest}
          className="flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-100"
        >
          <ShieldAlert className="mr-2 h-4 w-4" />
          Simulate Network Alert
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KPIDataCard title="Total Claims" value={new Intl.NumberFormat("rw-RW").format(metrics.totalClaims)} percentageStr={metrics.totalClaimsPctChange} isPositive={metrics.totalClaimsPositive} description="Total claim submissions received." Icon={FileText} testId="kpi-total-claims" />
        <KPIDataCard title="Approved Claims" value={new Intl.NumberFormat("rw-RW").format(metrics.approvedClaims)} percentageStr={metrics.approvedClaimsPctChange} isPositive={metrics.approvedClaimsPositive} description="Insurer-approved claims." Icon={CheckCircle} testId="kpi-approved-claims" />
        <KPIDataCard title="Pending Claims" value={new Intl.NumberFormat("rw-RW").format(metrics.pendingClaims)} percentageStr={metrics.pendingClaimsPctChange} isPositive={metrics.pendingClaimsPositive} description="Pending plus AI-flagged claims." Icon={AlertTriangle} testId="kpi-pending-claims" />
        <KPIDataCard title="Total Payout" value={formatCurrencyMillions(metrics.totalPayoutRWF)} percentageStr={metrics.totalPayoutPctChange} isPositive={metrics.totalPayoutPositive} description="Total amount disbursed in RWF." Icon={ShieldCheck} testId="kpi-total-payout" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-1 text-lg font-bold text-slate-900">Claim Volume Trend</h3>
          <p className="mb-6 text-sm text-slate-500">Monthly count of claims over a rolling 12-month period.</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} dy={10} />
                <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip isCurrency={false} />} />
                <Line type="monotone" name="Claims" dataKey="volume" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-1 text-lg font-bold text-slate-900">Cost Trend Analysis (M RWF)</h3>
          <p className="mb-6 text-sm text-slate-500">Approved payout trajectory in millions of RWF.</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} dy={10} />
                <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} width={45} tickFormatter={(val) => `${val / 1000000}M`} />
                <RechartsTooltip content={<CustomTooltip isCurrency={true} />} />
                <Line type="monotone" name="Cost" dataKey="currentAmount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-1 text-lg font-bold text-slate-900">Detailed Financial Payout Trend (Month-over-Month)</h3>
        <p className="mb-6 text-sm text-slate-500">Approved claim disbursements segmented by payment channel.</p>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} dy={10} />
              <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} width={45} tickFormatter={(val) => `${val / 1000000}M`} />
              <RechartsTooltip content={<CustomTooltip isCurrency={true} />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "13px", paddingTop: "10px" }} />
              <Area type="monotone" name="MTN MoMo" dataKey="momo" stackId="1" stroke="#facc15" fill="#facc15" fillOpacity={0.18} />
              <Area type="monotone" name="Bank Transfer" dataKey="bankTransfer" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.18} />
              <Area type="monotone" name="Internal Check" dataKey="internalCheck" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.18} />
              <Area type="monotone" name="Airtel Money" dataKey="airtelMoney" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.14} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-1 text-lg font-bold text-slate-900">Claims Breakdown by Medicine Category</h3>
          <p className="mb-6 text-sm text-slate-500">Distribution mapping aligned with ATC and MoH code structures.</p>
          <div className="flex h-[280px] flex-col items-center md:flex-row">
            <div className="h-[220px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex w-full flex-col justify-center gap-3 pl-4 md:mt-0 md:w-1/2">
              {categoryDistribution.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="font-semibold text-slate-700">{entry.name}</span>
                  </div>
                  <span className="font-medium text-slate-500">{new Intl.NumberFormat().format(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-1 text-lg font-bold text-slate-900">Real-Time Network Alerts</h3>
          <p className="mb-6 text-sm text-slate-500">Suspicious claim patterns detected via the AI fraud pipeline.</p>
          <div className="max-h-[280px] flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
            {realTimeAlerts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-slate-400 opacity-70">
                <ShieldCheck className="mb-2 h-10 w-10" />
                <p className="text-sm font-medium">Network is secure. No anomalies detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {realTimeAlerts.map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-4 rounded-lg border border-red-100 border-l-4 border-l-red-500 bg-white p-4 shadow-sm transition-all">
                    <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="mb-1 inline-block rounded bg-red-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-700">
                          {alert.type || "Anomaly Limit Reached"}
                        </p>
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          Score: {alert.anomalyScore}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{alert.message || "Suspicious payload intercepted."}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <p className="text-xs font-mono text-slate-500">Code: <span className="text-slate-700">{alert.reasonCode || "N/A"}</span></p>
                        <span className="text-xs text-slate-300">•</span>
                        <p className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recent Claims Registry</h3>
            <p className="text-sm text-slate-500">Insurers own the final approve/reject decision for pending and AI-flagged claims.</p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search registry..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-64"
            />
            {claimsRegistryQuery.isFetching ? <Activity className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" /> : null}
          </div>
        </div>

        <div className="max-h-[500px] overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Claim ID / Date</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Patient</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Originating Pharmacy</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Core Medicine</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Amount (RWF)</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="whitespace-nowrap border-b border-slate-200 px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {searchableClaims.map((claim, idx) => {
                const primaryMeds = claim.medicineSnapshot?.[0];
                const isReviewable = REVIEWABLE_STATUSES.includes(claim.status);
                const pharmacyName =
                  claim.pharmacyId?.pharmacyProfileId?.name ||
                  claim.pharmacyId?.fullName ||
                  "Unknown Pharmacy";

                return (
                  <tr key={claim._id || idx} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{claim.claimId}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{new Date(claim.submittedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{claim.patientName}</div>
                      <div className="mt-0.5 text-xs capitalize text-slate-500">{claim.paymentChannel || "Bank Transfer"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{pharmacyName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{claim.pharmacyId?.facilityId || "Facility ID unavailable"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{primaryMeds?.name || "Unspecified"}</div>
                      {primaryMeds?.system ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{primaryMeds.system}</span>
                          <span className="text-xs font-mono text-slate-500">{primaryMeds.standardizedCode}</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(claim.totalAmountRWF)}</div>
                      <div className="mt-0.5 text-xs text-slate-500 opacity-70">Paid: {formatCurrency(claim.coveredAmountRWF)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {claim.status === "Flagged_By_AI" ? (
                          <div title={claim.aiFraudCheck?.reasonCode || "AI anomaly flagged"} className="inline-flex">
                            <ShieldAlert className="h-4 w-4 animate-pulse text-red-600" />
                          </div>
                        ) : null}
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                            claim.status === "Approved"
                              ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                              : claim.status === "Rejected"
                                ? "border border-red-200 bg-red-100 text-red-700"
                                : claim.status === "Flagged_By_AI"
                                  ? "border border-red-200 bg-red-50 text-red-700"
                                  : claim.status === "Cancelled"
                                    ? "border border-slate-200 bg-slate-100 text-slate-600"
                                    : "border border-amber-200 bg-amber-100 text-amber-700"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isReviewable ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => adjudicateClaimMutation.mutate({ claimId: claim._id, status: "Approved", rejectionReason: "" })}
                            disabled={adjudicateClaimMutation.isPending}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectionTarget(claim);
                              setRejectionReason("");
                            }}
                            disabled={adjudicateClaimMutation.isPending}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {claimsRegistryQuery.isFetching ? (
            <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-6 py-5 text-sm text-slate-500">
              <Activity className="h-4 w-4 animate-spin text-blue-500" />
              <span>Refreshing registry results…</span>
            </div>
          ) : null}

          {searchableClaims.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No claims found matching '{searchTerm}'.</p>
            </div>
          ) : null}
        </div>
      </motion.div>

      <AnimatePresence>
        {rejectionTarget ? (
          <RejectionModal
            claim={rejectionTarget}
            rejectionReason={rejectionReason}
            setRejectionReason={setRejectionReason}
            onClose={() => {
              setRejectionTarget(null);
              setRejectionReason("");
            }}
            onConfirm={() =>
              adjudicateClaimMutation.mutate({
                claimId: rejectionTarget._id,
                status: "Rejected",
                rejectionReason,
              })
            }
            isLoading={adjudicateClaimMutation.isPending}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default InsurerDashboard;
