import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import Tilt from "react-parallax-tilt";
import {
  ArrowRight,
  Check,
  Lock,
  Mail,
  MapPin,
  Plus,
} from "lucide-react";
import contactImage from "../assets/contact.jfif";

const roleOptions = ["Patient", "Provider", "Insurer", "Regulator"];

const initialForm = {
  fullName: "",
  email: "",
  role: "",
  message: "",
};

function Spinner() {
  return (
    <motion.span
      aria-hidden="true"
      className="h-5 w-5 rounded-full border-2 border-white/35 border-t-white"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

function SocialIcon({ href, label, className = "", children }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      className={`group inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-transform ${className}`}
    >
      <motion.span
        className="inline-flex"
        whileHover={{ y: [0, -2, 0] }}
        transition={{ duration: 0.45 }}
      >
        {children}
      </motion.span>
    </motion.a>
  );
}

function FloatingField({
  as = "input",
  id,
  label,
  value,
  onChange,
  type = "text",
  options = [],
}) {
  const [focused, setFocused] = useState(false);
  const raised = focused || Boolean(value);
  const Tag = as;

  return (
    <motion.label
      htmlFor={id}
      animate={{
        y: focused ? -2 : 0,
        boxShadow: focused
          ? "0 16px 38px -26px rgba(30, 86, 208, 0.5)"
          : "0 8px 30px -24px rgba(15, 23, 42, 0.18)",
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`relative block rounded-[1.35rem] border bg-white/95 px-4 pb-3 pt-6 backdrop-blur-sm ${
        focused
          ? "border-blue-300 ring-2 ring-blue-500/25"
          : "border-slate-200/90"
      }`}
    >
      <motion.span
        animate={{
          top: raised ? 12 : as === "textarea" ? 28 : 24,
          scale: raised ? 0.84 : 1,
          color: focused ? "#1E56D0" : "#64748b",
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="pointer-events-none absolute left-4 origin-left text-sm font-medium"
      >
        {label}
      </motion.span>

      {as === "select" ? (
        <select
          id={id}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="mt-2 block w-full appearance-none bg-transparent pt-2 text-sm text-slate-900 outline-none"
        >
          <option value="" disabled>
            Select your role
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Tag
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={as === "textarea" ? 5 : undefined}
          className={`mt-2 block w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-transparent ${
            as === "textarea" ? "min-h-[128px] pt-2 leading-6" : "pt-2"
          }`}
          placeholder={label}
        />
      )}
    </motion.label>
  );
}

function HeroVisual() {
  const particles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => ({
        id: index,
        width: 12 + (index % 3) * 10,
        height: 12 + ((index + 1) % 3) * 10,
        left: 10 + (index % 4) * 20,
        top: 12 + Math.floor(index / 4) * 48,
        delay: index * 0.24,
        duration: 5 + (index % 3),
      })),
    [],
  );

  return (
    <Tilt
      tiltMaxAngleX={10}
      tiltMaxAngleY={10}
      perspective={1400}
      scale={1.02}
      transitionSpeed={1800}
      gyroscope
      className="mx-auto w-full max-w-[520px]"
    >
      <motion.div
        whileHover="hover"
        initial="rest"
        className="group relative mx-auto aspect-[1.08/1] overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-[0_32px_90px_-48px_rgba(30,86,208,0.42)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(30,86,208,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(148,163,184,0.18),_transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65),transparent_45%,rgba(255,255,255,0.3))]" />
        <motion.div
          variants={{
            rest: { opacity: 0.55, scale: 0.92, filter: "blur(30px)" },
            hover: { opacity: 0.95, scale: 1.08, filter: "blur(52px)" },
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute bottom-2 left-10 right-10 h-24 rounded-full bg-[#1E56D0]/35"
        />
        <motion.div
          variants={{
            rest: { opacity: 0.3, scale: 0.96 },
            hover: { opacity: 0.7, scale: 1.02 },
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute inset-x-8 bottom-6 h-16 rounded-full bg-cyan-200/50 blur-2xl"
        />

        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute rounded-full bg-white/75 blur-[1px]"
            style={{
              width: `${particle.width}px`,
              height: `${particle.height}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{ y: [0, -14, 0], opacity: [0.35, 0.85, 0.35] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="absolute inset-0 p-4 sm:p-6">
          <motion.div
            variants={{
              rest: { scale: 1 },
              hover: { scale: 1.02 },
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative h-full overflow-hidden rounded-[1.6rem] border border-white/70 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.42)]"
          >
            <img
              src={contactImage}
              alt="Professional healthcare collaboration"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.08)_58%,rgba(15,23,42,0.12))]" />
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-xs text-slate-500 backdrop-blur-xl">
          <span>Clinical Light interface</span>
          <span className="font-semibold text-[#1E56D0]">Focused on hover</span>
        </div>
      </motion.div>
    </Tilt>
  );
}

export default function ContactPage() {
  const [formData, setFormData] = useState(initialForm);
  const [submitState, setSubmitState] = useState("idle");

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    if (submitState === "success") {
      setSubmitState("idle");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitState === "loading") {
      return;
    }

    setSubmitState("loading");
    const subject = encodeURIComponent(
      `Contact Inquiry from ${formData.fullName || "ImitiNet Website"}`,
    );
    const body = encodeURIComponent(
      [
        `Full Name: ${formData.fullName}`,
        `Email Address: ${formData.email}`,
        `Role: ${formData.role}`,
        "",
        "Message:",
        formData.message,
      ].join("\n"),
    );

    await new Promise((resolve) => window.setTimeout(resolve, 1600));
    window.location.href = `mailto:jmucyo602@gmail.com?subject=${subject}&body=${body}`;
    setSubmitState("success");
    setFormData(initialForm);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-0 h-[440px] bg-[radial-gradient(circle_at_top_left,_rgba(30,86,208,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.9),_transparent_38%)]" />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#1E56D0]">
              <Plus className="h-4 w-4" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              ImitiNet
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-slate-500 transition-colors hover:text-slate-900">
              Home
            </Link>
            <Link
              to="/about"
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              About
            </Link>
            <span className="border-b-2 border-[#1E56D0] pb-0.5 font-semibold text-[#1E56D0]">
              Contact
            </span>
          </nav>
        </div>
      </header>

      <main className="relative z-10 px-6 py-10 sm:py-14 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#1E56D0] shadow-sm backdrop-blur-xl">
            <Mail className="h-3.5 w-3.5" />
            Contact ImitiNet
          </div>

          <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="rounded-[2rem] border border-white/80 bg-white px-6 py-8 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.18)] sm:px-8 sm:py-10"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Kigali to Every District
              </p>
              <h1 className="mt-4 max-w-xl font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Let&apos;s Build the Future of Rwandan Healthcare.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Bring us your partnership ideas, deployment questions, or platform
                feedback. This experience keeps the interface light, clinical, and
                responsive while adding a tactile 3D focal point.
              </p>

              <div className="mt-10">
                <HeroVisual />
              </div>
            </motion.div>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_28px_80px_-42px_rgba(30,86,208,0.22)] backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    General Inquiry
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">
                    Start the conversation
                  </h2>
                </div>
                <div className="hidden rounded-2xl bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1E56D0] sm:block">
                  Response within 1 business day
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <FloatingField
                  id="fullName"
                  label="Full Name"
                  value={formData.fullName}
                  onChange={updateField("fullName")}
                />
                <FloatingField
                  id="email"
                  type="email"
                  label="Email Address"
                  value={formData.email}
                  onChange={updateField("email")}
                />
                <FloatingField
                  as="select"
                  id="role"
                  label="Role"
                  value={formData.role}
                  onChange={updateField("role")}
                  options={roleOptions}
                />
                <FloatingField
                  as="textarea"
                  id="message"
                  label="Message"
                  value={formData.message}
                  onChange={updateField("message")}
                />

                <div className="pt-2">
                  <motion.button
                    type="submit"
                    disabled={submitState === "loading"}
                    whileTap={{ scale: 0.985 }}
                    className={`flex h-14 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors ${
                      submitState === "success"
                        ? "bg-emerald-500"
                        : "bg-[#1E56D0] hover:bg-[#1848ad]"
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {submitState === "loading" ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <Spinner />
                          Sending
                        </motion.span>
                      ) : submitState === "success" ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-5 w-5" />
                          Message sent
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2"
                        >
                          Send Inquiry
                          <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-slate-500">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <p>
                      ImitiNet operates under strict compliance with the Rwanda
                      Data Protection Law. Please do not submit Patient Health
                      Information (PHI) through this general inquiry form.
                    </p>
                  </div>
                </div>
              </form>
            </motion.section>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 rounded-[2rem] border border-white/70 bg-white/55 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-8"
          >
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1E56D0]">
                    <Mail className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Official Email
                  </p>
                  <a
                    href="mailto:support@imitinet.rw"
                    className="mt-2 block font-display text-2xl font-semibold tracking-tight text-slate-900 transition-colors hover:text-[#1E56D0]"
                  >
                    support@imitinet.rw
                  </a>
                </div>

                <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Headquarters
                  </p>
                  <p className="mt-2 max-w-sm text-base leading-7 text-slate-700">
                    KG 7 Avenue, Nyarutarama Innovation Campus, Kigali, Rwanda
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SocialIcon
                  href="https://x.com"
                  label="ImitiNet on X"
                  className="text-black hover:bg-black hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M18.901 1.153h3.68l-8.04 9.19 9.458 12.504h-7.404l-5.8-7.584-6.636 7.584H.477l8.599-9.826L0 1.153h7.593l5.242 6.932 6.066-6.932Zm-1.291 19.492h2.039L6.486 3.24H4.298Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  href="https://linkedin.com"
                  label="ImitiNet on LinkedIn"
                  className="text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M4.983 3.5C4.983 4.88 3.862 6 2.482 6A2.483 2.483 0 0 1 0 3.5 2.483 2.483 0 0 1 2.482 1c1.38 0 2.5 1.12 2.5 2.5ZM.5 8h3.965v12H.5V8Zm7 0h3.8v1.64h.054c.529-1.004 1.821-2.064 3.748-2.064 4.007 0 4.748 2.638 4.748 6.068V20h-3.96v-5.635c0-1.344-.024-3.073-1.873-3.073-1.875 0-2.161 1.463-2.161 2.975V20H7.5V8Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  href="https://github.com"
                  label="ImitiNet on GitHub"
                  className="text-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M12 .5C5.649.5.5 5.8.5 12.336c0 5.229 3.292 9.664 7.86 11.23.575.11.785-.255.785-.567 0-.279-.011-1.2-.017-2.177-3.197.711-3.872-1.394-3.872-1.394-.523-1.37-1.277-1.735-1.277-1.735-1.044-.733.08-.718.08-.718 1.155.084 1.763 1.231 1.763 1.231 1.026 1.809 2.69 1.286 3.345.983.103-.764.401-1.286.73-1.581-2.552-.299-5.236-1.314-5.236-5.848 0-1.292.447-2.349 1.18-3.177-.119-.299-.512-1.503.111-3.133 0 0 .965-.318 3.162 1.214a10.67 10.67 0 0 1 2.879-.4c.976.004 1.96.138 2.879.4 2.196-1.532 3.16-1.214 3.16-1.214.625 1.63.232 2.834.114 3.133.735.828 1.179 1.885 1.179 3.177 0 4.545-2.688 5.545-5.246 5.838.413.367.781 1.089.781 2.196 0 1.585-.014 2.863-.014 3.253 0 .315.207.682.79.566 4.564-1.568 7.853-6.002 7.853-11.229C23.5 5.8 18.351.5 12 .5Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  href="https://instagram.com"
                  label="ImitiNet on Instagram"
                  className="text-[#E4405F] hover:bg-gradient-to-br hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#515BD4] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 6.85A5.15 5.15 0 1 1 6.85 12 5.16 5.16 0 0 1 12 6.85Zm0 1.8A3.35 3.35 0 1 0 15.35 12 3.36 3.36 0 0 0 12 8.65Z" />
                  </svg>
                </SocialIcon>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
