import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Filter,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import clinicImageOne from "../../assets/clinic1.jfif";
import clinicImageTwo from "../../assets/clinic2.jfif";
import clinicImageThree from "../../assets/clinic3.jfif";
import PharmacyDetailsModal from "../../components/patient/PharmacyDetailsModal";
import PatientLayout from "../../components/layout/PatientLayout";
import api from "../../services/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="position: relative; width: 18px; height: 18px;">
      <span style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(34, 197, 94, 0.28); transform: scale(1.8);"></span>
      <span style="position: absolute; inset: 0; border-radius: 9999px; background: #22c55e; border: 3px solid #ffffff; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35);"></span>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const quickFilters = [
  "All",
  "Pain Relief",
  "Antibiotics",
  "Vitamins",
  "Cough & Cold",
  "Digestion",
];

const statusStyle = {
  "In Stock": "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  "Out of Stock": "bg-rose-50 text-rose-700",
};

const featuredClinicImages = [clinicImageOne, clinicImageTwo, clinicImageThree];
const fallbackCenter = [-1.9441, 30.0619];

function formatCurrency(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
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

function formatVariantLabel(variant) {
  return `${variant.dosage} ${variant.form}`;
}

function MapAutoFit({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }

    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function PrescriptionMiniCard({ prescription, nearbyCount, onViewNearby }) {
  if (!prescription) {
    return null;
  }

  const primaryMedication = prescription.medications?.[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-[30px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-emerald-50 p-6 shadow-[0_20px_60px_rgba(30,86,208,0.12)]"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            Imiti Bakwandikiye
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">
            {primaryMedication?.medicineName}
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {primaryMedication?.dosage} {primaryMedication?.form} | SMS Retrieval Code{" "}
            <span className="font-semibold text-slate-900">{prescription.retrievalCode}</span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Nearby Stock
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{nearbyCount}</p>
            <p className="mt-1 text-sm text-slate-500">Top pharmacies around you</p>
          </div>

          <button
            type="button"
            onClick={onViewNearby}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E56D0] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1a4ab1]"
          >
            <Navigation className="h-4 w-4" />
            View Nearby Pharmacies
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function MedicineCard({ result, index, onSelectDirections, onCheckInsurance }) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    result.availableVariants[0]?.variantId || ""
  );

  const selectedVariant =
    result.availableVariants.find((variant) => variant.variantId === selectedVariantId) ||
    result.availableVariants[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-slate-900">
            {result.medicineGroup.name}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {result.medicineGroup.description}
          </p>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyle[selectedVariant?.stockStatus || "Out of Stock"]
          }`}
        >
          {selectedVariant?.stockStatus || "Out of Stock"}
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
        <label
          htmlFor={`variant-${result.pharmacy.id}-${result.medicineGroup.id}`}
          className="block text-sm font-medium text-slate-500"
        >
          Select Dosage
        </label>
        {result.availableVariants.length > 1 ? (
          <select
            id={`variant-${result.pharmacy.id}-${result.medicineGroup.id}`}
            value={selectedVariantId}
            onChange={(event) => setSelectedVariantId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          >
            {result.availableVariants.map((variant) => (
              <option key={variant.variantId} value={variant.variantId}>
                {formatVariantLabel(variant)}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-sm font-medium text-slate-900">
            {selectedVariant ? formatVariantLabel(selectedVariant) : "No dosage available"}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{result.pharmacy.name}</p>
          <p className="mt-1 text-sm text-slate-500">{result.pharmacy.address}</p>
          {formatDistance(result.distanceKm) ? (
            <p className="mt-1 text-xs font-medium text-blue-700">
              {formatDistance(result.distanceKm)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onSelectDirections(result.pharmacy)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E56D0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a4ab1]"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </button>
        <button
          type="button"
          disabled={!selectedVariant}
          onClick={() =>
            onCheckInsurance({
              medicineVariantId: selectedVariant.variantId,
              genericName: result.medicineGroup.name,
              dosage: formatVariantLabel(selectedVariant),
            })
          }
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check Insurance
        </button>
      </div>
    </motion.article>
  );
}

function FindMedicine() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [modalPharmacy, setModalPharmacy] = useState(null);
  const [highlightedNearby, setHighlightedNearby] = useState(location.state?.nearbyPharmacies || []);

  const dashboardQuery = useQuery({
    queryKey: ["patient-dashboard"],
    queryFn: async () => {
      const response = await api.get("/patient/dashboard");
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const activePrescription = dashboardQuery.data?.activePrescriptions?.[0] || location.state?.prescription;
  const primaryMedication = activePrescription?.medications?.[0] || null;

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Please enable location services to find nearby pharmacies, or search by district.");
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
        setLocationError("Please enable location services to find nearby pharmacies, or search by district.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const inventoryQuery = useQuery({
    queryKey: ["inventory-search", searchTerm, activeFilter, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const { data } = await api.get("/inventory/search", {
        params: {
          query: searchTerm,
          category: activeFilter,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        },
      });
      return data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const nearbyPrescriptionQuery = useQuery({
    queryKey: ["nearby-prescription-map", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const { data } = await api.get("/inventory/nearby/active-prescription", {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
        },
      });
      return data;
    },
    enabled: Boolean(userLocation?.lat && userLocation?.lng && activePrescription),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (nearbyPrescriptionQuery.data?.pharmacies?.length) {
      setHighlightedNearby(nearbyPrescriptionQuery.data.pharmacies);
    }
  }, [nearbyPrescriptionQuery.data]);

  useEffect(() => {
    if (!location.state?.focusVariantId || !inventoryQuery.data?.results?.length) {
      return;
    }

    const focusedResult = inventoryQuery.data.results.find((result) =>
      result.availableVariants.some((variant) => variant.variantId === location.state.focusVariantId)
    );

    if (focusedResult) {
      setSelectedPharmacy(focusedResult.pharmacy);
    }
  }, [inventoryQuery.data, location.state]);

  const routeQuery = useQuery({
    queryKey: [
      "pharmacy-route",
      userLocation?.lat,
      userLocation?.lng,
      selectedPharmacy?.location?.coordinates?.[0],
      selectedPharmacy?.location?.coordinates?.[1],
    ],
    queryFn: async () => {
      const destinationLng = selectedPharmacy.location.coordinates[0];
      const destinationLat = selectedPharmacy.location.coordinates[1];

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`
      );

      if (!response.ok) {
        throw new Error("Route lookup failed");
      }

      const data = await response.json();
      return data.routes?.[0] || null;
    },
    enabled: Boolean(userLocation && selectedPharmacy),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const resultCards = useMemo(() => inventoryQuery.data?.results || [], [inventoryQuery.data]);
  const featuredPharmacies = inventoryQuery.data?.featuredPharmacies || [];

  const mapPharmacies = useMemo(() => {
    const map = new Map();

    resultCards.forEach((item) => {
      map.set(item.pharmacy.id, {
        ...item.pharmacy,
        distanceKm: item.distanceKm,
      });
    });

    highlightedNearby.forEach((pharmacy) => {
      map.set(pharmacy.id, pharmacy);
    });

    featuredPharmacies.forEach((pharmacy) => {
      map.set(pharmacy._id || pharmacy.id, {
        ...pharmacy,
        id: pharmacy._id || pharmacy.id,
      });
    });

    return Array.from(map.values());
  }, [featuredPharmacies, highlightedNearby, resultCards]);

  const routePoints = useMemo(() => {
    if (!routeQuery.data?.geometry?.coordinates) {
      return [];
    }

    return routeQuery.data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }, [routeQuery.data]);

  const mapFocusPoints = useMemo(() => {
    const points = [];

    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (routePoints.length) {
      points.push(...routePoints);
    } else if (selectedPharmacy?.location?.coordinates) {
      points.push([
        selectedPharmacy.location.coordinates[1],
        selectedPharmacy.location.coordinates[0],
      ]);
    } else {
      mapPharmacies.slice(0, 6).forEach((pharmacy) => {
        if (pharmacy.location?.coordinates) {
          points.push([pharmacy.location.coordinates[1], pharmacy.location.coordinates[0]]);
        }
      });
    }

    return points;
  }, [mapPharmacies, routePoints, selectedPharmacy, userLocation]);

  const handleDirections = (pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setModalPharmacy(null);
  };

  const handleCheckInsurance = (payload) => {
    navigate("/patient/check-insurance", { state: payload });
  };

  return (
    <PatientLayout>
      <div className="space-y-8">
        <PrescriptionMiniCard
          prescription={activePrescription}
          nearbyCount={highlightedNearby.length}
          onViewNearby={() => {
            if (highlightedNearby[0]) {
              setSelectedPharmacy(highlightedNearby[0]);
            }
          }}
        />

        <section>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-slate-900">
              Find Medicine
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Search live inventory, locate nearby pharmacies, and follow OpenStreetMap directions
              from your current location.
            </p>
          </motion.div>

          {locationError ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {locationError}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white to-blue-50 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-slate-900">
                    Nearby Pharmacies & Routing
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPharmacy
                      ? `Routing to ${selectedPharmacy.name}`
                      : "Select a pharmacy card or featured location to draw directions."}
                  </p>
                </div>
                {routeQuery.data?.distance ? (
                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    Route {formatDistance(routeQuery.data.distance / 1000)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="h-[520px]">
              <MapContainer
                center={userLocation ? [userLocation.lat, userLocation.lng] : fallbackCenter}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapAutoFit points={mapFocusPoints} />

                {userLocation ? (
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                    <Popup>You are here</Popup>
                  </Marker>
                ) : null}

                {mapPharmacies.map((pharmacy) => (
                  <Marker
                    key={pharmacy.id || pharmacy._id}
                    position={[
                      pharmacy.location.coordinates[1],
                      pharmacy.location.coordinates[0],
                    ]}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-semibold text-slate-900">{pharmacy.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{pharmacy.address}</p>
                        <button
                          type="button"
                          onClick={() => handleDirections(pharmacy)}
                          className="mt-3 rounded-lg bg-[#1E56D0] px-3 py-2 text-xs font-semibold text-white"
                        >
                          Get Directions
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {routePoints.length > 0 ? (
                  <Polyline positions={routePoints} pathOptions={{ color: "#1E56D0", weight: 5 }} />
                ) : null}
              </MapContainer>
            </div>
          </div>

          <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              Prescription Match
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Pharmacies closest to you that hold your currently prescribed medicine.
            </p>

            <div className="mt-5 space-y-3">
              {nearbyPrescriptionQuery.isLoading ? (
                [0, 1, 2].map((item) => (
                  <div key={item} className="animate-pulse rounded-2xl bg-slate-100 p-4">
                    <div className="h-4 w-1/2 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-3/4 rounded-full bg-slate-200" />
                  </div>
                ))
              ) : highlightedNearby.length > 0 ? (
                highlightedNearby.slice(0, 3).map((pharmacy) => (
                  <button
                    key={pharmacy.id}
                    type="button"
                    onClick={() => handleDirections(pharmacy)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pharmacy.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{pharmacy.address}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {pharmacy.inventory?.stockStatus || "In Stock"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-medium text-blue-700">
                      {formatDistance(pharmacy.distanceKm)}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No nearby prescription-matched pharmacies found yet.
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search medicines, pharmacies..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {quickFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFilter === filter
                      ? "bg-[#1E56D0] text-white shadow-sm"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                <Filter className="h-4 w-4" />
                Scrollable Inventory View
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              General Inventory Search
            </h3>
            <p className="text-sm text-slate-500">
              {resultCards.length} pharmacy results found
            </p>
          </div>

          <div className="mt-6 h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {inventoryQuery.isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="animate-pulse rounded-2xl bg-slate-100 p-5">
                    <div className="h-6 w-1/3 rounded-full bg-slate-200" />
                    <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-200" />
                    <div className="mt-6 h-24 rounded-2xl bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : inventoryQuery.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {inventoryQuery.error?.response?.data?.message ||
                  "Unable to load medicine inventory right now."}
              </div>
            ) : resultCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                No medicines matched your current search and filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {resultCards.map((result, index) => (
                  <MedicineCard
                    key={`${result.pharmacy.id}-${result.medicineGroup.id}`}
                    result={result}
                    index={index}
                    onSelectDirections={handleDirections}
                    onCheckInsurance={handleCheckInsurance}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Featured Pharmacies in Kigali
            </h2>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-2">
            {featuredPharmacies.map((pharmacy, index) => (
              <motion.article
                key={pharmacy._id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="min-w-[290px] max-w-[290px] rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <img
                  src={featuredClinicImages[index % featuredClinicImages.length]}
                  alt={pharmacy.name}
                  className="h-40 w-full rounded-t-2xl object-cover"
                />
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {pharmacy.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {pharmacy.address}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {pharmacy.rating.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {pharmacy.contact}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalPharmacy({ ...pharmacy, id: pharmacy._id })}
                    className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View Details
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </div>

      <PharmacyDetailsModal
        pharmacy={modalPharmacy}
        isOpen={Boolean(modalPharmacy)}
        onClose={() => setModalPharmacy(null)}
        onGetDirections={handleDirections}
      />
    </PatientLayout>
  );
}

export default FindMedicine;
