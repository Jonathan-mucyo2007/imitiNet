import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Plus,
  UserRound,
} from "lucide-react";
import Tilt from "react-parallax-tilt";
import { useNavigate, useParams } from "react-router-dom";
import loginBackground from "../../assets/login.jfif";
import { useAuth } from "../../store/AuthContext";

const roleConfig = {
  "Patient Portal": {
    apiRole: "patient",
    loginLabel: "Patient",
    registerLabel: "patient",
  },
  "Pharmacy/Hospital Portal": {
    apiRole: "pharmacy",
    loginLabel: "Pharmacy",
    registerLabel: "pharmacy",
  },
  "Umwishingizi Portal": {
    apiRole: "insurer",
    loginLabel: "Umwishingizi",
    registerLabel: "umwishingizi",
  },
  "Regulator Dashboard": {
    apiRole: "regulator",
    loginLabel: "Regulator",
    registerLabel: "regulator",
  },
};

const containerVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const faceVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const initialLoginForm = {
  email: "",
  password: "",
};

const initialRegisterForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  nationalId: "",
  facilityId: "",
};

function translateErrorMessage(message) {
  const translations = {
    "Invalid credentials": "Amakuru winjije si yo.",
    "Email already exists": "Iyi imeri isanzwe ibaho.",
    "Account does not belong to this portal":
      "Iyi konti ntijyanye n'uru rubuga wahisemo.",
    "Passwords do not match": "Amagambo banga ntabwo ahura.",
    "National ID is required for patients":
      "National ID irakenewe ku murwayi.",
    "Facility ID is required for this role":
      "Facility ID irakenewe kuri uru ruhare.",
    "Unable to create account": "Ntibikunze gukora konti nshya.",
    "Unable to log in right now": "Kwinjira ntibikunze ubu.",
    "Unable to register user": "Kwiyandikisha ntibikunze ubu.",
  };

  return translations[message] || message || "Habaye ikibazo, ongera ugerageze.";
}

