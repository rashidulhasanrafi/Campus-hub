"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase, UIU_PROGRAMS } from "@/lib/supabase";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Video,
  User,
  MessageSquare,
  Users,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";
import confetti from "canvas-confetti";

interface AuthScreenProps {
  onAuthSuccess: () => void;
  initialInfo?: string;
  initialLoginInput?: string;
  onStartBusTransition?: () => void;
  onCancelBusTransition?: () => void;
  isBusTransitionActive?: boolean;
}

export default function AuthScreen({
  onAuthSuccess,
  initialInfo = "",
  initialLoginInput = "",
  onStartBusTransition,
  onCancelBusTransition,
  isBusTransitionActive = false,
}: AuthScreenProps) {
  // Core Login State
  const [loginInput, setLoginInput] = useState(initialLoginInput);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState(initialInfo);

  useEffect(() => {
    if (initialInfo) setInfoMessage(initialInfo);
  }, [initialInfo]);

  useEffect(() => {
    if (initialLoginInput) setLoginInput(initialLoginInput);
  }, [initialLoginInput]);

  // Auth Modes: "login" | "otp" | "register" | "forgot"
  const [authMode, setAuthMode] = useState<"login" | "otp" | "register" | "forgot">("login");

  // Registration State
  const [regName, setRegName] = useState("");
  const [regGender, setRegGender] = useState<"male" | "female">("male");
  const [regEmail, setRegEmail] = useState("");
  const [regId, setRegId] = useState("");
  const [regDept, setRegDept] = useState(UIU_PROGRAMS[0]);
  const [regBatch, setRegBatch] = useState("2024");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // OTP Verification State
  const [otpTargetEmail, setOtpTargetEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Real-time Online Students Counter
  const [realtimeOnline, setRealtimeOnline] = useState<number>(0);

  // Subscribe to real-time presence & query live count
  useEffect(() => {
    let isMounted = true;

    const fetchLiveCount = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_online", true);

        if (!error && typeof count === "number" && count > 0 && isMounted) {
          setRealtimeOnline(count);
        } else if (isMounted) {
          setRealtimeOnline(0);
        }
      } catch {
        if (isMounted) {
          setRealtimeOnline(0);
        }
      }
    };

    fetchLiveCount();

    // Supabase Realtime Presence Channel
    const presenceChannel = supabase.channel("campus_global_presence", {
      config: {
        presence: {
          key: `visitor_${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    });

    presenceChannel.on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const liveKeys = Object.keys(state);
      if (liveKeys.length > 0 && isMounted) {
        setRealtimeOnline(liveKeys.length);
      }
    });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            device: "web",
          });
        } catch {}
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP box when entering OTP mode
  useEffect(() => {
    if (authMode === "otp") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [authMode]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    const fullOtp = otpDigits.join("");
    if (fullOtp.length === 6 && !otpDigits.includes("")) {
      handleVerifyOtp(fullOtp);
    }
  }, [otpDigits]);

  // Helper to normalize email from email or Student ID
  const normalizeIdentifier = (val: string): string => {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return "";
    if (trimmed.includes("@")) return trimmed;
    const cleanId = trimmed.replace(/\s+/g, "");
    return `${cleanId}@bscse.uiu.ac.bd`;
  };

  // Check if an email belongs to official UIU student domain (@*.uiu.ac.bd or @uiu.ac.bd)
  const isOfficialUiuEmail = (emailStr: string): boolean => {
    const trimmed = emailStr.trim().toLowerCase();
    if (!trimmed) return false;
    return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?uiu\.ac\.bd$/.test(trimmed);
  };

  // Primary Login Submit (Facebook Structure)
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const targetEmail = normalizeIdentifier(loginInput);
    if (!targetEmail) {
      setErrorMessage("Please enter your Student Email or Student ID.");
      return;
    }

    if (!isOfficialUiuEmail(targetEmail)) {
      setErrorMessage("Not a valid email! Please login with your official UIU student email (@*.uiu.ac.bd).");
      return;
    }

    setLoading(true);
    try {
      if (password.trim()) {
        onStartBusTransition?.();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password.trim(),
        });

        if (!error && data.session) {
          triggerSuccessConfetti();
          onAuthSuccess();
          return;
        }

        if (error) {
          onCancelBusTransition?.();
          console.warn("Password login failed, offering OTP fallback:", error.message);
          setErrorMessage(error.message || "Invalid credentials. Try logging in via OTP passcode.");
          setLoading(false);
          return;
        }
      }

      // If password is blank, send OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (otpError) throw otpError;

      setOtpTargetEmail(targetEmail);
      setAuthMode("otp");
      setResendCooldown(30);
      setInfoMessage(`6-digit passcode dispatched to ${targetEmail}`);
    } catch (err: unknown) {
      onCancelBusTransition?.();
      const error = err as Error;
      console.error("Login Error:", error);
      if (error.message?.includes("uiu.ac.bd") || error.message?.includes("Only official UIU")) {
        setErrorMessage("Not a valid email! Please login with your official UIU student email (@*.uiu.ac.bd).");
      } else {
        setErrorMessage(error.message || "Failed to log in. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct OTP Send Trigger
  const handleSendOtp = async (customEmail?: string) => {
    const targetEmail = normalizeIdentifier(customEmail || loginInput || otpTargetEmail);
    if (!targetEmail) {
      setErrorMessage("Please enter a valid student email or ID.");
      return;
    }

    if (!isOfficialUiuEmail(targetEmail)) {
      setErrorMessage("Not a valid email! Please login with your official UIU student email (@*.uiu.ac.bd).");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setOtpTargetEmail(targetEmail);
      setAuthMode("otp");
      setResendCooldown(30);
      setInfoMessage(`6-digit passcode dispatched to ${targetEmail}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const token = codeToVerify || otpDigits.join("");
    if (token.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit passcode.");
      return;
    }

    onStartBusTransition?.();
    setLoading(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpTargetEmail,
        token,
        type: "email",
      });

      if (error) throw error;

      if (data.session) {
        triggerSuccessConfetti();
        onAuthSuccess();
      } else {
        throw new Error("Verification completed, but session was not returned.");
      }
    } catch (err: unknown) {
      onCancelBusTransition?.();
      const error = err as Error;
      console.error("OTP verification error:", error);
      setErrorMessage(error.message || "Invalid or expired passcode. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    const targetEmail = normalizeIdentifier(regEmail || regId);
    if (!targetEmail || !regName.trim()) {
      setErrorMessage("Please fill in your name and student email/ID.");
      return;
    }

    if (!isOfficialUiuEmail(targetEmail)) {
      setErrorMessage("Not a valid email! Please register with your official UIU student email (@*.uiu.ac.bd).");
      return;
    }

    onStartBusTransition?.();
    setLoading(true);
    const assignedAvatar =
      regGender === "female"
        ? "/images/avatar-female.png"
        : "/images/avatar-male.png";

    try {
      if (regPassword.trim().length >= 6) {
        const { data, error } = await supabase.auth.signUp({
          email: targetEmail,
          password: regPassword.trim(),
          options: {
            data: {
              full_name: regName.trim(),
              gender: regGender,
              department: regDept,
              batch: regBatch,
              student_id: regId.trim(),
              avatar: assignedAvatar,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          triggerSuccessConfetti();
          onAuthSuccess();
          return;
        }
      }

      // Fallback to OTP verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: regName.trim(),
            gender: regGender,
            department: regDept,
            batch: regBatch,
            student_id: regId.trim(),
            avatar: assignedAvatar,
          },
        },
      });

      if (otpError) throw otpError;

      setOtpTargetEmail(targetEmail);
      setAuthMode("otp");
      setResendCooldown(30);
      setInfoMessage(`Verification code sent to ${targetEmail} to complete registration.`);
    } catch (err: unknown) {
      onCancelBusTransition?.();
      const error = err as Error;
      if (error.message?.includes("uiu.ac.bd") || error.message?.includes("Only official UIU")) {
        setErrorMessage("Not a valid email! Please register with your official UIU student email (@*.uiu.ac.bd).");
      } else {
        setErrorMessage(error.message || "Registration failed. Please check inputs.");
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP Digits Handling
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const clean = value.replace(/\D/g, "").slice(0, 6);
      if (clean.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = clean[i] || "";
        }
        setOtpDigits(newDigits);
        const lastFilledIndex = Math.min(clean.length, 5);
        inputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    const cleanDigit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = cleanDigit;
    setOtpDigits(newDigits);

    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const triggerSuccessConfetti = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ea580c", "#f97316", "#fbbf24"],
      });
    } catch {}
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#0f172a] via-[#090d16] to-[#020617] text-slate-100 selection:bg-orange-600 selection:text-white transition-all duration-500 ${
        isBusTransitionActive
          ? "filter grayscale contrast-125 brightness-75 pointer-events-none"
          : ""
      }`}
    >
      {/* ================================================================= */}
      {/* 1. SEAMLESS AMBIENT GLOWS & BACKGROUND BLEND                      */}
      {/* ================================================================= */}
      {/* Top-left vibrant UIU orange radial aura */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-orange-600/15 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none"
      />
      {/* Bottom-right subtle orange aura */}
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-40 w-[550px] h-[550px] bg-gradient-to-tl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none"
      />
      {/* Center blending light bridge */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-radial from-orange-600/8 via-transparent to-transparent blur-3xl pointer-events-none"
      />
      {/* Subtle modern dot-grid matrix texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
      />

      {/* ================================================================= */}
      {/* 2. MAIN CONTAINER: EXPANDED FULL-SCREEN REGISTER OR SPLIT-SCREEN  */}
      {/* ================================================================= */}
      <main
        className={`relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 ${
          authMode === "register"
            ? "flex items-center justify-center"
            : "flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14"
        }`}
      >
        {authMode === "register" ? (
          /* =============================================================== */
          /* EXPANDED FULL-SCREEN REGISTRATION CARD                          */
          /* =============================================================== */
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-3xl lg:max-w-4xl mx-auto rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-black/60 p-6 sm:p-10 my-auto"
          >
            {/* Top Bar with Back Button & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                      Create UIU Hub Account
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      Official UIU
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Connect with fellow UIU students, live study lounges, and academic discussions
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setInfoMessage("");
                  setAuthMode("login");
                }}
                className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-orange-400 border border-slate-700/60 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Log In</span>
              </button>
            </div>

            {/* Error & Info Alerts */}
            {errorMessage && (
              <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs sm:text-sm text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs sm:text-sm text-orange-300 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Registration Form with Larger Inputs & 2-Column Grid */}
            <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 1. Full Name */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Full Name <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                    />
                  </div>
                </div>

                {/* 2. Student ID */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Student ID <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regId}
                      onChange={(e) => setRegId(e.target.value)}
                      placeholder="e.g. 011 221 000"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                    />
                  </div>
                </div>

                {/* 3. Program / Department */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Academic Program / Department
                  </label>
                  <select
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all cursor-pointer"
                  >
                    {UIU_PROGRAMS.map((program) => (
                      <option
                        key={program}
                        value={program}
                        className="bg-slate-900 text-slate-100 py-1"
                      >
                        {program}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Batch Year */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Batch Year
                  </label>
                  <input
                    type="text"
                    value={regBatch}
                    onChange={(e) => setRegBatch(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                  />
                </div>

                {/* 5. Gender Selection (Full Width across both cols) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Gender & Campus Profile Avatar
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setRegGender("male")}
                      className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border text-sm sm:text-base font-semibold transition-all cursor-pointer ${
                        regGender === "male"
                          ? "bg-orange-500/15 border-orange-500 text-orange-400 ring-2 ring-orange-500/30"
                          : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <img
                        src="/images/avatar-male.png"
                        alt="Male"
                        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-orange-500/40"
                      />
                      <span>Male Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegGender("female")}
                      className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border text-sm sm:text-base font-semibold transition-all cursor-pointer ${
                        regGender === "female"
                          ? "bg-orange-500/15 border-orange-500 text-orange-400 ring-2 ring-orange-500/30"
                          : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <img
                        src="/images/avatar-female.png"
                        alt="Female"
                        className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-orange-500/40"
                      />
                      <span>Female Student</span>
                    </button>
                  </div>
                </div>

                {/* 6. Official UIU Student Email */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Official UIU Student Email <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. yourname@bscse.uiu.ac.bd"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                    />
                  </div>
                  {/* Quick Domain Pill helper */}
                  {regEmail && !regEmail.includes("@") && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setRegEmail(`${regEmail.trim().replace(/\s+/g, "")}@bscse.uiu.ac.bd`)}
                        className="text-xs text-slate-400 hover:text-orange-400 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                      >
                        +{regEmail.trim().replace(/\s+/g, "")}@bscse.uiu.ac.bd
                      </button>
                    </div>
                  )}

                  {/* Realtime warning if not uiu email */}
                  {regEmail && regEmail.includes("@") && !regEmail.trim().toLowerCase().endsWith("uiu.ac.bd") && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Not a valid email! Please use your official UIU student email (@*.uiu.ac.bd).</span>
                    </div>
                  )}
                </div>

                {/* 7. Password - NO "(Optional)", WITH Eye icon toggle */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create a password (min 6 characters) or leave blank for OTP"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                      aria-label={showRegPassword ? "Hide password" : "Show password"}
                    >
                      {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-base sm:text-lg shadow-xl shadow-orange-600/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Creating UIU Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sign Up & Verify UIU Account</span>
                  </>
                )}
              </button>

              {/* Bottom Switch to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setInfoMessage("");
                    setAuthMode("login");
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Already have an account? <span className="text-orange-400 font-semibold underline">Log In</span>
                </button>
              </div>

              {/* Meta-Style Clean Footer Brand */}
              <div className="pt-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 border-t border-slate-800/60">
                <ShieldCheck className="w-4 h-4 text-orange-400/80" />
                <span>United International University • Official UIU Campus Hub Network</span>
              </div>
            </form>
          </motion.div>
        ) : (
          <>
            {/* =============================================================== */}
            {/* LEFT COLUMN: HERO SHOWCASE WITH BIGGER ANIMATED LOGO & ORBIT     */}
            {/* =============================================================== */}
            <div className="w-full lg:w-7/12 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          {/* Facebook-style Big Expressive Headline (Clean, no upper badge pill) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-2 max-w-xl"
          >
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
              Explore the campus life <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                you love.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Meet fellow UIUians in real-time, join live audio/video study hangouts, and match 1-on-1 with verified campus peers.
            </p>
          </motion.div>

          {/* ============================================================= */}
          {/* NATIVE CONTINUOUS FLOATING CAMPUS HUB EMBLEM & INTERACTIVE CARDS */}
          {/* ============================================================= */}
          <div className="relative w-full max-w-[760px] lg:max-w-[820px] h-[520px] sm:h-[580px] flex items-center justify-center my-2 select-none">
            {/* ----------------------------------------------------------- */}
            {/* CENTRAL CAMPUS HUB LOGO (TRANSPARENT PNG, CONTINUOUS FLOAT)  */}
            {/* ----------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{
                opacity: 1,
                scale: [1, 1.018, 1],
                y: [-8, 8, -8],
                rotate: [-0.5, 0.5, -0.5],
              }}
              transition={{
                opacity: { duration: 0.8, ease: "easeOut" },
                scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              }}
              className="relative z-10 flex items-center justify-center select-none pointer-events-none"
            >
              {/* Very soft ambient orange glow directly behind the central emblem (transparent radial) */}
              <div className="absolute w-[440px] sm:w-[560px] h-[360px] sm:h-[440px] rounded-full bg-orange-500/15 blur-3xl pointer-events-none -z-10" />

              <img
                src="/images/campus-hub-emblem-tight.png"
                alt="UIU Campus Hub"
                className="w-[480px] sm:w-[620px] md:w-[720px] lg:w-[780px] max-w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(234,88,12,0.32)] select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>

            {/* ----------------------------------------------------------- */}
            {/* FLOATING CAMPUS HANGOUT & STUDY CARDS                       */}
            {/* ----------------------------------------------------------- */}

            {/* Card 1: "Canteen Adda" (Top-Left Outer) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: [-6, 6, -6],
                x: [-3, 3, -3],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.2 },
                y: { repeat: Infinity, duration: 4.4, ease: "easeInOut" },
                x: { repeat: Infinity, duration: 5.2, ease: "easeInOut" },
              }}
              className="absolute -top-3 sm:-top-2 left-1 sm:left-4 z-20 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-black/40"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-sm shadow-inner">
                ☕
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100">Canteen Adda</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Active • 6 peers banter
                </span>
              </div>
            </motion.div>

            {/* Card 2: "Study Jam" (Top-Center Inner, above central emblem) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: 1,
                y: [4, -6, 4],
                x: [2, -3, 2],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.3 },
                y: { repeat: Infinity, duration: 5.0, ease: "easeInOut" },
                x: { repeat: Infinity, duration: 6.0, ease: "easeInOut" },
              }}
              className="absolute -top-4 sm:-top-3 left-[52%] sm:left-[54%] -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-lg shadow-black/40"
            >
              <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[11px]">
                📚
              </div>
              <span className="text-[11px] font-medium text-slate-200">Exam Prep & Group Notes</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                <Users className="w-3 h-3" />
                <span>Study Jam</span>
              </span>
            </motion.div>

            {/* Card 3: "Live 1-on-1" (Top-Right Outer) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: 1,
                y: [-7, 7, -7],
                x: [2, -2, 2],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.4 },
                y: { repeat: Infinity, duration: 5.2, ease: "easeInOut" },
                x: { repeat: Infinity, duration: 4.6, ease: "easeInOut" },
              }}
              className="absolute top-1 sm:top-2 right-1 sm:right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-black/40"
            >
              <div className="w-7 h-7 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
                <Video className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100">Live 1-on-1</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Campus Roulette</span>
              </div>
            </motion.div>

            {/* Card 4: "Campus Video Call" with animated sound wave spectrum (Left-Center) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: [1, 1.02, 1],
                y: [-5, 5, -5],
                x: [-2, 3, -2],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.35 },
                scale: { repeat: Infinity, duration: 4.6, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 4.8, ease: "easeInOut" },
                x: { repeat: Infinity, duration: 5.4, ease: "easeInOut" },
              }}
              className="absolute -left-2 sm:left-1 top-[30%] sm:top-[32%] z-20 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-2xl shadow-black/50 text-left"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Video className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-slate-100">Campus Video Call</span>
              </div>
              {/* Audio Waveform Spectrum Bars */}
              <div className="flex items-center gap-1 h-5 my-1 px-0.5">
                {[35, 75, 50, 95, 65, 85, 45, 90, 40].map((h, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      height: [`${h * 0.35}%`, `${h}%`, `${h * 0.35}%`],
                    }}
                    transition={{
                      duration: 0.75 + (idx % 4) * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.08,
                    }}
                    className="w-1 rounded-full bg-gradient-to-t from-cyan-500 via-teal-400 to-emerald-400 shadow-sm shadow-cyan-500/30"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-slate-300">5 Online Students</span>
              </div>
            </motion.div>

            {/* Card 5: "Student Chat" with active avatar (Right-Center) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: [1, 1.02, 1],
                y: [6, -6, 6],
                x: [3, -2, 3],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.45 },
                scale: { repeat: Infinity, duration: 5.0, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 4.4, ease: "easeInOut" },
                x: { repeat: Infinity, duration: 5.8, ease: "easeInOut" },
              }}
              className="absolute -right-2 sm:right-1 top-[28%] sm:top-[30%] z-20 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-2xl shadow-black/50 flex items-center gap-2.5 text-left"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 p-[1.5px] shadow-md shadow-orange-500/20">
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                    👨‍🎓
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100 block">Student Chat</span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-orange-400" />
                  <span>&quot;See you at library! 👋&quot;</span>
                </span>
              </div>
            </motion.div>

            {/* Card 6: "Code Jam" (Bottom-Left Outer) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: 1,
                y: [6, -6, 6],
                x: [3, -3, 3],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.5 },
                repeat: Infinity,
                duration: 4.8,
                ease: "easeInOut",
              }}
              className="absolute -bottom-3 sm:-bottom-1 left-1 sm:left-4 z-20 flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-black/40"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-inner">
                💻
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100">Code Jam</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    DSA
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Study Room • 4 coding
                </span>
              </div>
            </motion.div>

            {/* Card 7: "Chit Chat" orange speech pill (Bottom-Right Inner) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: [-5, 5, -5],
                scale: [1, 1.06, 1],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.55 },
                y: { repeat: Infinity, duration: 3.8, ease: "easeInOut" },
                scale: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
              }}
              className="absolute bottom-16 sm:bottom-20 right-16 sm:right-28 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[11px] font-bold shadow-lg shadow-orange-600/30 border border-orange-400/40 select-none"
            >
              <span>Chit Chat</span>
              <span>💬</span>
            </motion.div>

            {/* ----------------------------------------------------------- */}
            {/* DRIFTING REACTION BADGES                                    */}
            {/* ----------------------------------------------------------- */}

            {/* Reaction: Haha (😆) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                y: [-8, 8, -8],
                rotate: [-8, 8, -8],
              }}
              transition={{
                opacity: { duration: 0.5, delay: 0.3 },
                y: { repeat: Infinity, duration: 3.6, ease: "easeInOut" },
                rotate: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
              }}
              className="absolute top-16 left-28 sm:left-36 z-30 w-9 h-9 rounded-full bg-slate-900/90 border border-amber-400/40 shadow-lg shadow-amber-500/20 flex items-center justify-center text-lg backdrop-blur-md cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              title="Haha Reaction"
            >
              😆
            </motion.div>

            {/* Reaction: Heart Love (❤️) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: [1, 1.15, 1],
                y: [-8, 8, -8],
              }}
              transition={{
                opacity: { duration: 0.5, delay: 0.4 },
                scale: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 3.6, ease: "easeInOut" },
              }}
              className="absolute bottom-24 sm:bottom-28 right-2 sm:right-6 z-30 w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 border border-rose-400/50 shadow-lg shadow-rose-600/40 flex items-center justify-center text-base backdrop-blur-md cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              title="Heart Reaction"
            >
              ❤️
            </motion.div>

            {/* Reaction: Thumbs Up (👍) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                y: [7, -7, 7],
                rotate: [6, -6, 6],
              }}
              transition={{
                opacity: { duration: 0.5, delay: 0.5 },
                y: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
                rotate: { repeat: Infinity, duration: 4.8, ease: "easeInOut" },
              }}
              className="absolute bottom-6 sm:bottom-8 right-32 sm:right-44 z-30 w-8 h-8 rounded-full bg-slate-900/90 border border-orange-500/40 shadow-lg shadow-orange-500/20 flex items-center justify-center text-sm backdrop-blur-md cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              title="Thumbs Up Reaction"
            >
              👍
            </motion.div>

            {/* ----------------------------------------------------------- */}
            {/* REAL-TIME ONLINE STUDENTS BADGE                             */}
            {/* ----------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: [-4, 4, -4],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.6 },
                y: { repeat: Infinity, duration: 3.8, ease: "easeInOut" },
              }}
              className="absolute -bottom-3 sm:-bottom-1 left-48 sm:left-56 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 backdrop-blur-md"
              title="Real-time students online"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span className="text-emerald-400 font-extrabold">{realtimeOnline}</span>
                <span>Students Online</span>
              </span>
            </motion.div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT COLUMN: AUTH CARD (FACEBOOK STRUCTURE + UIU ORANGE ACCENT) */}
        {/* =============================================================== */}
        <div className="w-full lg:w-5/12 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px] rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-2xl p-6 sm:p-8 space-y-5"
          >
            {/* Card Header */}
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                {authMode === "otp" ? "Verify Passcode" : "Log in to Campus Hub"}
              </h2>
              <p className="text-xs text-slate-400">
                {authMode === "otp"
                  ? `Enter the 6-digit passcode sent to ${otpTargetEmail}`
                  : "Connect with verified UIU students & study lounges"}
              </p>
            </div>

            {/* Error & Info Alerts */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-300 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* =========================================================== */}
            {/* VIEW A: STANDARD FACEBOOK-STYLE LOGIN FORM                  */}
            {/* =========================================================== */}
            {authMode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* 1. Student Email / Student ID Field */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="Student Email or Student ID"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950/70 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                    />
                  </div>
                  {/* Quick Domain Pill helper if user types a name without @ */}
                  {loginInput && !loginInput.includes("@") && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setLoginInput(`${loginInput.trim().replace(/\s+/g, "")}@bscse.uiu.ac.bd`)}
                        className="text-[10px] text-slate-400 hover:text-orange-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 transition-colors"
                      >
                        +{loginInput.trim().replace(/\s+/g, "")}@bscse.uiu.ac.bd
                      </button>
                    </div>
                  )}

                  {/* Realtime warning if a non-UIU email is typed */}
                  {loginInput && loginInput.includes("@") && !loginInput.trim().toLowerCase().endsWith("uiu.ac.bd") && (
                    <div className="flex items-center gap-1.5 mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Not a valid email! Please login with your official UIU student email (@*.uiu.ac.bd).</span>
                    </div>
                  )}
                </div>

                {/* 2. Password Field with Visibility Toggle */}
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (leave blank for Email OTP)"
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-slate-950/70 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 3. Primary "Log In" Button: Solid UIU Orange, Rounded-lg, Font-semibold */}
                <button
                  type="submit"
                  disabled={loading || !loginInput.trim()}
                  className="w-full py-3 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-sm shadow-lg shadow-orange-600/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Log In</span>
                  )}
                </button>

                {/* 4. "Forgotten password?" Link in Muted Gray Hovering to Orange */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (loginInput.trim()) {
                        handleSendOtp(loginInput);
                      } else {
                        setAuthMode("forgot");
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-orange-400 hover:underline transition-colors"
                  >
                    Forgotten password?
                  </button>
                </div>

                {/* 5. Clean Subtle Divider Rule */}
                <div className="pt-2 pb-1">
                  <div className="border-t border-slate-800" />
                </div>

                {/* 6. Prominent "Create new account" Button (Facebook-Style in UIU Orange Accent) */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setInfoMessage("");
                      setAuthMode("register");
                    }}
                    className="px-6 py-2.5 rounded-lg border-2 border-orange-500/80 hover:bg-orange-500/10 text-orange-400 hover:text-orange-300 font-semibold text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Create new account
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartBusTransition?.()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-orange-600/20 text-slate-400 hover:text-orange-400 border border-slate-800 hover:border-orange-500/40 text-[11px] font-semibold transition-all cursor-pointer mt-1"
                  >
                    <span>🚌</span>
                    <span>Preview UIU Bus Transition</span>
                  </button>
                </div>
              </form>
            )}

            {/* =========================================================== */}
            {/* VIEW B: 6-DIGIT OTP VERIFICATION                            */}
            {/* =========================================================== */}
            {authMode === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-300 truncate">
                      {otpTargetEmail}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setOtpDigits(["", "", "", "", "", ""]);
                      setErrorMessage("");
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-orange-400 flex items-center gap-1 shrink-0 ml-2 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Change
                  </button>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-11 sm:w-12 h-13 rounded-xl bg-slate-950 border text-center text-lg font-bold text-slate-100 focus:outline-none transition-all ${
                        digit
                          ? "border-orange-500 ring-2 ring-orange-500/30"
                          : "border-slate-800 focus:border-orange-500"
                      }`}
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <button
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.includes("")}
                  className="w-full py-3 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-sm shadow-lg shadow-orange-600/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Passcode...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Enter Campus</span>
                    </>
                  )}
                </button>

                {/* Resend Cooldown */}
                <div className="text-center pt-1 space-y-1">
                  {resendCooldown > 0 ? (
                    <p className="text-xs text-slate-400">
                      Resend code in{" "}
                      <span className="font-semibold text-orange-400">{resendCooldown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSendOtp(otpTargetEmail)}
                      className="text-xs font-medium text-slate-400 hover:text-orange-400 transition-colors"
                    >
                      Didn&apos;t receive code? Resend Email
                    </button>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Check spam or promotions folder if code does not appear.
                  </p>
                </div>
              </div>
            )}



            {/* =========================================================== */}
            {/* VIEW D: FORGOT PASSWORD / OTP DISPATCH                      */}
            {/* =========================================================== */}
            {authMode === "forgot" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Enter your UIU student email or student ID to receive a 6-digit login passcode.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="Student Email or ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/25"
                  />
                </div>

                <button
                  onClick={() => handleSendOtp(loginInput)}
                  disabled={loading || !loginInput.trim()}
                  className="w-full py-2.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-semibold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Send Verification Passcode</span>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="text-xs text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    Back to Log In
                  </button>
                </div>
              </div>
            )}

            {/* Meta-Style Clean Footer Brand */}
            <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 border-t border-slate-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400/80" />
              <span>United International University • UIU Campus Hub</span>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </main>

      {/* Footer copyright */}
      <footer className="relative z-10 w-full text-center py-4 text-[11px] text-slate-500">
        © {new Date().getFullYear()} UIU Campus Hub. Built for United International University students.
      </footer>
    </div>
  );
}
