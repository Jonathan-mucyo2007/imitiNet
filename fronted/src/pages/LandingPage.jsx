import React from "react";
import {
  Bell,
  Building2,
  Gavel,
  Home,
  Mail,
  Pill,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import patientPortalImage from "../assets/patient portal.jfif";
import pharmacyPortalImage from "../assets/pharmacy.jfif";
import insurerPortalImage from "../assets/insurer portal.jfif";
import regulatorPortalImage from "../assets/regulator.jfif";
import RoleCard from "../components/RoleCard";

const navigationItems = [
  { label: "Home", icon: Home, active: true },
  { label: "About ImitiNet", icon: Sparkles, active: false },
  { label: "Contact Us", icon: Mail, active: false },
];

const roleCards = [
  {
    title: "Patient Portal",
    icon: Pill,
    description:
      "Access medicine search, check insurance coverage, manage appointments, and view health records from a user-friendly interface.",
    buttonLabel: "Access Patient Portal",
    imageSrc: patientPortalImage,
  },
  {
    title: "Pharmacy/Hospital Portal",
    icon: Building2,
    description:
      "Streamline claim submissions, manage inventory, track claim statuses, and monitor operational efficiency for your pharmacy or hospital.",
    buttonLabel: "Access Pharmacy/Hospital Portal",
    imageSrc: pharmacyPortalImage,
  },
  {
    title: "Umwishingizi Portal",
    icon: ShieldCheck,
    description:
      "Gain real-time insights into claim volumes and cost trends, manage pharmacy onboarding, and detect suspicious fraud patterns effectively.",
    buttonLabel: "Access Umwishingizi Portal",
    imageSrc: insurerPortalImage,
  },
  {
    title: "Regulator Dashboard",
    icon: Gavel,
    description:
      "Monitor national health metrics, ensure medicine traceability, and oversee policy implementation.",
    buttonLabel: "Access Regulator Dashboard",
    imageSrc: regulatorPortalImage,
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative w-full border-b border-slate-200 bg-white px-6 py-8 lg:min-h-screen lg:w-[250px] lg:border-b-0 lg:border-r lg:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight text-blue-600">
                ImitiNet
              </p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Welcome to ImitiNet
            </p>

            <nav className="mt-5 space-y-2">
              {navigationItems.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-slate-100 font-medium text-slate-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <p className="mt-10 text-xs text-slate-400 lg:absolute lg:bottom-6 lg:left-5">
            © ImitiNet 2024
          </p>
        </aside>

        <main className="flex-1 bg-[#f8fafc] px-6 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </button>

              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80"
                alt="User avatar"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            </div>

            <section className="mt-10 max-w-3xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Welcome to ImitiNet
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                Your trusted partner for integrated healthcare solutions in Rwanda.
                Select your role to begin.
              </p>
            </section>

            <section className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
              {roleCards.map((role) => (
                <RoleCard key={role.title} {...role} />
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LandingPage;
