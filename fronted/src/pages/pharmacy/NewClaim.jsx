import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgePlus,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MonitorSmartphone,
  Plus,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserRoundSearch,
} from "lucide-react";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

function formatCurrency(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function PatientSearchSelect({ patients, selectedPatientId, onSelect, isLoading }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return patients.filter((patient) => {
      if (!normalizedQuery) {
        return true;
      }

      return [patient.fullName, patient.email, patient.nationalId]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [patients, query]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || null;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-2 block text-sm font-semibold text-slate-700">Select Patient</label>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        <div>
          <p className="text-sm font-medium text-slate-900">
            {selectedPatient ? selectedPatient.fullName : "Search and select a patient"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedPatient
              ? `${selectedPatient.email} • ${selectedPatient.nationalId}`
              : "Use name, email, or National ID"}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-20 mt-3 w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search patient..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {isLoading ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Loading patients...
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No patients matched your search.
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      onSelect(patient.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">{patient.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {patient.email} • {patient.nationalId}
                    </p>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function EmrCard({ title, accentClass, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500">Interoperability bridge online</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Connected
        </span>
      </div>
    </div>
  );
}

function NewClaim() {
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [prescription, setPrescription] = useState(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function bootstrapData() {
      setPatientsLoading(true);

      try {
        const [patientsResponse, providersResponse] = await Promise.all([
          api.get("/patients"),
          api.get("/claims/providers"),
        ]);

        setPatients(patientsResponse.data.patients || []);
        setProviders(providersResponse.data || []);
        if ((providersResponse.data || []).length > 0) {
          setSelectedProviderId(providersResponse.data[0]._id);
        }
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message || "Unable to load claim submission data."
        );
      } finally {
        setPatientsLoading(false);
      }
    }

    bootstrapData();
  }, []);

  useEffect(() => {
    async function fetchPrescription() {
      if (!selectedPatientId) {
        setPrescription(null);
        setVerification(null);
        return;
      }

      setPrescriptionLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setVerification(null);

      try {
        const { data } = await api.get(`/prescriptions/patient/${selectedPatientId}`);
        setPrescription(data.prescription);
      } catch (error) {
        setPrescription(null);
        setErrorMessage(
          error?.response?.data?.message || "Unable to fetch prescription for the selected patient."
        );
      } finally {
        setPrescriptionLoading(false);
      }
    }

    fetchPrescription();
  }, [selectedPatientId]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || null;

  async function handleVerifyInsurance() {
    if (!prescription || !selectedProviderId) {
      return;
    }

    setIsVerifying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await api.post("/claims/preview", {
        prescriptionId: prescription.id,
        insuranceProviderId: selectedProviderId,
      });
      setVerification(data);
    } catch (error) {
      setVerification(null);
      setErrorMessage(
        error?.response?.data?.message || "Unable to complete insurance verification."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleSubmitClaim() {
    if (!prescription || !selectedProviderId || !verification) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await api.post("/claims/submit", {
        prescriptionId: prescription.id,
        insuranceProviderId: selectedProviderId,
      });

      setSuccessMessage(data.message);
      setVerification((current) =>
        current
          ? {
              ...current,
              submittedClaim: data.claim,
            }
          : current
      );
      setPrescription((current) => (current ? { ...current, status: "Fulfilled" } : current));
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to submit claim right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PharmacyLayout
      title="Automated Claim Submission"
      subtitle="Retrieve prescriptions from connected EMR systems, verify insurance eligibility instantly, and submit a compliant digital claim without manual re-entry."
    >
      <div className="space-y-6">
        {successMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.95fr)]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <UserRoundSearch className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    Select Patient
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search by patient name, email, or National ID to retrieve an active prescription.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <PatientSearchSelect
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelect={setSelectedPatientId}
                  isLoading={patientsLoading}
                />
              </div>

              {selectedPatient ? (
                <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-4">
                  <p className="text-sm font-semibold text-slate-900">{selectedPatient.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPatient.email} • {selectedPatient.nationalId}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-slate-950">
                      Prescribed Medicines
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Active prescription lines pulled from the connected EMR gateway.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  Add Medicine
                </button>
              </div>

              {prescriptionLoading ? (
                <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Loading prescription details...
                </div>
              ) : prescription ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Prescription
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {prescription.prescriptionId}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Doctor
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {prescription.prescribingDoctor}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        EMR Source
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {prescription.originatingEmr}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {prescription.medications.map((medication) => (
                      <div
                        key={medication.medicineVariantId}
                        className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-950">
                              {medication.medicineName}
                            </p>
                            <p className="mt-1 text-sm font-medium text-blue-700">
                              {medication.dosage} {medication.form}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {medication.instructions}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Qty
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {medication.quantity}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Unit Price
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {formatCurrency(medication.inventoryPriceRWF)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Line Total
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {formatCurrency(medication.inventoryPriceRWF * medication.quantity)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Stock
                              </p>
                              <p className={`mt-2 text-sm font-semibold ${medication.stockStatus === "Out of Stock" ? "text-rose-600" : medication.stockStatus === "Low Stock" ? "text-amber-600" : "text-emerald-600"}`}>
                                {medication.stockStatus}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Select a patient to load their active prescription.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <MonitorSmartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    EMR System Integration
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    External prescribing systems connected through the ImitiNet gateway.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <EmrCard
                  title="eBuzima"
                  accentClass="bg-emerald-50 text-emerald-600"
                  icon={Stethoscope}
                />
                <EmrCard
                  title="OpenClinic"
                  accentClass="bg-blue-50 text-blue-600"
                  icon={MonitorSmartphone}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    Insurance Verification & Submission
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Verify coverage instantly, review the cost split, then submit the claim.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Insurance Provider
                </label>
                <select
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {providers.map((provider) => (
                    <option key={provider._id} value={provider._id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleVerifyInsurance}
                disabled={!prescription || !selectedProviderId || isVerifying}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <BadgePlus className="h-4 w-4" />
                    Initiate Instant Insurance Verification
                  </>
                )}
              </button>

              <AnimatePresence>
                {verification ? (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 18 }}
                    className="mt-5 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">
                          {verification.eligibilityMessage}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">
                          {verification.provider.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Claim ready for {verification.prescription.patientName}
                        </p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Total
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {formatCurrency(verification.breakdown.totalAmountRWF)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Covered
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {formatCurrency(verification.breakdown.coveredAmountRWF)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Patient Pays
                        </p>
                        <p className="mt-2 text-lg font-semibold text-emerald-700">
                          {formatCurrency(verification.breakdown.patientPaysRWF)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleSubmitClaim}
                disabled={!verification || isSubmitting || prescription?.status === "Fulfilled"}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Submitting Claim...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Claim
                  </>
                )}
              </button>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Operational Note</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Claims are approved instantly in this pilot simulation once the prescription,
                    pharmacy stock, and insurer coverage all validate successfully.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PharmacyLayout>
  );
}

export default NewClaim;
