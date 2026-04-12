import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Edit3, Package, DollarSign, Calendar, MapPin } from "lucide-react";

const MedicineDetailCard = ({ mode, data, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    priceRWF: 0,
    expiryDate: "",
    location: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) {
      setFormData({
        quantity: data.quantity || 0,
        priceRWF: data.priceRWF || 0,
        expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString().split("T")[0] : "",
        location: data.location || "",
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "priceRWF" ? Number(value) : value,
    }));
    if (error) setError(null);
  };

  const handleSave = async () => {
    // Strict Input Validation
    if (formData.quantity < 0) {
      setError("Quantity cannot be negative.");
      return;
    }
    if (formData.priceRWF < 0) {
      setError("Price cannot be negative.");
      return;
    }
    if (formData.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(formData.expiryDate) < today) {
        setError("Expiry date cannot be in the past.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSave(data._id, formData);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Blurred Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 3D Card Container */}
        <motion.div
          initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0, rotateY: -90, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative bg-white shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-100/50"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Card Header (Premium Physical Credential Styling) */}
          <div className="relative p-6 pb-8 overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-950 text-white">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Package size={120} />
            </div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-indigo-200 text-xs font-semibold tracking-wider uppercase mb-1">
                  {data.sku}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
                  {data.medicineName}
                </h3>
                <p className="text-indigo-200/80 text-sm mt-1">{data.category || "General Inventory"}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white flex-1">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Row 1: Qty & Price */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    <Package size={14} /> Quantity
                  </label>
                  {mode === "view" ? (
                    <div className="text-lg font-semibold text-gray-900 py-1.5">
                      {data.quantity} <span className="text-gray-400 text-sm font-normal">units</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      name="quantity"
                      min="0"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    <DollarSign size={14} /> Unit Price
                  </label>
                  {mode === "view" ? (
                    <div className="text-lg font-semibold text-gray-900 py-1.5">
                      RWF {data.priceRWF?.toLocaleString()}
                    </div>
                  ) : (
                    <div className="relative border border-gray-300 rounded-lg shadow-sm overflow-hidden flex bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                      <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm font-medium border-r border-gray-300">
                        RWF
                      </span>
                      <input
                        type="number"
                        name="priceRWF"
                        min="0"
                        value={formData.priceRWF}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border-0 bg-transparent focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Expiry & Location */}
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    <Calendar size={14} /> Expiry
                  </label>
                  {mode === "view" ? (
                    <div className="text-sm font-medium text-gray-700 py-1.5 px-3 bg-gray-100 rounded-md inline-flex border border-gray-200">
                      {formData.expiryDate}
                    </div>
                  ) : (
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    <MapPin size={14} /> Location
                  </label>
                  {mode === "view" ? (
                    <div className="text-sm font-medium text-gray-700 py-1.5 px-3 bg-indigo-50 text-indigo-700 rounded-md inline-flex border border-indigo-100">
                      {formData.location}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="p-4 bg-gray-50 border-t border-gray-200/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {mode === "view" ? "Close" : "Cancel"}
            </button>
            {mode === "edit" && (
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-5 py-2 flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MedicineDetailCard;
