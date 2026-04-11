import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Filter,
  MapPin,
  Phone,
  Search,
  Star,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import clinicImageOne from "../../assets/clinic1.jfif";
import clinicImageTwo from "../../assets/clinic2.jfif";
import clinicImageThree from "../../assets/clinic3.jfif";
import PatientLayout from "../../components/layout/PatientLayout";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

function formatCurrency(value) {
  return `RWF ${value.toLocaleString()}`;
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

function deriveBestStatus(statuses) {
  if (statuses.includes("In Stock")) {
    return "In Stock";
  }
  if (statuses.includes("Low Stock")) {
    return "Low Stock";
  }
  return "Out of Stock";
}

function formatVariantLabel(variant) {
  return `${variant.dosage} ${variant.form}`;
}

function MedicineCard({ result, index, navigate }) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    result.availableVariants[0]?.variantId || ""
  );

  const selectedVariant =
    result.availableVariants.find((variant) => variant.variantId === selectedVariantId) ||
    result.availableVariants[0];

  const stockStatusClass = selectedVariant
    ? statusStyle[selectedVariant.stockStatus]
    : statusStyle["Out of Stock"];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
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

        {selectedVariant ? (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stockStatusClass}`}
          >
            {selectedVariant.stockStatus}
          </span>
        ) : null}
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

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">Selected Variant Price</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {selectedVariant ? formatCurrency(selectedVariant.priceRWF) : "Unavailable"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {result.availableVariants.length} dosage
          {result.availableVariants.length > 1 ? "s" : ""} at this pharmacy
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-slate-900">{result.pharmacy.name}</p>
          <p className="mt-1 text-sm text-slate-500">{result.pharmacy.address}</p>
          {formatDistance(result.distanceKm) ? (
            <p className="mt-1 text-xs font-medium text-blue-700">
              {formatDistance(result.distanceKm)}
            </p>
          ) : null}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        disabled={!selectedVariant}
        onClick={() =>
          navigate("/patient/check-insurance", {
            state: {
              medicineVariantId: selectedVariant.variantId,
              genericName: result.medicineGroup.name,
              dosage: formatVariantLabel(selectedVariant),
            },
          })
        }
        className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Check Insurance
      </motion.button>
    </motion.article>
  );
}

function FindMedicine() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [results, setResults] = useState([]);
  const [featuredPharmacies, setFeaturedPharmacies] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { data } = await api.get("/inventory/search", {
          params: {
            query: searchTerm,
            category: activeFilter,
            lat: userLocation?.lat,
            lng: userLocation?.lng,
          },
        });

        setResults(data.results || []);
        setFeaturedPharmacies(data.featuredPharmacies || []);
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message || "Unable to load medicine inventory right now."
        );
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(fetchInventory, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, activeFilter, userLocation]);

  const resultCards = useMemo(
    () =>
      results.map((item) => ({
        ...item,
        availableVariants: [...(item.availableVariants || [])].sort((first, second) => {
          if (first.priceRWF !== second.priceRWF) {
            return first.priceRWF - second.priceRWF;
          }

          return formatVariantLabel(first).localeCompare(formatVariantLabel(second));
        }),
        bestStatus: deriveBestStatus(
          (item.availableVariants || []).map((variant) => variant.stockStatus)
        ),
      })),
    [results]
  );

  const mapMarkers = useMemo(() => {
    const markerMap = new Map();

    results
      .filter((item) => item.stockStatus !== "Out of Stock")
      .forEach((item) => {
        markerMap.set(item.pharmacy.id, item.pharmacy);
      });

    return Array.from(markerMap.values());
  }, [results]);

  return (
    <PatientLayout>
      <section>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900">
            Search
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Find medicines, check real-time availability, and compare prices at
            pharmacies across Rwanda.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-8"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search medicines, pharmacies..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === filter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter}
            </button>
          ))}

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Medicine Results
            </h2>
            <p className="text-sm text-slate-500">
              {resultCards.length} pharmacy results found
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Loading medicine availability...
            </div>
          ) : resultCards.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              No medicines matched your current search and filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {resultCards.map((result, index) => (
                <MedicineCard
                  key={`${result.pharmacy.id}-${result.medicineGroup.id}`}
                  result={result}
                  index={index}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden xl:block">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-white">
                Pharmacies Near You
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Live medicine availability mapped across Kigali.
              </p>
            </div>

            <div className="h-[560px]">
              <MapContainer
                center={userLocation ? [userLocation.lat, userLocation.lng] : [-1.9441, 30.0619]}
                zoom={12}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {mapMarkers.map((pharmacy) => (
                  <Marker
                    key={pharmacy.id}
                    position={[
                      pharmacy.location.coordinates[1],
                      pharmacy.location.coordinates[0],
                    ]}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <p className="font-semibold">{pharmacy.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{pharmacy.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-10">
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
                  className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View Details
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </PatientLayout>
  );
}

export default FindMedicine;
