import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  DatabaseZap,
  DollarSign,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function KpiCard({ label, value, icon: Icon, tone = "blue" }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function AddStockModal({ isOpen, onClose, onSubmit, isSaving }) {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [form, setForm] = useState({
    medicineName: "",
    nationalMedicineId: "",
    batchNumber: "",
    quantity: "",
    unitPrice: "",
    expiryDate: "",
    location: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setCatalogSearch("");
      setSelectedCatalogItem(null);
      setForm({
        medicineName: "",
        nationalMedicineId: "",
        batchNumber: "",
        quantity: "",
        unitPrice: "",
        expiryDate: "",
        location: "",
      });
    }
  }, [isOpen]);

  const catalogQuery = useQuery({
    queryKey: ["pharmacy-inventory-catalog", catalogSearch],
    queryFn: async () => {
      const response = await api.get("/pharmacy/inventory/catalog", {
        params: { search: catalogSearch },
      });
      return response.data.items || [];
    },
    enabled: isOpen && catalogSearch.trim().length >= 1,
    staleTime: 60 * 1000,
  });

  const submitForm = async (event) => {
    event.preventDefault();

    if (!selectedCatalogItem) {
      return;
    }

    await onSubmit({
      nationalMedicineId: form.nationalMedicineId,
      medicineVariantId: selectedCatalogItem.medicineVariantId,
      medicineName: form.medicineName,
      sku: selectedCatalogItem.sku,
      category: selectedCatalogItem.category,
      batchNumber: form.batchNumber,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      expiryDate: form.expiryDate,
      location: form.location,
    });
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  National Catalog Entry
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">
                  Add New Stock
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use the national medicine catalog to standardize inventory naming and SKU linkage.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">Medicine Name</label>
                <input
                  value={catalogSearch}
                  onChange={(event) => {
                    setCatalogSearch(event.target.value);
                    setSelectedCatalogItem(null);
                  }}
                  placeholder="Search national drug catalog..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50">
                  {catalogQuery.isLoading ? (
                    <div className="px-4 py-3 text-sm text-slate-500">Searching catalog...</div>
                  ) : catalogQuery.data?.length ? (
                    catalogQuery.data.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedCatalogItem(item);
                          setCatalogSearch(item.displayName);
                          setForm((current) => ({
                            ...current,
                            medicineName: item.displayName,
                            nationalMedicineId: item.nationalMedicineId,
                            unitPrice: current.unitPrice || item.basePrice || "",
                          }));
                        }}
                        className={`flex w-full items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 text-left last:border-b-0 hover:bg-white ${
                          selectedCatalogItem?.id === item.id ? "bg-white" : ""
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.displayName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.category} | National ID {item.nationalMedicineId}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-blue-600">{item.sku}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Start typing to find a standardized medicine entry.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.nationalMedicineId}
                  readOnly
                  placeholder="National Medicine ID"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
                <input
                  value={form.medicineName}
                  readOnly
                  placeholder="Selected Medicine"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
                <input
                  value={form.batchNumber}
                  onChange={(event) => setForm((current) => ({ ...current, batchNumber: event.target.value }))}
                  placeholder="Batch Number"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Shelf / Aisle"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                  placeholder="Quantity"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  type="number"
                  min="0"
                  value={form.unitPrice}
                  onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
                  placeholder="Unit Price"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 md:col-span-2"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedCatalogItem || isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1E56D0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1849b7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PackagePlus className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Stock Entry"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [stockLevel, setStockLevel] = useState("All");
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [toast, setToast] = useState("");

  const kpiQuery = useQuery({
    queryKey: ["pharmacy-inventory-kpis"],
    queryFn: async () => {
      const response = await api.get("/pharmacy/inventory/kpis");
      return response.data;
    },
    staleTime: 30 * 1000,
  });

  const listQuery = useQuery({
    queryKey: ["pharmacy-inventory-list", search, category, stockLevel, page],
    queryFn: async () => {
      const response = await api.get("/pharmacy/inventory", {
        params: {
          search,
          category,
          stockLevel,
          page,
          limit: 10,
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const addStockMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/pharmacy/inventory", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory-list"] });
      setIsAddModalOpen(false);
      setToast("Inventory lot saved successfully.");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/pharmacy/inventory/sync");
      return response.data;
    },
    onSuccess: (data) => {
      setLastSynced(data.syncedAt);
      setToast(`Gateway sync verified at ${formatDateTime(data.syncedAt)}.`);
    },
  });

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [search, category, stockLevel]);

  const categories = useMemo(() => {
    const allCategories = (listQuery.data?.items || [])
      .map((item) => item.category)
      .filter(Boolean);
    return ["All", ...new Set(allCategories)];
  }, [listQuery.data?.items]);

  return (
    <PharmacyLayout
      title="Inventory Workspace"
      subtitle="Manage your pharmacy stock with tenant-scoped KPIs, FIFO-ready lot visibility, and national catalog synchronization."
    >
      <div className="mx-auto max-w-[1500px] space-y-6">
        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                {toast}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section className="grid gap-4 lg:grid-cols-3">
          <KpiCard
            label="Total SKUs"
            value={(kpiQuery.data?.totalSKUs || 0).toLocaleString()}
            icon={Boxes}
            tone="blue"
          />
          <KpiCard
            label="Total Stock Value"
            value={formatCurrency(kpiQuery.data?.totalStockValue || 0)}
            icon={DollarSign}
            tone="emerald"
          />
          <KpiCard
            label="Low Stock Alerts"
            value={(kpiQuery.data?.lowStockAlerts || 0).toLocaleString()}
            icon={AlertTriangle}
            tone="amber"
          />
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                Live Filters
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                Full Inventory Registry
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Search and filter only your pharmacy&apos;s stock across batches, status, and national catalog links.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <DatabaseZap className={`h-4 w-4 ${syncMutation.isPending ? "animate-pulse" : ""}`} />
                Trigger Manual Sync
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#1E56D0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1849b7]"
              >
                <PackagePlus className="h-4 w-4" />
                Add New Stock
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px_220px]">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search medicine name, batch, SKU, or national ID..."
                className="w-full rounded-2xl border border-slate-200 px-11 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All Categories" : option}
                </option>
              ))}
            </select>

            <select
              value={stockLevel}
              onChange={(event) => setStockLevel(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="All">All Stock Levels</option>
              <option value="Active">Active</option>
              <option value="Low_Stock">Low Stock</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Pharmacy-scoped inventory only
            <span className="text-slate-300">|</span>
            <CalendarClock className="h-4 w-4 text-amber-600" />
            FIFO visibility by earliest expiry
            <span className="text-slate-300">|</span>
            Last synced: {lastSynced ? formatDateTime(lastSynced) : "Not synced this session"}
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Medicine</th>
                  <th className="px-5 py-4 font-semibold">National ID</th>
                  <th className="px-5 py-4 font-semibold">Batch</th>
                  <th className="px-5 py-4 font-semibold">Qty</th>
                  <th className="px-5 py-4 font-semibold">Unit Price</th>
                  <th className="px-5 py-4 font-semibold">Expiry</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-sm text-slate-500">
                      Loading pharmacy inventory...
                    </td>
                  </tr>
                ) : listQuery.data?.items?.length ? (
                  listQuery.data.items.map((item) => {
                    const badgeClass =
                      item.status === "Expired"
                        ? "bg-rose-100 text-rose-700"
                        : item.status === "Low_Stock"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700";

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.medicineName || "Unknown Medicine"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{item.sku || "No SKU"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {item.nationalMedicineId || "Unknown National ID"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.batchNumber}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{item.quantity}</td>
                        <td className="px-5 py-4 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(item.expiryDate)}</td>
                        <td className="px-5 py-4 text-slate-600">{item.location}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-5 py-10 text-center text-sm text-slate-500">
                      No inventory items matched your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <p>
              Showing page {listQuery.data?.page || 1} of {listQuery.data?.totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={(listQuery.data?.page || 1) <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={(listQuery.data?.page || 1) >= (listQuery.data?.totalPages || 1)}
                onClick={() =>
                  setPage((current) =>
                    Math.min(listQuery.data?.totalPages || 1, current + 1)
                  )
                }
                className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (payload) => addStockMutation.mutateAsync(payload)}
        isSaving={addStockMutation.isPending}
      />
    </PharmacyLayout>
  );
}
