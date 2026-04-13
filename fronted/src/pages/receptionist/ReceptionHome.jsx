import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardCheck, Lock, ShieldCheck, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";

function ReceptionHome() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data } = await api.get("/receptionist/dashboard");
        if (active) {
          setDashboard(data);
        }
      } catch (_error) {
        if (active) {
          setDashboard(null);
        }
      }
    }

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const cards = [
    {
      title: "Begin Patient Verification",
      description:
        "Search a 16-digit national ID, call the NIDA and RSSB mock services in parallel, and issue a secure verification token.",
      icon: ClipboardCheck,
      to: "/dashboard/receptionist/verify",
    },
    {
      title: "View Live Intake Analytics",
      description:
        "Track verification volume, insurance status distribution, and claim-start readiness through the receptionist dashboard.",
      icon: Waves,
      to: "/dashboard/receptionist/analytics",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Verification Workflow
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
            Front-desk identity checks with a clean handoff into claims.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            Every verification produces a session token that expires after 24 hours, helping your
            reception team move quickly without retaining full patient records.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {cards.map(({ title, description, icon: Icon, to }) => (
              <Link
                key={title}
                to={to}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1E56D0] shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1E56D0]">
                  Open workflow <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1E56D0]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Today
              </p>
              <h3 className="text-xl font-semibold text-slate-900">Reception Snapshot</h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              ["Total Patients Verified Today", dashboard?.kpis?.totalPatientsVerifiedToday ?? "--"],
              ["Active Insured Patients", dashboard?.kpis?.activeInsuredPatients ?? "--"],
              ["Claims Started", dashboard?.kpis?.claimsStarted ?? "--"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-display font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2.5 text-xs leading-5 text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p>
              Verification data is session-based. ImitiNet never stores full patient records.
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default ReceptionHome;
