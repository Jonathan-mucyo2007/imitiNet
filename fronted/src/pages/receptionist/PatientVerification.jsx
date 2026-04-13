import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Copy,
  Keyboard,
  LoaderCircle,
  Lock,
  QrCode,
  RefreshCcw,
  Search,
} from "lucide-react";
import api from "../../services/api";

function buildValidationMessage(value) {
  if (!value.trim()) return "National ID is required.";
  if (!/^\d+$/.test(value)) return "National ID must contain numbers only.";
  if (value.length !== 16) return "National ID must contain exactly 16 digits.";
  return "";
}

function SkeletonCard({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-[1.75rem] bg-slate-100 ${className}`}>
      <div className="h-full w-full rounded-[1.75rem] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />
    </div>
  );
}

function playSuccessBeep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

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

function VerificationResults({ result, idLabelValue, onCopyToken }) {
  if (!result) {
    return null;
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        data-testid="nida-card"
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[#1E56D0] via-blue-500 to-cyan-400" />
        <div className="relative mt-16 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-5 md:grid-cols-[160px_1fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-white bg-white shadow-sm">
              <img
                src={result.nida.data.patient_photo}
                alt={result.nida.data.patient_name}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Indangamuntu y&apos;u Rwanda
              </p>
              <motion.h3
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 font-display text-3xl font-semibold text-slate-900"
              >
                {result.nida.data.patient_name}
              </motion.h3>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["Numero y'irangamuntu", idLabelValue],
                  ["Itariki y'amavuko", result.nida.data.date_of_birth],
                  ["Igitsina", result.nida.data.gender],
                  ["Byemejwe", new Date(result.nida.data.verified_at).toLocaleString()],
                ].map(([label, value]) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.article>

      <motion.article
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-[2rem] border border-slate-200 bg-[#F9FAFB] p-6 shadow-sm"
        data-testid="rssb-card"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              RSSB Verification
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold text-slate-900">
              {result.rssb.data.patient_status === "verified"
                ? "Patient Verified"
                : "Patient Not Verified"}
            </h3>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ["Patient Status", result.rssb.data.patient_status],
            ["Insurance Active", result.rssb.data.insurance_active ? "true" : "false"],
            ["Verified At", new Date(result.rssb.data.verified_at).toLocaleString()],
            ["Claim Ref", result.rssb.data.claim_reference],
            ["Provider Code", result.rssb.data.provider_code],
            ["ATC Reference", result.rssb.data.medicine_reference],
          ].map(([label, value]) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-[#1E56D0]">
            Verification token: <span data-testid="verification-token">{result.verificationToken}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use this session token to bridge into OpenClinic GA or internal claim filing with
            standardized ATC medicine references and ICD-10 provider coding concepts.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={result.bridge.openClinicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E56D0] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1848ad]"
            >
              Start Claim
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onCopyToken}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              Copy Token
            </button>
          </div>
        </div>
      </motion.article>
    </>
  );
}

function PatientVerification() {
  const [mode, setMode] = useState("manual");
  const [idNumber, setIdNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [errorState, setErrorState] = useState("");
  const [result, setResult] = useState(null);
  const [scannerMessage, setScannerMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isScannerInitializing, setIsScannerInitializing] = useState(false);
  const [isScannerBusy, setIsScannerBusy] = useState(false);
  const [lastScannedToken, setLastScannedToken] = useState("");
  const scannerRef = useRef(null);
  const scannerElementId = "patient-verification-scanner";

  const manualMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/receptionist/verify-patient", payload);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setErrorState("");
    },
    onError: (error) => {
      setErrorState(error?.response?.data?.message || "Unable to verify patient.");
      setResult(null);
    },
  });

  const scanMutation = useMutation({
    mutationFn: async (token) => {
      const { data } = await api.post("/receptionist/scan-verify", { token });
      return data;
    },
    onSuccess: async (data) => {
      playSuccessBeep();
      setResult(data);
      setErrorState("");
      setScannerMessage("Patient QR verified successfully.");
      setIsScannerBusy(false);
      await stopScanner();
    },
    onError: async (error) => {
      setErrorState(
        error?.response?.data?.message || "Unable to verify scanned patient right now."
      );
      setResult(null);
      setScannerMessage("");
      setIsScannerBusy(false);
      await stopScanner();
    },
  });

  const isLoading = manualMutation.isPending || scanMutation.isPending;
  const isValid = useMemo(() => buildValidationMessage(idNumber) === "", [idNumber]);

  async function stopScanner() {
    if (!scannerRef.current) {
      return;
    }

    try {
      await scannerRef.current.stop();
    } catch (_error) {
      // Scanner may already be stopped.
    }

    try {
      await scannerRef.current.clear();
    } catch (_error) {
      // Ignore clear errors when DOM is already gone.
    }

    scannerRef.current = null;
  }

  const startScanner = async () => {
    if (scannerRef.current || mode !== "scan" || isScannerBusy) {
      return;
    }

    setIsScannerInitializing(true);
    setCameraError("");
    setScannerMessage("Align the patient's rolling QR code inside the frame.");

    try {
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.333334,
        },
        async (decodedText) => {
          if (isScannerBusy || decodedText === lastScannedToken) {
            return;
          }

          setLastScannedToken(decodedText);
          setIsScannerBusy(true);
          setScannerMessage("Secure code detected. Verifying now...");

          try {
            await scanner.pause(true);
          } catch (_error) {
            // Some browsers may not support pause cleanly.
          }

          scanMutation.mutate(decodedText);
        },
        () => {}
      );
    } catch (error) {
      setCameraError(
        "Camera access was denied or unavailable. Please allow camera access or use Manual ID Entry."
      );
      setScannerMessage("");
      await stopScanner();
    } finally {
      setIsScannerInitializing(false);
    }
  };

  useEffect(() => {
    if (mode === "scan") {
      startScanner();
    }

    if (mode !== "scan") {
      setCameraError("");
      setScannerMessage("");
      setIsScannerBusy(false);
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [mode]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const nextError = buildValidationMessage(idNumber);
    setValidationError(nextError);
    setErrorState("");
    setResult(null);

    if (nextError) {
      return;
    }

    manualMutation.mutate({ idNumber });
  };

  const handleRestartScanner = async () => {
    setErrorState("");
    setResult(null);
    setLastScannedToken("");
    setScannerMessage("");
    setCameraError("");
    setIsScannerBusy(false);
    await stopScanner();
    await startScanner();
  };

  const displayedIdValue = result?.nida?.data?.id_number || idNumber;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Patient Identity Verification
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
              Secure dual-mode verification for manual entry or rolling patient QR scan.
            </h2>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-[1.4rem] border border-slate-200 bg-slate-50 p-1.5">
              {[
                { id: "manual", label: "Manual ID Entry", icon: Keyboard },
                { id: "scan", label: "Scan Patient QR", icon: Camera },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setErrorState("");
                    setResult(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                    mode === id
                      ? "bg-white text-[#1E56D0] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode === "manual" ? (
              <motion.div
                key="manual-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8"
              >
                <motion.form
                  onSubmit={handleSearch}
                  animate={validationError ? { x: [0, -6, 6, -4, 0] } : { x: 0 }}
                >
                  <motion.div
                    whileFocus={{ scale: 1.01 }}
                    className={`flex flex-col gap-3 rounded-[1.75rem] border bg-slate-50 p-3 shadow-sm sm:flex-row ${
                      validationError ? "border-rose-300" : "border-slate-200"
                    }`}
                  >
                    <label className="flex flex-1 items-center gap-3 rounded-[1.3rem] bg-white px-4 py-4">
                      <motion.span
                        animate={manualMutation.isPending ? { rotate: 360 } : { rotate: 0 }}
                        transition={{
                          duration: 0.8,
                          repeat: manualMutation.isPending ? Infinity : 0,
                          ease: "linear",
                        }}
                      >
                        <Search className="h-5 w-5 text-slate-400" />
                      </motion.span>
                      <input
                        value={idNumber}
                        onChange={(event) => {
                          const numericValue = event.target.value.replace(/\D/g, "");
                          setIdNumber(numericValue);
                          setValidationError(buildValidationMessage(numericValue));
                        }}
                        placeholder="Enter 16-digit National ID"
                        className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                        data-testid="receptionist-id-input"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!isValid || manualMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] bg-[#1E56D0] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1848ad] disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="receptionist-search-btn"
                    >
                      {manualMutation.isPending ? "Searching..." : "Search"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                </motion.form>

                {validationError ? (
                  <p className="mt-3 text-sm text-rose-600" data-testid="receptionist-validation-error">
                    {validationError}
                  </p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="scan-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-8"
              >
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-slate-950 shadow-sm">
                    <div id={scannerElementId} className="min-h-[360px] w-full bg-slate-950" />

                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_32%,rgba(2,6,23,0.4)_70%,rgba(2,6,23,0.84)_100%)]" />
                      <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-emerald-300/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.15)]" />
                      <motion.div
                        animate={{ y: [0, 216, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-1/2 top-[calc(50%-120px)] h-1 w-56 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.9)]"
                      />
                    </div>

                    {(isScannerInitializing || isScannerBusy || scanMutation.isPending) ? (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/60 backdrop-blur-sm">
                        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-300" />
                        <p className="text-sm font-medium text-white">
                          {isScannerBusy || scanMutation.isPending
                            ? "Verifying secure patient token..."
                            : "Starting camera..."}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.9rem] border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-semibold text-slate-900">
                          Scan Patient QR
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Scan the patient&apos;s rolling hospital QR. The code contains a signed,
                          short-lived secure token rather than a plain-text ID.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Scanner Status
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {scannerMessage || "Waiting for secure QR alignment."}
                        </p>
                      </div>

                      {cameraError ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          {cameraError}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleRestartScanner}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Restart Scanner
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-start justify-center gap-2.5 text-xs leading-5 text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p>
              Verification data is session-based. ImitiNet never stores full patient records.
            </p>
          </div>
        </div>
      </section>

      {errorState ? (
        <div
          className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
          data-testid="receptionist-error-state"
        >
          {errorState}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {isLoading ? (
          <>
            <SkeletonCard className="h-[430px]" />
            <SkeletonCard className="h-[430px]" />
          </>
        ) : result ? (
          <VerificationResults
            result={result}
            idLabelValue={displayedIdValue}
            onCopyToken={() => navigator.clipboard?.writeText(result.verificationToken)}
          />
        ) : (
          <div className="xl:col-span-2 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-4 text-sm">
              Use manual entry or scan a patient QR to render the NIDA card and RSSB verification summary.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default PatientVerification;
