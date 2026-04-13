import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Lock,
  MapPin,
  Navigation,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PatientLayout from "../../components/layout/PatientLayout";
import api from "../../services/api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} RWF`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDistance(distanceKm) {
  if (distanceKm === undefined || distanceKm === null) {
    return null;
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-4 h-5 w-4/5 rounded-full bg-slate-100" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-24 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="mt-6 h-48 rounded-[24px] bg-slate-100" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-44 rounded-full bg-slate-200" />
          <div className="mt-6 h-40 rounded-[24px] bg-slate-100" />
        </div>
        <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-52 rounded-full bg-slate-200" />
          <div className="mt-6 space-y-4">
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-20 rounded-2xl bg-slate-100" />
            <div className="h-20 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityHighlights({ claims, prescriptions }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Insurance
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">Verified</p>
        <p className="mt-1 text-sm text-slate-600">Coverage synced to your patient profile.</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Prescriptions
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{prescriptions}</p>
        <p className="mt-1 text-sm text-slate-600">Pending retrieval code wallet entries.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Claims
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{claims}</p>
        <p className="mt-1 text-sm text-slate-600">Recent transactions visible only to you.</p>
      </div>
    </div>
  );
}

function HeroBanner({ profile, prescriptions, claims }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-white to-blue-50 p-7 shadow-[0_20px_60px_rgba(30,86,208,0.12)] sm:p-8"
    >
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Clinical Light Dashboard
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Muraho, {profile.firstName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Your secure health overview brings prescriptions, medical visits, and insurance
            identity into one protected patient space.
          </p>
          <SecurityHighlights claims={claims.length} prescriptions={prescriptions.length} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:w-[340px] xl:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Insurance Status
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="relative inline-flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                Active
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Last Sync
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">End-to-end encrypted</p>
            <p className="mt-1 text-sm text-slate-500">Visible only with your authenticated session.</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function PatientQrCard({ qrTokenQuery }) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <QrCode className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Hospital Scan</span>
      </div>
      <div className="flex justify-center rounded-2xl bg-slate-100 p-3">
        {qrTokenQuery.isLoading ? (
          <div className="flex h-[164px] w-[164px] animate-pulse items-center justify-center rounded-2xl bg-slate-200" />
        ) : qrTokenQuery.data?.token ? (
          <div className="rounded-2xl bg-white p-3">
            <QRCode
              value={qrTokenQuery.data.token}
              size={140}
              bgColor="#FFFFFF"
              fgColor="#0f172a"
            />
          </div>
        ) : (
          <div className="flex h-[164px] w-[164px] items-center justify-center rounded-2xl bg-white px-5 text-center text-xs font-medium text-slate-500">
            Secure hospital QR unavailable
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Rolling encrypted token refreshes every few minutes for secure receptionist scanning.
      </p>
    </div>
  );
}

function InsuranceCard({ profile, qrTokenQuery }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
            Digital Insurance Card
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Patient Identity
          </h2>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <CreditCard className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1E56D0] via-[#2F6ADF] to-[#7CA6FF] p-5 text-white shadow-[0_18px_40px_rgba(30,86,208,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-blue-100">ImitiNet Secure ID</p>
            <p className="mt-4 font-display text-xl font-semibold">{profile.fullName}</p>
            <p className="mt-1 text-sm text-blue-100">{profile.insuranceType}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-80" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>
            Active
          </span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-100">National ID</p>
            <p className="mt-2 text-base font-semibold">{profile.nationalIdMasked || "Protected"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-100">Insurance Type</p>
            <p className="mt-2 text-base font-semibold">{profile.insuranceType}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PatientQrCard qrTokenQuery={qrTokenQuery} />
      </div>
    </motion.aside>
  );
}

function NearbyPrescriptionPharmacies({
  activePrescription,
  nearbyQuery,
  locationError,
  onViewOnMap,
}) {
  if (!activePrescription) {
    return null;
  }

  return (
    <div className="mt-6 rounded-[24px] border border-blue-100 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
            Nearby Stock
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Nearby pharmacies holding {activePrescription.medications[0]?.medicineName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Based on your current GPS location and active pending prescription.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewOnMap}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E56D0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a4ab1]"
        >
          <Navigation className="h-4 w-4" />
          View on Map
        </button>
      </div>

      {locationError ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Please enable location services to find nearby pharmacies, or search by district.
        </div>
      ) : null}

      {nearbyQuery.isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl bg-slate-100 p-4">
              <div className="h-4 w-2/5 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-3/5 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : null}

      {!nearbyQuery.isLoading && nearbyQuery.data?.pharmacies?.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {nearbyQuery.data.pharmacies.slice(0, 3).map((pharmacy) => (
            <div
              key={pharmacy.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{pharmacy.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{pharmacy.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {pharmacy.inventory?.stockStatus || "In Stock"}
                </span>
                <span className="text-sm text-slate-500">{formatDistance(pharmacy.distanceKm)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrescriptionWallet({ prescriptions, nearbyQuery, locationError, onViewOnMap }) {
  const [copiedCode, setCopiedCode] = useState("");
  const activePrescription = prescriptions[0];

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1800);
    } catch (_error) {
      setCopiedCode("");
    }
  };

  if (!activePrescription) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Active Prescription Wallet
            </h2>
            <p className="mt-1 text-sm text-slate-500">Nothing is waiting for collection right now.</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
          <p className="text-lg font-semibold text-slate-900">
            You have no pending prescriptions. Stay healthy!
          </p>
          <p className="mt-2 text-sm text-slate-500">
            When a clinician issues a new prescription, your retrieval code will appear here.
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            Active Prescription Wallet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Present this retrieval code at a participating pharmacy.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Ready
        </span>
      </div>

      <div className="mt-6 rounded-[24px] bg-gradient-to-br from-blue-50 via-emerald-50 to-white p-5 ring-1 ring-blue-100">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
              Retrieval Code
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="font-display text-3xl font-bold tracking-[0.18em] text-slate-900">
                {activePrescription.retrievalCode}
              </p>
              <button
                type="button"
                onClick={() => copyCode(activePrescription.retrievalCode)}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Copy className="h-4 w-4" />
                {copiedCode === activePrescription.retrievalCode ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {activePrescription.medications.map((medication) => medication.medicineName).join(", ")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Issued by {activePrescription.prescribingDoctor} via {activePrescription.originatingEmr}
            </p>
          </div>

          <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{activePrescription.status}</p>
            <p className="mt-1 text-sm text-slate-500">{formatDate(activePrescription.issuedAt)}</p>
          </div>
        </div>

        <NearbyPrescriptionPharmacies
          activePrescription={activePrescription}
          nearbyQuery={nearbyQuery}
          locationError={locationError}
          onViewOnMap={onViewOnMap}
        />
      </div>
    </motion.section>
  );
}

function VisitTimeline({ claims }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            Recent Medical Visits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Claim-backed history from your most recent care activity.
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-base font-semibold text-slate-900">No recent claims yet.</p>
          <p className="mt-2 text-sm text-slate-500">
            Your visit and payment timeline will appear here after your next submitted transaction.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {claims.map((claim, index) => (
            <div key={claim.id} className="relative pl-9">
              {index !== claims.length - 1 ? (
                <span className="absolute left-[11px] top-8 h-[calc(100%+20px)] w-px bg-slate-200" />
              ) : null}
              <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </span>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{claim.providerName}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(claim.date)}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {claim.status}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700">
                  Total: {formatCurrency(claim.totalAmountRWF)} | RSSB Paid:{" "}
                  {formatCurrency(claim.coveredAmountRWF)} | You Paid:{" "}
                  {formatCurrency(claim.patientPaysRWF)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

function SecurityFooter() {
  return (
    <footer className="mt-6 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
          <Lock className="h-4 w-4" />
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Your health data is encrypted end-to-end and protected under Rwanda Data Protection Laws.
        </p>
      </div>
    </footer>
  );
}

function PatientDashboard() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError("");
      },
      () => {
        setLocationError("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const dashboardQuery = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: async () => {
      const response = await api.get("/patient/dashboard");
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const qrTokenQuery = useQuery({
    queryKey: ["patient-qr-token"],
    queryFn: async () => {
      const response = await api.get("/patient/generate-qr-token");
      return response.data;
    },
    staleTime: 4 * 60 * 1000,
    refetchInterval: 270000,
    refetchOnWindowFocus: true,
  });

  const activePrescription = dashboardQuery.data?.activePrescriptions?.[0] || null;

  const nearbyQuery = useQuery({
    queryKey: ["patient-dashboard-nearby", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const response = await api.get("/inventory/nearby/active-prescription", {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
      });
      return response.data;
    },
    enabled: Boolean(userLocation?.lat && userLocation?.lng && activePrescription),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleViewOnMap = () => {
    navigate("/find-medicine", {
      state: {
        focusVariantId: activePrescription?.medications?.[0]?.medicineVariantId || null,
        nearbyPharmacies: nearbyQuery.data?.pharmacies || [],
        prescription: activePrescription || null,
      },
    });
  };

  return (
    <PatientLayout>
      {dashboardQuery.isLoading ? <DashboardSkeleton /> : null}

      {!dashboardQuery.isLoading && dashboardQuery.isError ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 shadow-sm">
          {dashboardQuery.error?.response?.data?.message ||
            "Unable to load your secure dashboard right now."}
        </div>
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
            <HeroBanner
              profile={dashboardQuery.data.profile}
              prescriptions={dashboardQuery.data.activePrescriptions}
              claims={dashboardQuery.data.recentClaims}
            />
            <InsuranceCard profile={dashboardQuery.data.profile} qrTokenQuery={qrTokenQuery} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <PrescriptionWallet
              prescriptions={dashboardQuery.data.activePrescriptions}
              nearbyQuery={nearbyQuery}
              locationError={locationError}
              onViewOnMap={handleViewOnMap}
            />
            <VisitTimeline claims={dashboardQuery.data.recentClaims} />
          </div>

          <SecurityFooter />
        </div>
      ) : null}
    </PatientLayout>
  );
}

export default PatientDashboard;
