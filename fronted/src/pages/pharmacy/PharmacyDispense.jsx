import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import {
  CheckCircle2,
  LoaderCircle,
  QrCode,
  Receipt,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PharmacyLayout from "../../components/layout/PharmacyLayout";
import api from "../../services/api";

function formatCurrency(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function buildRxCodeMessage(value) {
  if (!value.trim()) return "RX Retrieval Code is required.";
  if (!/^RX-[A-Z0-9-]+$/i.test(value.trim())) {
    return "Enter a valid RX Retrieval Code, for example RX-782-KGL.";
  }
  return "";
}

function playSuccessBeep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
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

function PharmacyDispense() {
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [rxCode, setRxCode] = useState("");
  const [validationError, setValidationError] = useState("");
  const [prescription, setPrescription] = useState(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isScannerBusy, setIsScannerBusy] = useState(false);
  const scannerRef = useRef(null);
  const scannerElementId = "pharmacy-dispense-scanner";
  const verificationToken = searchParams.get("verificationToken") || "";

  useEffect(() => {
    async function bootstrapData() {
      try {
        const providersResponse = await api.get("/claims/providers");
        setProviders(providersResponse.data || []);
        if ((providersResponse.data || []).length > 0) {
          setSelectedProviderId(providersResponse.data[0]._id);
        }
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message || "Unable to load claim submission data."
        );
      }
    }

    bootstrapData();
  }, []);

  async function stopScanner() {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.stop();
    } catch (_error) {}

    try {
      await scannerRef.current.clear();
    } catch (_error) {}

    scannerRef.current = null;
  }

  async function fetchPrescriptionByCode(nextCode) {
    const normalizedCode = String(nextCode || "").trim().toUpperCase();
    const nextError = buildRxCodeMessage(normalizedCode);
    setValidationError(nextError);
    setErrorMessage("");
    setSuccessMessage("");
    setVerification(null);

    if (nextError) {
      setPrescription(null);
      return;
    }

    setPrescriptionLoading(true);
    try {
      const { data } = await api.get(
        `/pharmacy/prescription/retrieve/${encodeURIComponent(normalizedCode)}`
      );
      setRxCode(normalizedCode);
      setPrescription(data.prescription);
    } catch (_error) {
      setPrescription(null);
      setErrorMessage(
        "Invalid or Expired RX Code. Please ensure the patient provided the correct retrieval code."
      );
    } finally {
      setPrescriptionLoading(false);
    }
  }

  async function startScanner() {
    if (scannerRef.current) return;

    setCameraError("");
    setScannerMessage("Align the patient QR or RX code inside the frame.");

    try {
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.333334 },
        async (decodedText) => {
          if (isScannerBusy) return;

          setIsScannerBusy(true);
          setScannerMessage("RX code detected. Loading prescription...");
          playSuccessBeep();

          try {
            await scanner.pause(true);
          } catch (_error) {}

          await fetchPrescriptionByCode(decodedText);
          await stopScanner();
          setIsScannerOpen(false);
          setIsScannerBusy(false);
        },
        () => {}
      );
    } catch (_error) {
      setCameraError(
        "Camera access was denied or unavailable. Please use the RX Retrieval Code input instead."
      );
      setScannerMessage("");
      await stopScanner();
    }
  }

  useEffect(() => {
    if (isScannerOpen) {
      startScanner();
    } else {
      setCameraError("");
      setScannerMessage("");
      setIsScannerBusy(false);
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScannerOpen]);

  async function handleVerifyInsurance() {
    if (!prescription || !selectedProviderId) return;

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
    if (!prescription || !selectedProviderId || !verification) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data } = await api.post("/claims/submit", {
        prescriptionId: prescription.id,
        insuranceProviderId: selectedProviderId,
        verificationToken: verificationToken || undefined,
      });

      setSuccessMessage(data.message);
      setVerification((current) =>
        current ? { ...current, submittedClaim: data.claim } : current
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
      title="Zero-Trust Dispensing"
      subtitle="Pharmacists can only access a prescription when the patient explicitly provides a valid RX retrieval code or scannable consent token."
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

        {verificationToken ? (
          <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-700">
            Reception verification session attached: <span className="font-semibold">{verificationToken}</span>
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Consent-Based Retrieval
            </div>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-slate-950">
              Retrieve a prescription using only the patient&apos;s RX code or QR.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Name, email, and National ID lookup have been removed from the pharmacy workflow.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                fetchPrescriptionByCode(rxCode);
              }}
              className="mt-8"
            >
              <div className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:flex-row sm:items-center">
                <input
                  value={rxCode}
                  onChange={(event) => {
                    const nextValue = event.target.value.toUpperCase();
                    setRxCode(nextValue);
                    setValidationError(buildRxCodeMessage(nextValue));
                  }}
                  placeholder="RX-782-KGL"
                  className="h-16 flex-1 rounded-[1.2rem] border border-slate-200 bg-white px-5 text-center font-display text-xl font-semibold tracking-[0.24em] text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                <div className="flex flex-col gap-3 sm:w-[280px]">
                  <button
                    type="submit"
                    disabled={prescriptionLoading}
                    className="inline-flex h-16 items-center justify-center rounded-[1.2rem] bg-[#1E56D0] px-5 text-sm font-semibold text-white transition hover:bg-[#1848ad] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prescriptionLoading ? "Loading..." : "Retrieve Prescription"}
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <ScanLine className="h-4 w-4 text-blue-600" />
                    Scan QR Token
                  </motion.button>
                </div>
              </div>
            </form>

            {validationError ? <p className="mt-3 text-sm text-rose-600">{validationError}</p> : null}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.95fr)]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    Prescription Retrieval Result
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Patient identity is only revealed after successful RX code validation.
                  </p>
                </div>
              </div>

              {prescriptionLoading ? (
                <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Loading prescription details...
                </div>
              ) : prescription ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">RX Code</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{prescription.rxCode}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{prescription.patient.fullName}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Doctor</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{prescription.prescribingDoctor}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Date</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {new Date(prescription.createdAt).toLocaleDateString()}
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
                            <p className="text-base font-semibold text-slate-950">{medication.medicineName}</p>
                            <p className="mt-1 text-sm font-medium text-blue-700">
                              {medication.dosage} {medication.form}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{medication.instructions}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Qty</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">{medication.quantity}</p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Unit Price</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {formatCurrency(medication.inventoryPriceRWF)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Line Total</p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {formatCurrency(medication.inventoryPriceRWF * medication.quantity)}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Stock</p>
                              <p className={`mt-2 text-sm font-semibold ${
                                medication.stockStatus === "Out of Stock"
                                  ? "text-rose-600"
                                  : medication.stockStatus === "Low Stock"
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                              }`}>
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
                  Enter or scan a valid RX Retrieval Code to load a single dispensing transaction.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    Zero-Trust Controls
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Only this transaction is visible after patient consent by RX code.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <EmrCard title="eUbuzima" accentClass="bg-emerald-50 text-emerald-600" icon={Stethoscope} />
                <EmrCard title="OpenClinic" accentClass="bg-blue-50 text-blue-600" icon={ShieldCheck} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">
                    Insurance Verification & Dispense
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Verify coverage instantly, then complete dispense and submit the claim.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Insurance Provider</label>
                <select
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  {providers.map((provider) => (
                    <option key={provider._id} value={provider._id}>{provider.name}</option>
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
                    <ShieldCheck className="h-4 w-4" />
                    Verify Insurance Coverage
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
                        <p className="text-sm font-semibold text-emerald-700">{verification.eligibilityMessage}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950">{verification.provider.name}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Claim ready for {verification.prescription.patientName}
                        </p>
                      </div>
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {formatCurrency(verification.breakdown.totalAmountRWF)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Covered</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {formatCurrency(verification.breakdown.coveredAmountRWF)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Pays</p>
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
                    Completing Dispense...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Dispense & Submit Claim
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {isScannerOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-sm"
                onClick={() => setIsScannerOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-2xl -translate-y-1/2 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.3)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">RX QR Scanner</p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">
                      Scan the patient&apos;s dispensing code
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-slate-950 shadow-sm">
                    <div id={scannerElementId} className="min-h-[340px] w-full bg-slate-950" />
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_32%,rgba(2,6,23,0.4)_70%,rgba(2,6,23,0.84)_100%)]" />
                      <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-emerald-300/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.15)]" />
                      <motion.div
                        animate={{ y: [0, 216, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-1/2 top-[calc(50%-120px)] h-1 w-56 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.9)]"
                      />
                    </div>

                    {isScannerBusy ? (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/60 backdrop-blur-sm">
                        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-300" />
                        <p className="text-sm font-medium text-white">Loading prescription...</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.9rem] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <ScanLine className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-semibold text-slate-900">
                          Camera Verification
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Successful reads close the camera immediately and load the matching prescription.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Scanner Status</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {scannerMessage || "Waiting for RX code alignment."}
                        </p>
                      </div>

                      {cameraError ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          {cameraError}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={async () => {
                          await stopScanner();
                          await startScanner();
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Restart Scanner
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </div>
    </PharmacyLayout>
  );
}

export default PharmacyDispense;
