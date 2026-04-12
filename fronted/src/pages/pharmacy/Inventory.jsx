import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, RefreshCw, AlertTriangle, 
  Clock, Link as LinkIcon, DollarSign, Package, 
  Edit3, Eye, Plus, ArrowLeft, ArrowRight, CheckCircle2
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../store/AuthContext";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import MedicineDetailCard from "../../components/inventory/MedicineDetailCard";

export default function Inventory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dashboard state
  const [kpis, setKpis] = useState({ totalSKUs: 0, totalStockValue: 0, lowStockCount: 0, expiringSoonCount: 0 });
  const [syncStatus, setSyncStatus] = useState({ status: "Unknown", lastSyncedAt: null, recentSyncs: [] });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiringAlerts, setExpiringAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Table state
  const [listData, setListData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, totalPages: 1, totalCount: 0 });
  
  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const [syncLoading, setSyncLoading] = useState(false);
  const commandCenterFetched = useRef(false);

  // Modal state
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [modalMode, setModalMode] = useState("view");

  const fetchCommandCenterData = async () => {
    try {
      const { data } = await api.get("/pharmacy/inventory/command-center");
      setKpis(data.kpis);
      setSyncStatus(data.syncStatus);
      setLowStockAlerts(data.lowStockAlerts);
      setExpiringAlerts(data.expiringAlerts);
      setRecentActivity(data.recentActivity);
    } catch (error) {
      console.error("Failed to load command center data:", error);
    }
  };

  const fetchFullList = async (pageToLoad = pagination.page) => {
    try {
      const { data } = await api.get("/pharmacy/inventory/full-list", {
        params: {
          search,
          category,
          status,
          page: pageToLoad,
          limit: pagination.limit
        }
      });
      setListData(data.items);
      setPagination({
        ...pagination,
        page: data.page,
        totalPages: data.totalPages,
        totalCount: data.totalCount
      });
    } catch (error) {
      console.error("Failed to load inventory list:", error);
    }
  };

  useEffect(() => {
    if (!commandCenterFetched.current) {
      fetchCommandCenterData();
      commandCenterFetched.current = true;
    }
    fetchFullList();
    setLoading(false);
  }, []);

  const handleApplyFilters = () => {
    fetchFullList(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategory("All");
    setStatus("All");
    // Call fetchFullList directly after state updates, or let an effect catch it.
    // For simplicity, we just pass the reset values directly to axios in a custom function, or rely on state.
    // We'll set state, then fetch with the default values.
    api.get("/pharmacy/inventory/full-list", {
      params: { search: "", category: "All", status: "All", page: 1, limit: pagination.limit }
    }).then(({ data }) => {
      setListData(data.items);
      setPagination({ ...pagination, page: data.page, totalPages: data.totalPages, totalCount: data.totalCount });
    });
  };

  const handleTriggerSync = async () => {
    setSyncLoading(true);
    try {
      const { data } = await api.post("/pharmacy/inventory/trigger-sync");
      setSyncStatus((prev) => ({
        ...prev,
        lastSyncedAt: data.lastSyncedAt
      }));
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveEntry = async (id, formData) => {
    // Put request to our new endpoint
    await api.put(`/pharmacy/inventory/${id}`, formData);
    
    // Real-time synchronization
    // Don't reload window, just re-fetch the data endpoints instantly
    await Promise.all([
      fetchFullList(),
      fetchCommandCenterData()
    ]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      maximumFractionDigits: 0,
    }).format(amount).replace("RWF", "RF"); // Adjust to match image format
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium tracking-wide">Loading Inventory System...</p>
        </div>
      </div>
    );
  }

  return (
    <PharmacyLayout 
      title="Inventory Workspace" 
      subtitle="Manage your pharmacy's physical stock, track expiring items, and auto-sync with the national traceability gateway."
    >
      <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
        
        {/* Left Column - Main Content */}
        <div className="flex flex-col gap-8">
          
          {/* Header & KPIs */}
          <section>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrated Inventory Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  Total SKUs
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{kpis.totalSKUs.toLocaleString()}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-green-600 font-medium">+1.5%</span> from last month
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  Total Stock Value
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                   {formatCurrency(kpis.totalStockValue).replace("RF", "RWF")}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-rose-600 font-medium">-0.8%</span> from last month
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  Low Stock Alerts
                  <Package className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{kpis.lowStockCount}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="text-rose-600 font-medium">+3</span> from last month
                </div>
              </motion.div>
            </div>
          </section>

          {/* Filters */}
          <section className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Overview</h2>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search by medicine name or SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="All">Filter by Category</option>
                  <option value="Pain Relief">Pain Relief</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Vitamins">Vitamins</option>
                  <option value="Cough & Cold">Cough & Cold</option>
                  <option value="Digestion">Digestion</option>
                  <option value="Anti-Malarial">Anti-Malarial</option>
                </select>

                <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="All">Filter by Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                </button>
                <button 
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filters
                </button>
              </div>
            </div>
          </section>

          {/* Sync Status */}
          <section className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-gray-900">Real-time Gateway Sync</h3>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Inventory data is actively synchronized with the ImitiNet gateway.</p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last synced: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : "Syncing..."}
              </p>
            </div>
            <button 
              onClick={handleTriggerSync}
              disabled={syncLoading}
              className="px-4 py-2 shrink-0 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
              Trigger Manual Sync
            </button>
          </section>

          {/* Table Area */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Full Inventory List</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20">
                <Plus className="h-4 w-4" />
                Add New Stock
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="text-xs uppercase bg-gray-50/80 text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-4 font-semibold w-[25%]">Medicine Name</th>
                    <th className="px-5 py-4 font-semibold w-[12%]">SKU</th>
                    <th className="px-5 py-4 font-semibold w-[8%]">Qty</th>
                    <th className="px-5 py-4 font-semibold w-[15%]">Unit Price</th>
                    <th className="px-5 py-4 font-semibold w-[15%]">Expiry Date</th>
                    <th className="px-5 py-4 font-semibold w-[15%]">Location</th>
                    <th className="px-5 py-4 font-semibold w-[10%]">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listData.map((item) => {
                    const isExpired = new Date(item.expiryDate) < new Date();
                    const st = isExpired ? "Expired" : item.stockStatus;
                    const stColor = st === "In Stock" ? "bg-green-100 text-green-700 font-semibold" : 
                                     st === "Low Stock" ? "bg-amber-100 text-amber-700 font-semibold" : 
                                     "bg-rose-100 text-rose-700 font-semibold";
                    
                    return (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{item.medicineName}</td>
                        <td className="px-5 py-3.5 text-gray-500">{item.sku}</td>
                        <td className="px-5 py-3.5 text-gray-900">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-gray-900">{formatCurrency(item.priceRWF)}</td>
                        <td className="px-5 py-3.5 text-gray-600">{new Date(item.expiryDate).toISOString().split('T')[0]}</td>
                        <td className="px-5 py-3.5 text-gray-600">{item.location}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wide inline-flex ${stColor}`}>
                            {st}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setSelectedMedicine(item); setModalMode("edit"); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 rounded-md shadow-sm transition-colors" title="Edit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => { setSelectedMedicine(item); setModalMode("view"); }}
                              className="p-1.5 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-md shadow-sm transition-colors" title="View details">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {listData.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-5 py-8 text-center text-gray-500">
                        No active stock found. Apply different filters or add new stock.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
                <button 
                  disabled={pagination.page === 1}
                  onClick={() => fetchFullList(pagination.page - 1)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => fetchFullList(i + 1)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      pagination.page === i + 1 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => fetchFullList(pagination.page + 1)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </section>

        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="flex flex-col gap-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm uppercase tracking-wider font-bold text-gray-500">Critical Alerts</h2>
            </div>
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              <AnimatePresence>
                {lowStockAlerts.map((alert, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                    key={alert._id}
                    className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden border-gray-200"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Low Stock Alert
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900">{alert.medicineName} <span className="text-gray-500 font-normal">({alert.sku})</span></h4>
                      <p className="text-xs text-gray-500">Only {alert.quantity} units remaining. Reorder soon to prevent shortages.</p>
                      <button className="mt-1 w-fit text-xs font-medium px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                        Fix Issue
                      </button>
                    </div>
                  </motion.div>
                ))}
                
                {expiringAlerts.map((alert, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (lowStockAlerts.length + idx) * 0.1 }}
                    key={alert._id}
                    className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden border-rose-100"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                        <Package className="h-4 w-4" />
                        Expiring Soon
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900">{alert.medicineName} <span className="text-gray-500 font-normal">({alert.sku})</span></h4>
                      <p className="text-xs text-gray-500">
                        Expires in {Math.floor((new Date(alert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days. Consider moving to fast-moving stock or return.
                      </p>
                      <button className="mt-1 w-fit text-xs font-medium px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                        Fix Issue
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {lowStockAlerts.length === 0 && expiringAlerts.length === 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <p className="text-sm text-gray-500 font-medium">All clear! No critical alerts.</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm uppercase tracking-wider font-bold text-gray-500">Recent Activity</h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {recentActivity.map((activity, idx) => (
                  <div key={activity._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-gray-200 text-gray-500 group-[.is-active]:bg-blue-100 group-[.is-active]:text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ml-0 absolute left-0 md:relative md:left-auto">
                      <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    </div>
                    {/* Content */}
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pb-4 pl-4 md:pl-0 pl-10 md:group-odd:pr-6 md:group-even:pl-6 text-xs text-gray-500">
                      <div className="font-semibold text-gray-800 mb-0.5">{activity.medicineName} changed</div>
                      <p className="leading-tight">Batch {activity.batchNumber} updated.</p>
                      <span className="text-[10px] text-gray-400 mt-1 block">{new Date(activity.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                
                {recentActivity.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-400">
                    No recent inventory activity.
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
      </div>
      <MedicineDetailCard 
        data={selectedMedicine}
        mode={modalMode}
        onClose={() => setSelectedMedicine(null)}
        onSave={handleSaveEntry}
      />
    </PharmacyLayout>
  );
}
