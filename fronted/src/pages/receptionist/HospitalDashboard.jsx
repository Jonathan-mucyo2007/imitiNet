import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BadgeCheck, ClipboardCheck, ShieldCheck, TrendingUp } from "lucide-react";
import api from "../../services/api";

const kpiMeta = [
  {
    key: "totalPatientsVerifiedToday",
    label: "Total Patients Verified Today",
    icon: ClipboardCheck,
  },
  {
    key: "activeInsuredPatients",
    label: "Active Insured Patients",
    icon: ShieldCheck,
  },
  {
    key: "claimsStarted",
    label: "Claims Started",
    icon: BadgeCheck,
  },
  {
    key: "verificationTrends",
    label: "Verification Trends",
    icon: TrendingUp,
  },
];

function HospitalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data: payload } = await api.get("/receptionist/dashboard");
        if (active) {
          setData(payload);
          setLoading(false);
        }
      } catch (_error) {
        if (active) {
          setLoading(false);
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

  const kpis = useMemo(() => data?.kpis || {}, [data]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Activity className="h-10 w-10 animate-spin text-[#1E56D0]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpiMeta.map(({ key, label, icon: Icon }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1E56D0]">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-3xl font-display font-bold text-slate-950">
              {kpis[key] ?? 0}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-slate-950">
            Daily Verification Volume
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Materialized trend baselines refreshed with receptionist activity polling.
          </p>

          <div className="mt-6 h-[320px]" data-testid="receptionist-line-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.dailyVerificationVolume || []}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="verifications"
                  stroke="#1E56D0"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  animationBegin={200}
                />
                <Line
                  type="monotone"
                  dataKey="claimsStarted"
                  stroke="#38BDF8"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  animationBegin={200}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-semibold text-slate-950">
            Insurance Status Distribution
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Active vs inactive verification outcomes from session-based receptionist checks.
          </p>

          <div className="mt-6 h-[320px]" data-testid="receptionist-pie-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.insuranceStatusDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  animationBegin={200}
                >
                  {(data?.insuranceStatusDistribution || []).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-semibold text-slate-950">
          Recent Verification Sessions
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="py-3">Verification Token</th>
                <th className="py-3">Status</th>
                <th className="py-3">Insurance Active</th>
                <th className="py-3">Verified At</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentVerifications || []).map((item) => (
                <tr key={item.verificationToken} className="border-b border-slate-100 text-sm text-slate-600">
                  <td className="py-4 font-semibold text-slate-900">{item.verificationToken}</td>
                  <td className="py-4 capitalize">{item.status}</td>
                  <td className="py-4">{item.insuranceActive ? "true" : "false"}</td>
                  <td className="py-4">{new Date(item.verifiedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default HospitalDashboard;
