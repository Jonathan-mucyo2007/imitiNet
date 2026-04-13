import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Lock,
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

function PatientVerification() {
  const [idNumber, setIdNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState("");
  const [result, setResult] = useState(null);

  const isValid = useMemo(() => buildValidationMessage(idNumber) === "", [idNumber]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const nextError = buildValidationMessage(idNumber);
    setValidationError(nextError);
    setErrorState("");
    setResult(null);

    if (nextError) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/receptionist/verify-patient", { idNumber });
      setResult(data);
    } catch (error) {
      setErrorState(error?.response?.data?.message || "Unable to verify patient.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-sm">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Patient Identity Verification
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
            Verify NIDA identity and RSSB status in one search.
          </h2>

          <motion.form
            onSubmit={handleSearch}
            animate={validationError ? { x: [0, -6, 6, -4, 0] } : { x: 0 }}
            className="mt-8"
          >
            <motion.div
              whileFocus={{ scale: 1.01 }}
              className={`flex flex-col gap-3 rounded-[1.75rem] border bg-slate-50 p-3 shadow-sm sm:flex-row ${
                validationError ? "border-rose-300" : "border-slate-200"
              }`}
            >
              <label className="flex flex-1 items-center gap-3 rounded-[1.3rem] bg-white px-4 py-4">
                <motion.span
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.8, repeat: loading ? Infinity : 0, ease: "linear" }}
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
                disabled={!isValid || loading}
                className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] bg-[#1E56D0] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1848ad] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="receptionist-search-btn"
              >
                {loading ? "Searching..." : "Search"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.form>

          {validationError ? (
            <p className="mt-3 text-sm text-rose-600" data-testid="receptionist-validation-error">
              {validationError}
            </p>
          ) : null}

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
        {loading ? (
          <>
            <SkeletonCard className="h-[430px]" />
            <SkeletonCard className="h-[430px]" />
          </>
        ) : result ? (
          <>
            <motion.article
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
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
                        ["Numero y'irangamuntu", idNumber],
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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
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
                    onClick={() => navigator.clipboard?.writeText(result.verificationToken)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Token
                  </button>
                </div>
              </div>
            </motion.article>
          </>
        ) : (
          <div className="xl:col-span-2 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-4 text-sm">
              Search a patient ID to render the NIDA card and RSSB verification summary.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default PatientVerification;
