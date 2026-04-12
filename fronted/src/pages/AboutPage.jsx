import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus, ArrowRight, Hospital, Users, Pill, ShieldCheck,
  Lock, Fingerprint, Server, Building2, Gavel,
  Globe, CheckCircle, Zap, FileText, Activity,
  ChevronRight,
} from "lucide-react";

// ─── CountUp Hook ─────────────────────────────────────────────────────────────

function useCountUp(target, duration = 2000, active = false) {
  const [count, setCount] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!active || done.current || !target) return;
    done.current = true;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

// ─── Number formatter ────────────────────────────────────────────────────────

function fmtNum(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K+`;
  return `${n}+`;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="animate-pulse flex flex-col gap-3 items-start p-6 rounded-2xl bg-slate-100 border border-slate-200">
    <div className="h-8 w-20 bg-slate-200 rounded" />
    <div className="h-4 w-32 bg-slate-200 rounded" />
  </div>
);

// ─── Live Metric Card ─────────────────────────────────────────────────────────

function MetricCard({ value, label, Icon, active, delay = 0 }) {
  const count = useCountUp(value, 2000, active);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={active ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* subtle blue glow on hover */}
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-100 opacity-0 group-hover:opacity-60 transition-opacity blur-xl" />
      <div className="relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 mb-4">
          <Icon className="h-5 w-5 text-blue-600" strokeWidth={1.8} />
        </div>
        <p className="text-3xl font-display font-bold text-blue-600 tracking-tight"
          data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {fmtNum(count)}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Geometric Mesh Background ────────────────────────────────────────────────

const MeshBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
    {/* Soft gradient orb */}
    <div className="absolute top-[-120px] right-[-80px] w-[520px] h-[520px] rounded-full bg-gradient-to-br from-blue-100 via-blue-50 to-transparent opacity-70 blur-3xl" />
    <div className="absolute bottom-[-60px] left-[-100px] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-cyan-50 via-blue-50 to-transparent opacity-60 blur-3xl" />
    {/* Geometric mesh SVG */}
    <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 10 }).map((_, r) =>
        Array.from({ length: 16 }).map((_, c) => (
          <line key={`h-${r}-${c}`}
            x1={c * 80} y1={r * 80} x2={c * 80 + 80} y2={r * 80 + 80}
            stroke="#3b82f6" strokeWidth="0.5" />
        ))
      )}
      {Array.from({ length: 7 }).map((_, i) => (
        <React.Fragment key={`hl-${i}`}>
          <line x1={0} y1={i * 100} x2={1200} y2={i * 100 + 60} stroke="#3b82f6" strokeWidth="0.4" />
          <line x1={i * 180} y1={0} x2={i * 180 + 100} y2={700} stroke="#3b82f6" strokeWidth="0.4" />
        </React.Fragment>
      ))}
    </svg>
  </div>
);

// ─── Bento Cards data ──────────────────────────────────────────────────────────

const bentoCards = [
  {
    icon: Users,
    tag: "Patients",
    title: "Empowering Lives",
    description: "Real-time insurance eligibility checks, medicine availability lookups, and prescription tracking — giving every Rwandan transparent control over their own healthcare journey.",
    features: ["Instant claim status", "Medicine search", "Coverage verification"],
    accent: "blue",
    gridClass: "md:col-span-2",
  },
  {
    icon: Building2,
    tag: "Pharmacies & Hospitals",
    title: "Streamlined Operations",
    description: "Automated claim submission, fast insurer payouts via MTN MoMo or Bank Transfer, and real-time inventory intelligence — ending manual paperwork permanently.",
    features: ["Fast digital payouts", "Smart inventory alerts", "Batch claim processing"],
    accent: "indigo",
    gridClass: "md:col-span-1",
  },
  {
    icon: ShieldCheck,
    tag: "Insurers",
    title: "Fraud-Proof Claims",
    description: "Our Isolation Forest ML engine scores every claim for anomalies before disbursement — protecting RSSB and private insurers from fraudulent billing patterns.",
    features: ["AI anomaly detection", "ERR-ML-* audit codes", "Real-time alerts"],
    accent: "violet",
    gridClass: "md:col-span-1",
  },
  {
    icon: Gavel,
    tag: "Minisante / Regulators",
    title: "National Traceability",
    description: "FHIR HL7-aligned epidemiological dashboards covering all 5 provinces — empowering evidence-based policy, medicine supply chain oversight, and DHIS2-ready data exports.",
    features: ["FHIR HL7 payloads", "Province-level heatmaps", "30-second sync polling"],
    accent: "emerald",
    gridClass: "md:col-span-2",
  },
];

const accentMap = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   icon: "bg-blue-100 text-blue-600",   tag: "bg-blue-100 text-blue-700",   glow: "group-hover:shadow-blue-100" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-100 text-indigo-600", tag: "bg-indigo-100 text-indigo-700", glow: "group-hover:shadow-indigo-100" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-100 text-violet-600", tag: "bg-violet-100 text-violet-700", glow: "group-hover:shadow-violet-100" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", tag: "bg-emerald-100 text-emerald-700", glow: "group-hover:shadow-emerald-100" },
};

// ─── SVG Line connector (stroke-dasharray animation) ─────────────────────────

const FlowConnector = ({ color = "#3b82f6", active }) => (
  <div className="hidden md:flex items-center justify-center w-16 shrink-0">
    <svg viewBox="0 0 64 16" className="w-full overflow-visible">
      <motion.line
        x1="0" y1="8" x2="64" y2="8"
        stroke={color} strokeWidth="1.5"
        strokeDasharray="64"
        initial={{ strokeDashoffset: 64 }}
        animate={active ? { strokeDashoffset: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      {/* Arrowhead */}
      <motion.polygon
        points="58,4 64,8 58,12"
        fill={color}
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ delay: 0.7 }}
      />
      {/* Pulsing dot */}
      <motion.circle
        r="3" cy="8"
        fill={color}
        initial={{ cx: 0 }}
        animate={active ? { cx: [0, 64, 0] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </svg>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const metricsRef = useRef(null);
  const metricsInView = useInView(metricsRef, { once: true, margin: "-60px" });

  const bentoRef = useRef(null);
  const bentoInView = useInView(bentoRef, { once: true, margin: "-60px" });

  const flowRef = useRef(null);
  const flowInView = useInView(flowRef, { once: true, margin: "-60px" });

  const secRef = useRef(null);
  const secInView = useInView(secRef, { once: true, margin: "-60px" });

  useEffect(() => {
    fetch("http://localhost:5000/api/public/impact-metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Plus className="h-4 w-4" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">ImitiNet</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-0.5">About</span>
            <Link to="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-20 pb-28 px-6">
        <MeshBackground />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Globe className="h-3.5 w-3.5" />
            Rwanda's National Health Interoperability Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight text-slate-900 leading-[1.08]"
          >
            Connecting Rwanda's
            <br />
            <span className="text-blue-600">Healthcare Ecosystem</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto"
          >
            ImitiNet bridges patients, pharmacies, insurers, and Minisante through a unified,
            FHIR-compliant digital backbone — powering transparent healthcare delivery across all 30 districts.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/" className="px-8 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center gap-2">
              Explore Portals <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#impact" className="px-8 py-3.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors">
              View Impact Data
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE METRICS RIBBON ─────────────────────────────────────────────── */}
      <section id="impact" ref={metricsRef} className="py-20 px-6 bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={metricsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Live System Metrics</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">Real Impact. Real Numbers.</h2>
            <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">
              Anonymized aggregates computed live from our production database. No PHI exposed.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5" data-testid="metrics-ribbon">
            {loading ? (
              [0,1,2,3].map(i => <Skeleton key={i} />)
            ) : (
              <>
                <MetricCard value={metrics?.totalActiveFacilities}     label="Active Facilities"       Icon={Hospital}     active={metricsInView} delay={0}    />
                <MetricCard value={metrics?.totalSecuredTransactions}   label="Secured Transactions"    Icon={ShieldCheck}  active={metricsInView} delay={0.12} />
                <MetricCard value={metrics?.totalPatients}             label="Registered Patients"      Icon={Users}        active={metricsInView} delay={0.24} />
                <MetricCard value={metrics?.totalMedicinesTracked}     label="Medicines Tracked"        Icon={Pill}         active={metricsInView} delay={0.36} />
              </>
            )}
          </div>

          {/* Uptime badge */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={metricsInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 }}
              className="mt-8 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-bold">
                  {metrics?.uptimePercentage}% Platform Uptime — All Systems Operational
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── BENTO GRID — MULTI-PERSONA ────────────────────────────────────── */}
      <section ref={bentoRef} className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={bentoInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">For Every Stakeholder</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">
              One Platform. Endless Possibilities.
            </h2>
            <p className="text-slate-500 mt-3 text-sm max-w-xl mx-auto">
              Every actor in Rwanda's healthcare ecosystem gets a purpose-built experience, powered by the same trusted backbone.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {bentoCards.map((card, i) => {
              const a = accentMap[card.accent];
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.tag}
                  initial={{ opacity: 0, y: 30 }}
                  animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                  whileHover={{ y: -5, boxShadow: "0 20px 40px -8px rgba(59,130,246,0.12)" }}
                  className={`group relative rounded-2xl border ${a.border} ${a.bg} p-7 flex flex-col gap-5 cursor-default transition-all ${card.gridClass}`}
                >
                  <div>
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${a.icon} mb-4`}>
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${a.tag} mb-3`}>
                      {card.tag}
                    </span>
                    <h3 className="text-xl font-display font-bold text-slate-900 mb-2">{card.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{card.description}</p>
                  </div>
                  <ul className="space-y-2 mt-auto">
                    {card.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── INTEROPERABILITY FLOW ────────────────────────────────────────────── */}
      <section ref={flowRef} className="py-24 px-6 bg-slate-50 border-y border-slate-100">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={flowInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Architecture</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">
              How ImitiNet Translates Healthcare
            </h2>
            <p className="text-slate-500 mt-3 text-sm max-w-xl mx-auto">
              A tri-pillar interoperability engine standardizing every data exchange across the Rwandan health network.
            </p>
          </motion.div>

          {/* Pillars */}
          <div className="flex flex-col md:flex-row items-stretch gap-0">
            {/* Pillar 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={flowInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                <Building2 className="h-7 w-7 text-blue-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Providers</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Clinics, pharmacies &amp; hospitals submit claims and inventory in real-time.</p>
            </motion.div>

            <FlowConnector color="#3b82f6" active={flowInView} />

            {/* Pillar 2 — Core */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={flowInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex-1 rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-8 text-center shadow-md relative"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                <Zap className="h-7 w-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">ImitiNet AI Core</h3>
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-1.5 mt-1 mb-3 px-3 py-1 bg-blue-600 rounded-full"
              >
                <CheckCircle className="h-3 w-3 text-white" />
                <span className="text-white text-[10px] font-bold uppercase tracking-wider">FHIR HL7 Standard</span>
              </motion.div>
              <p className="text-sm text-slate-500 leading-relaxed">AI-powered validation, fraud anomaly scoring, and FHIR normalization pipeline.</p>
            </motion.div>

            <FlowConnector color="#10b981" active={flowInView} />

            {/* Pillar 3 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={flowInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex-1 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                <FileText className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Regulators</h3>
              <p className="text-sm text-slate-500 leading-relaxed">RSSB and Minisante receive clean, verified national health intelligence.</p>
            </motion.div>
          </div>

          {/* Flow step labels */}
          <div className="hidden md:flex justify-center gap-4 mt-5 text-xs text-slate-400 font-medium">
            <span className="flex-1 text-center">Submit → Validate</span>
            <span className="w-16 text-center">Normalize</span>
            <span className="flex-1 text-center">Enrich → Report</span>
            <span className="w-16" />
            <span className="flex-1 text-center">Deliver Intelligence</span>
          </div>
        </div>
      </section>

      {/* ── SECURITY & COMPLIANCE ────────────────────────────────────────────── */}
      <section ref={secRef} className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={secInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-3">Security</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">
              Zero-Compromise Confidentiality
            </h2>
            <p className="text-slate-500 mt-3 text-sm max-w-xl mx-auto">
              Every byte traversing ImitiNet is encrypted, audited, and compliant with Rwandan national data law.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: Lock,
                color: "blue",
                title: "End-to-End Encryption",
                desc: "All patient claim pipelines are protected by AES-256 encryption in transit and at rest. JWT tokens rotate on every session boundary.",
              },
              {
                Icon: Fingerprint,
                color: "emerald",
                title: "Rwandan Data Protection",
                desc: "Full compliance with Law N°058/2021 governing data protection and privacy in Rwanda. No PHI is ever exposed through public endpoints.",
              },
              {
                Icon: Server,
                color: "violet",
                title: "Immutable Audit Trail",
                desc: "Every admin action is cryptographically logged. Quick Audit snapshots are timestamped and attributed to the issuing Minisante profile.",
              },
            ].map(({ Icon, color, title, desc }, i) => {
              const colors = {
                blue:   "bg-blue-50 border-blue-200 text-blue-600",
                emerald:"bg-emerald-50 border-emerald-200 text-emerald-600",
                violet: "bg-violet-50 border-violet-200 text-violet-600",
              };
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={secInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: i * 0.12 }}
                  className="rounded-2xl border border-slate-200 bg-white p-7 hover:shadow-md transition-shadow"
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${colors[color]} mb-5`}>
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-blue-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
            Ready to Join Rwanda's Health Network?
          </h2>
          <p className="mt-4 text-blue-100 text-base leading-relaxed max-w-xl mx-auto">
            Whether you're a patient, pharmacist, insurer, or regulator — ImitiNet has a portal purpose-built for you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/" className="px-8 py-3.5 bg-white text-blue-700 text-sm font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg shadow-blue-700/20 flex items-center gap-2 justify-center">
              Select Your Portal <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">ImitiNet</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © 2026 ImitiNet Rwanda — Ministry of Health National Interoperability Programme.
          </p>
          <Link to="/" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
            Back to Portals <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