function ImitiNetLogo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Plus className="h-4 w-4" />
      </div>
      <p className="font-display text-[2rem] font-semibold tracking-tight text-blue-600">
        ImitiNet
      </p>
    </div>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  name,
  showPasswordToggle = false,
  isPasswordVisible = false,
  onTogglePasswordVisibility,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
        <input
          name={name}
          type={showPasswordToggle ? (isPasswordVisible ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {showPasswordToggle ? (
          <button
            type="button"
            onClick={onTogglePasswordVisibility}
            className="text-slate-400 transition hover:text-slate-600"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </label>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { login, register } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const decodedRole = decodeURIComponent(role || "");
  const currentRole = roleConfig[decodedRole];
  const apiRole = currentRole?.apiRole || "patient";
  const displayRole = currentRole?.loginLabel || "Patient";
  const isPatient = apiRole === "patient";
  const needsFacility = apiRole === "pharmacy" || apiRole === "insurer";

  const loginTitle = useMemo(() => `Kwinjira nka ${displayRole}`, [displayRole]);

  useEffect(() => {
    setLoginForm(initialLoginForm);
    setRegisterForm(initialRegisterForm);
    setErrorMessage("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
  }, [decodedRole]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  };

  const navigateToDashboard = (nextRole) => {
    navigate(`/dashboard/${nextRole}`);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { user } = await login({ ...loginForm, role: apiRole });
      setLoginForm(initialLoginForm);
      setShowLoginPassword(false);
      navigateToDashboard(user.role);
    } catch (error) {
      setErrorMessage(
        translateErrorMessage(error?.response?.data?.message || "Invalid credentials")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setErrorMessage(translateErrorMessage("Passwords do not match"));
      return;
    }

    if (isPatient && !registerForm.nationalId.trim()) {
      setErrorMessage(translateErrorMessage("National ID is required for patients"));
      return;
    }

    if (needsFacility && !registerForm.facilityId.trim()) {
      setErrorMessage(translateErrorMessage("Facility ID is required for this role"));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: registerForm.email,
        password: registerForm.password,
        role: apiRole,
        nationalId: isPatient ? registerForm.nationalId : undefined,
        facilityId: needsFacility ? registerForm.facilityId : undefined,
      };

      const { user } = await register(payload);
      setRegisterForm(initialRegisterForm);
      setShowRegisterPassword(false);
      setShowConfirmPassword(false);
      navigateToDashboard(user.role);
    } catch (error) {
      setErrorMessage(
        translateErrorMessage(error?.response?.data?.message || "Unable to create account")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <img
        src={loginBackground}
        alt="ImitiNet login background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex h-full w-full items-center justify-center px-5 py-10"
      >
        <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Subira inyuma
          </button>
        </div>

        <div className="[perspective:1200px]">
          <Tilt
            tiltMaxAngleX={7}
            tiltMaxAngleY={7}
            perspective={1000}
            scale={1.01}
            transitionSpeed={1600}
            gyroscope={false}
            className="rounded-3xl"
          >
            <motion.div
              animate={{ rotateY: isRegisterMode ? 180 : 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[500px] w-[min(88vw,380px)] [transform-style:preserve-3d] sm:h-[520px] sm:w-[380px]"
            >
              <div className="absolute inset-0 [backface-visibility:hidden]">
                <div className="flex h-full flex-col rounded-2xl bg-white px-6 py-7 shadow-[0_30px_90px_rgba(15,23,42,0.32)] sm:px-7 sm:py-8">
                  <ImitiNetLogo />

                  <AnimatePresence mode="wait">
                    <motion.form
                      key={`login-${decodedRole}`}
                      variants={faceVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      onSubmit={handleLogin}
                      autoComplete="off"
                      className="mt-8 flex h-full flex-col"
                    >
                      <div className="text-center">
                        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                          {loginTitle}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Injira ku rubuga rwa ImitiNet ukoresheje amakuru yawe.
                        </p>
                      </div>

                      <div className="mt-6 space-y-4">
                        <Field
                          label="Imeri"
                          name="email"
                          value={loginForm.email}
                          onChange={handleLoginChange}
                          placeholder="imeyili@urugero.rw"
                          type="email"
                          icon={Mail}
                        />
                        <Field
                          label="Ijambobanga"
                          name="password"
                          value={loginForm.password}
                          onChange={handleLoginChange}
                          placeholder="Ijambobanga"
                          type="password"
                          icon={LockKeyhole}
                          showPasswordToggle
                          isPasswordVisible={showLoginPassword}
                          onTogglePasswordVisibility={() =>
                            setShowLoginPassword((current) => !current)
                          }
                        />
                      </div>

                      <div className="mt-4 text-right">
                        <button
                          type="button"
                          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                        >
                          Wibagiwe ijambobanga?
                        </button>
                      </div>

                      {errorMessage ? (
                        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                          {errorMessage}
                        </p>
                      ) : null}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? "Birimo..." : "Injira"}
                      </motion.button>

                      <p className="mt-5 text-center text-sm text-slate-500">
                        Nta konti ufite?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage("");
                            setIsRegisterMode(true);
                            setLoginForm(initialLoginForm);
                            setShowLoginPassword(false);
                          }}
                          className="font-semibold text-blue-600 transition hover:text-blue-700"
                        >
                          Iyandikishe
                        </button>
                      </p>
                    </motion.form>
                  </AnimatePresence>
                </div>
              </div>

              <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <div className="flex h-full flex-col rounded-2xl bg-white px-6 py-6 shadow-[0_30px_90px_rgba(15,23,42,0.32)] sm:px-7 sm:py-7">
                  <ImitiNetLogo />

                  <AnimatePresence mode="wait">
                    <motion.form
                      key={`register-${decodedRole}`}
                      variants={faceVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      onSubmit={handleRegister}
                      autoComplete="off"
                      className="mt-6 flex h-full min-h-0 flex-col"
                    >
                      <div className="text-center">
                        <h1 className="font-display text-[1.55rem] font-semibold tracking-tight text-slate-900">
                          Iyandikishe kurubuga
                        </h1>
                        <p className="mt-1.5 text-sm leading-5 text-slate-500">
                          Fungura konti nshya ya {currentRole?.registerLabel || "user"} kuri ImitiNet.
                        </p>
                      </div>

                      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                        <Field
                          label="Amazina"
                          name="name"
                          value={registerForm.name}
                          onChange={handleRegisterChange}
                          placeholder="Andika amazina yawe"
                          icon={UserRound}
                        />
                        <Field
                          label="Imeri"
                          name="email"
                          value={registerForm.email}
                          onChange={handleRegisterChange}
                          placeholder="imeyili@urugero.rw"
                          type="email"
                          icon={Mail}
                        />
                        {isPatient ? (
                          <Field
                            label="National ID"
                            name="nationalId"
                            value={registerForm.nationalId}
                            onChange={handleRegisterChange}
                            placeholder="Andika National ID"
                          />
                        ) : null}
                        {needsFacility ? (
                          <Field
                            label="Facility ID"
                            name="facilityId"
                            value={registerForm.facilityId}
                            onChange={handleRegisterChange}
                            placeholder="Andika Facility ID"
                          />
                        ) : null}
                        <Field
                          label="Ijambobanga"
                          name="password"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          placeholder="Ijambobanga"
                          type="password"
                          icon={LockKeyhole}
                          showPasswordToggle
                          isPasswordVisible={showRegisterPassword}
                          onTogglePasswordVisibility={() =>
                            setShowRegisterPassword((current) => !current)
                          }
                        />
                        <Field
                          label="Emeza ijambobanga"
                          name="confirmPassword"
                          value={registerForm.confirmPassword}
                          onChange={handleRegisterChange}
                          placeholder="Ongera wandike ijambobanga"
                          type="password"
                          icon={LockKeyhole}
                          showPasswordToggle
                          isPasswordVisible={showConfirmPassword}
                          onTogglePasswordVisibility={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                        />
                      </div>

                      {errorMessage ? (
                        <p className="mt-3 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                          {errorMessage}
                        </p>
                      ) : null}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-4 w-full shrink-0 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? "Birimo..." : "Iyandikishe"}
                      </motion.button>

                      <p className="mt-4 shrink-0 text-center text-sm text-slate-500">
                        Ufite konti?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage("");
                            setIsRegisterMode(false);
                            setRegisterForm(initialRegisterForm);
                            setShowRegisterPassword(false);
                            setShowConfirmPassword(false);
                          }}
                          className="font-semibold text-blue-600 transition hover:text-blue-700"
                        >
                          Kwinjira
                        </button>
                      </p>
                    </motion.form>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </Tilt>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;
