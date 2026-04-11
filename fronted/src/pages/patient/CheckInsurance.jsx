import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PatientLayout from "../../components/layout/PatientLayout";
import api from "../../services/api";

const CheckInsurance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State populated from previous screen's navigation
  const [medicineVariantId, setMedicineVariantId] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  
  // Form state
  const [quantity, setQuantity] = useState(1);
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  
  // UI status state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location.state) {
      setMedicineVariantId(location.state.medicineVariantId || location.state.medicineId || "");
      setMedicineName(location.state.genericName || "");
      setDosage(location.state.dosage || "");
    }

    const fetchProviders = async () => {
      try {
        const res = await api.get("/claims/providers", {
          timeout: 8000,
        });
        setProviders(res.data);
        if (res.data.length > 0) setSelectedProviderId(res.data[0]._id);
      } catch (err) {
        setError(
          err.code === "ECONNABORTED"
            ? "Unable to verify coverage at this time. Please try again."
            : err.response?.data?.message || "Failed to load insurance providers."
        );
      }
    };
    fetchProviders();
  }, [location.state]);

  const handleCheckCoverage = async (e) => {
    e.preventDefault();
    if (!medicineVariantId) {
      setError("Please select a medicine from the search page first.");
      return;
    }
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post(
        "/claims/check-coverage",
        {
          medicineVariantId,
          quantity,
          insuranceProviderId: selectedProviderId,
        },
        { timeout: 8000 }
      );
      
      setResult(res.data);
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "Unable to verify coverage at this time. Please try again."
          : err.response?.data?.message || "Failed to verify coverage."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PatientLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Instant Insurance Check</h1>
      
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">Check Your Medicine Coverage</h2>
          <p className="text-gray-500 mt-1">Enter medicine details and your insurance provider to see instant coverage status.</p>
        </div>
        
        <form onSubmit={handleCheckCoverage} className="p-6 space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="medicine-name" className="block text-sm font-medium text-gray-700 mb-2">Medicine Name</label>
              <input 
                id="medicine-name"
                type="text" 
                disabled 
                value={medicineName || "Search for a medicine first..."} 
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label htmlFor="medicine-dosage" className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
              <input 
                id="medicine-dosage"
                type="text" 
                disabled 
                value={dosage || "Select a medicine from search to load dosage"} 
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="medicine-quantity" className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input 
                id="medicine-quantity"
                type="number" 
                min="1" 
                value={quantity} 
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="insurance-provider" className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
              <select 
                id="insurance-provider"
                value={selectedProviderId} 
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {providers.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button type="submit" disabled={loading || !medicineVariantId} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
              {loading ? "Simulating..." : "Check Coverage"}
            </button>
            <button type="button" onClick={() => navigate('/dashboard/patient')} className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-lg transition-colors">
              Back to Medicine Search
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Verifying your insurance coverage now...
        </div>
      ) : null}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-800">Status: {result.status}</h3>
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">{result.message}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-green-200">
              <div><p className="text-sm text-green-600 mb-1">Total Price</p><p className="text-xl font-bold text-gray-700">{result.breakdown.totalPriceRWF} RWF</p></div>
              <div><p className="text-sm text-green-600 mb-1">Insurance Covers</p><p className="text-xl font-bold text-gray-700">{result.breakdown.coveredRWF} RWF</p></div>
              <div><p className="text-sm font-bold text-green-800 mb-1">You Pay</p><p className="text-2xl font-black text-green-700">{result.breakdown.patientPaysRWF} RWF</p></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </PatientLayout>
  );
};
export default CheckInsurance;
