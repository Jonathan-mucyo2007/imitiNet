import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
} from "lucide-react";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
          checked ? "bg-[#1E56D0]" : "bg-slate-300"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="ml-1 inline-block h-6 w-6 rounded-full bg-white shadow"
          style={{ x: checked ? 24 : 0 }}
        />
      </button>
    </div>
  );
}

function FormField({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon ? <Icon className="h-4 w-4 text-blue-600" /> : null}
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function LocationPreview({ latitude, longitude }) {
  const safeLat = Number(latitude);
  const safeLng = Number(longitude);
  const hasValidCoordinates = !Number.isNaN(safeLat) && !Number.isNaN(safeLng);

  const pinPosition = useMemo(() => {
    if (!hasValidCoordinates) {
      return { left: "50%", top: "50%" };
    }

    const left = ((safeLng + 180) / 360) * 100;
    const top = ((90 - safeLat) / 180) * 100;

    return {
      left: `${Math.min(92, Math.max(8, left))}%`,
      top: `${Math.min(88, Math.max(12, top))}%`,
    };
  }, [hasValidCoordinates, safeLat, safeLng]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-[#1E56D0] via-[#4A7BE6] to-[#DCE8FF] p-5 text-white shadow-[0_18px_40px_rgba(30,86,208,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
        Location Preview
      </p>
      <div className="relative mt-4 h-48 rounded-[24px] border border-white/20 bg-[radial-gradient(circle_at_top,#ffffff40,transparent_45%),linear-gradient(135deg,#f8fbff22,#0f172a22)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_24%,rgba(255,255,255,0.14)_25%,transparent_26%),linear-gradient(to_bottom,transparent_24%,rgba(255,255,255,0.14)_25%,transparent_26%)] bg-[length:32px_32px]" />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
          className="absolute"
          style={pinPosition}
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full bg-white/25 p-2 backdrop-blur">
              <MapPin className="h-6 w-6 fill-white text-white" />
            </div>
          </div>
        </motion.div>
      </div>
      <p className="mt-4 text-sm text-blue-50">
        {hasValidCoordinates
          ? `Live geospatial anchor: ${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}`
          : "Enter a valid latitude and longitude to place your facility on the live patient map."}
      </p>
    </div>
  );
}

function PharmacySettings() {
  const [form, setForm] = useState({
    facilityName: "",
    tinNumber: "",
    contactPhone: "",
    contactEmail: "",
    address: "",
    location: {
      latitude: "",
      longitude: "",
    },
    notificationPreferences: {
      emailOnClaimRejected: true,
      emailOnAiFlagged: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get("/pharmacy/settings");
        setForm({
          facilityName: data.facilityName || "",
          tinNumber: data.tinNumber || "",
          contactPhone: data.contactPhone || "",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
          location: {
            latitude: data.location?.latitude ?? "",
            longitude: data.location?.longitude ?? "",
          },
          notificationPreferences: {
            emailOnClaimRejected:
              data.notificationPreferences?.emailOnClaimRejected ?? true,
            emailOnAiFlagged: data.notificationPreferences?.emailOnAiFlagged ?? true,
          },
        });
        setError("");
      } catch (loadError) {
        setError(
          loadError?.response?.data?.message || "Unable to load pharmacy settings right now."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateLocationField = (field, value) => {
    setForm((current) => ({
      ...current,
      location: {
        ...current.location,
        [field]: value,
      },
    }));
  };

  const updateNotificationField = (field, value) => {
    setForm((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        location: {
          latitude: Number(form.location.latitude),
          longitude: Number(form.location.longitude),
        },
      };

      const { data } = await api.put("/pharmacy/settings", payload);
      setForm({
        facilityName: data.settings.facilityName || "",
        tinNumber: data.settings.tinNumber || "",
        contactPhone: data.settings.contactPhone || "",
        contactEmail: data.settings.contactEmail || "",
        address: data.settings.address || "",
        location: {
          latitude: data.settings.location?.latitude ?? "",
          longitude: data.settings.location?.longitude ?? "",
        },
        notificationPreferences: {
          emailOnClaimRejected:
            data.settings.notificationPreferences?.emailOnClaimRejected ?? true,
          emailOnAiFlagged:
            data.settings.notificationPreferences?.emailOnAiFlagged ?? true,
        },
      });
      setToast("Settings saved successfully.");
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message || "Unable to save pharmacy settings right now."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PharmacyLayout
      title="Pharmacy Settings"
      subtitle="Control your facility profile, map location, and pharmacy-level notification preferences."
    >
      <div className="space-y-6">
        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                {toast}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <div className="animate-pulse rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="h-6 w-44 rounded-full bg-slate-200" />
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="h-14 rounded-2xl bg-slate-100" />
                <div className="h-14 rounded-2xl bg-slate-100" />
                <div className="h-14 rounded-2xl bg-slate-100" />
                <div className="h-14 rounded-2xl bg-slate-100" />
              </div>
            </div>
            <div className="animate-pulse rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="h-64 rounded-[24px] bg-slate-100" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pb-24">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-slate-900">
                      Business Profile
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      This information powers patient discovery and insurer-facing pharmacy references.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Facility Name"
                    icon={Building2}
                    value={form.facilityName}
                    onChange={(event) => updateField("facilityName", event.target.value)}
                    placeholder="Kigali Central Pharmacy"
                  />
                  <FormField
                    label="TIN Number"
                    value={form.tinNumber}
                    onChange={(event) => updateField("tinNumber", event.target.value)}
                    placeholder="TIN-000123456"
                  />
                  <FormField
                    label="Contact Phone"
                    icon={Phone}
                    value={form.contactPhone}
                    onChange={(event) => updateField("contactPhone", event.target.value)}
                    placeholder="+250 788 100 101"
                  />
                  <FormField
                    label="Contact Email"
                    icon={Mail}
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => updateField("contactEmail", event.target.value)}
                    placeholder="pharmacy@imitinet.rw"
                  />
                  <label className="block md:col-span-2">
                    <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Address
                    </span>
                    <input
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="KN 3 Rd, Nyarugenge, Kigali"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </div>

                <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Location
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField
                      label="Latitude"
                      value={form.location.latitude}
                      onChange={(event) => updateLocationField("latitude", event.target.value)}
                      placeholder="-1.944072"
                    />
                    <FormField
                      label="Longitude"
                      value={form.location.longitude}
                      onChange={(event) => updateLocationField("longitude", event.target.value)}
                      placeholder="30.061885"
                    />
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <LocationPreview
                  latitude={form.location.latitude}
                  longitude={form.location.longitude}
                />

                <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-semibold text-slate-900">
                        Notifications
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Decide which pharmacy-level insurer and AI alerts trigger email delivery.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <ToggleRow
                      label="Email on Claim Rejected"
                      description="Send a targeted rejection alert when an insurer rejects one of your submitted claims."
                      checked={form.notificationPreferences.emailOnClaimRejected}
                      onChange={(value) =>
                        updateNotificationField("emailOnClaimRejected", value)
                      }
                    />
                    <ToggleRow
                      label="Email on AI Flagged"
                      description="Receive pharmacy-level notifications when a new claim is flagged by the AI fraud screen."
                      checked={form.notificationPreferences.emailOnAiFlagged}
                      onChange={(value) => updateNotificationField("emailOnAiFlagged", value)}
                    />
                  </div>

                  <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                      Rejection alerts are used by adjudication workflows to notify the originating pharmacy only when your preference is enabled.
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="sticky bottom-6 z-10 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-[#1E56D0] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(30,86,208,0.28)] transition hover:bg-[#1849b7] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PharmacyLayout>
  );
}

export default PharmacySettings;
