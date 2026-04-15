import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Activity,
  Building2,
  ChevronDown,
  MapPinned,
  Radar,
  Search,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function getRiskTone(score) {
  if (score >= 0.67) return "bg-rose-100 text-rose-700 border-rose-200";
  if (score >= 0.4) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} hrs`;
}

function GaugeCard({ score }) {
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - circumference * Math.min(1, Math.max(0, score || 0));
  const tone = score >= 0.67 ? "#dc2626" : score >= 0.4 ? "#d97706" : "#059669";

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r="52"
            fill="none"
            stroke={tone}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900">{Math.round((score || 0) * 100)}%</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Risk
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Network AI Fraud Risk</p>
        <p className="mt-1 text-sm text-slate-500">
          Weighted by rejection rate, high-price anomaly signals, and regional deviation.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </motion.div>
  );
}

function SkeletonCard() {
  return <div className="h-44 animate-pulse rounded-[28px] border border-slate-200 bg-white shadow-sm" />;
}

export default function PharmacyNetwork() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("aiRiskScore");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const socket = io("http://localhost:5000", { withCredentials: true });

    const refreshNetwork = () => {
      queryClient.invalidateQueries({ queryKey: ["insurer-pharmacy-network"] });
    };

    socket.on("claim_status_updated", refreshNetwork);
    socket.on("fraud_alert_detected", refreshNetwork);

    return () => {
      socket.off("claim_status_updated", refreshNetwork);
      socket.off("fraud_alert_detected", refreshNetwork);
      socket.disconnect();
    };
  }, [queryClient]);

  const statsQuery = useQuery({
    queryKey: ["insurer-pharmacy-network", "stats"],
    queryFn: async () => (await api.get("/insurer/pharmacy-network/stats")).data,
    staleTime: 15000,
  });

  const registryQuery = useQuery({
    queryKey: ["insurer-pharmacy-network", "registry", debouncedSearch, sortBy, sortOrder],
    queryFn: async () =>
      (
        await api.get("/insurer/pharmacy-network/registry", {
          params: {
            search: debouncedSearch,
            sortBy,
            sortOrder,
          },
        })
      ).data,
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });

  const registry = registryQuery.data?.registry || [];
  const districtHeatmap = statsQuery.data?.districtHeatmap || [];
  const stats = statsQuery.data?.stats || {
    totalPharmacies: 0,
    nationalRiskScore: 0,
    averageDispenseTimeHours: 0,
  };

  const sortedColumns = useMemo(
    () => ({
      pharmacyName: "Pharmacy Name",
      totalClaims: "Total Claims",
      deniedApprovedRatio: "Denied/Approved Ratio",
      aiRiskScore: "AI Risk Score",
      averageApprovalHours: "Avg. Dispense Time",
    }),
    []
  );

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder(column === "pharmacyName" ? "asc" : "desc");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
          National Command Center
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
          Pharmacy Network Supervision Center
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
          Real-time visibility into connected pharmacies, AI risk concentration, and adjudication-sensitive network performance across the insurer scope.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        {statsQuery.isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total Connected Pharmacies"
              value={stats.totalPharmacies.toLocaleString()}
              icon={Building2}
            />
            <StatCard
              label="Network AI Fraud Risk"
              value=""
              icon={Radar}
            >
              <GaugeCard score={stats.nationalRiskScore} />
            </StatCard>
            <StatCard
              label="Avg. Dispense Efficiency"
              value={formatHours(stats.averageDispenseTimeHours)}
              icon={TimerReset}
            >
              <p className="text-sm text-slate-500">
                Average adjudication-linked pharmacy turnaround observed across scoped claims.
              </p>
            </StatCard>
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-display text-2xl font-semibold text-slate-900">
                  Geospatial Risk Distribution
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  District-level heat concentration of pharmacy AI risk within the current insurer scope.
                </p>
              </div>
            </div>
          </div>

          <div className="h-[420px]">
            <MapContainer center={[-1.95, 30.06]} zoom={9} scrollWheelZoom={false} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {districtHeatmap.map((district) => {
                const [lng, lat] = district.coordinates || [30.06, -1.95];
                const color =
                  district.averageRiskScore >= 0.67
                    ? "#dc2626"
                    : district.averageRiskScore >= 0.4
                      ? "#d97706"
                      : "#059669";

                return (
                  <CircleMarker
                    key={district.district}
                    center={[lat, lng]}
                    radius={10 + district.pharmacies * 2}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.45,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{district.district}</p>
                        <p className="text-sm text-slate-600">
                          Avg. risk: {Math.round(district.averageRiskScore * 100)}%
                        </p>
                        <p className="text-sm text-slate-600">
                          Pharmacies: {district.pharmacies}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="font-display text-2xl font-semibold text-slate-900">District Heat Ledger</h3>
          <p className="mt-2 text-sm text-slate-500">
            Snapshot of current district-level AI surveillance concentration.
          </p>
          <div className="mt-6 space-y-3">
            {districtHeatmap.length ? (
              districtHeatmap
                .sort((a, b) => b.averageRiskScore - a.averageRiskScore)
                .map((district) => (
                  <div
                    key={district.district}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{district.district}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {district.pharmacies} connected pharmacies
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskTone(district.averageRiskScore)}`}>
                        {Math.round(district.averageRiskScore * 100)}% risk
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                District risk data will appear once scoped pharmacies have claims.
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              Recent Claims Registry
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              National pharmacy network registry with AI risk scoring and insurer-facing supervision signals.
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search pharmacy, district, facility..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            {registryQuery.isFetching ? (
              <Activity className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                {[
                  ["pharmacyName", "Pharmacy Name"],
                  [null, "Location"],
                  ["totalClaims", "Total Claims"],
                  ["deniedApprovedRatio", "Denied/Approved Ratio"],
                  ["aiRiskScore", "AI Risk Score"],
                  [null, "Status"],
                  [null, "Actions"],
                ].map(([column, label]) => (
                  <th key={label} className="px-5 py-4 font-semibold">
                    {column ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="inline-flex items-center gap-1 text-left"
                      >
                        {label}
                        <ChevronDown className={`h-3.5 w-3.5 transition ${sortBy === column && sortOrder === "asc" ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registryQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan="7" className="px-5 py-4">
                      <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : registry.length ? (
                registry.map((pharmacy) => (
                  <tr key={pharmacy.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{pharmacy.pharmacyName}</p>
                        <p className="mt-1 text-xs text-slate-500">{pharmacy.facilityId}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div>
                        <p>{pharmacy.district}</p>
                        <p className="mt-1 text-xs text-slate-500">{pharmacy.pharmacyProfile.address}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{pharmacy.totalClaims}</td>
                    <td className="px-5 py-4 text-slate-600">{pharmacy.deniedApprovedRatio.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskTone(pharmacy.aiRiskScore)}`}>
                        {Math.round(pharmacy.aiRiskScore * 100)}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        pharmacy.status === "Flagged"
                          ? "border-rose-200 bg-rose-100 text-rose-700"
                          : pharmacy.status === "Watchlist"
                            ? "border-amber-200 bg-amber-100 text-amber-700"
                            : "border-emerald-200 bg-emerald-100 text-emerald-700"
                      }`}>
                        {pharmacy.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => navigate("/dashboard/insurer/claims")}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        View Claims
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-sm text-slate-500">
                    No pharmacies matched the current insurer scope or search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
