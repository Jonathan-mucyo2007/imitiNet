import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, MapPin, Phone, Route, Star, X } from "lucide-react";

function PharmacyDetailsModal({ pharmacy, isOpen, onClose, onGetDirections }) {
  return (
    <AnimatePresence>
      {isOpen && pharmacy ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-xl rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)] sm:inset-x-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Pharmacy Details
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                  {pharmacy.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Address</p>
                    <p className="mt-1 text-sm text-slate-600">{pharmacy.address}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Contact</p>
                      <p className="mt-1 text-sm text-slate-600">{pharmacy.contact}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Operating Hours</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {pharmacy.operatingHours || "Open daily, 07:00 - 22:00"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Patient Convenience</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Rating {pharmacy.rating?.toFixed?.(1) || "4.5"}
                      {pharmacy.distanceKm ? ` | ${pharmacy.distanceKm.toFixed(1)} km away` : ""}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-600 shadow-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {pharmacy.rating?.toFixed?.(1) || "4.5"}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onGetDirections(pharmacy)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E56D0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a4ab1]"
            >
              <Route className="h-4 w-4" />
              Get Directions
            </button>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default PharmacyDetailsModal;
