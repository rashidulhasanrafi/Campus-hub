"use client";

import React, { useState, useRef, useEffect } from "react";
import { supabase, setDevPreview } from "@/lib/supabase";
import {
  Sparkles,
  Mail,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Video,
  Users,
  Radio,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onBypassDev?: () => void;
}

export default function AuthScreen({ onAuthSuccess, onBypassDev }: AuthScreenProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // References for 6 OTP input boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    const fullOtp = otpDigits.join("");
    if (fullOtp.length === 6 && !otpDigits.includes("")) {
      handleVerifyOtp(fullOtp);
    }
  }, [otpDigits]);

  const validateGmail = (input: string): boolean => {
    const trimmed = input.trim().toLowerCase();
    // Allow any valid email, specifically emphasizing gmail / university domains
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");

    let normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      normalizedEmail = `${normalizedEmail}@gmail.com`;
      setEmail(normalizedEmail);
    }

    if (!validateGmail(normalizedEmail)) {
      setErrorMessage("Please enter a valid Gmail address (e.g. yourname@gmail.com).");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }

      setStep("otp");
      setResendCooldown(30);
      setInfoMessage(`6-digit code dispatched to ${normalizedEmail}`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error sending OTP:", error);
      setErrorMessage(error.message || "Failed to send verification code. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    setDevPreview(true);
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#06b6d4", "#6366f1"],
      });
    } catch {}
    if (onBypassDev) {
      onBypassDev();
    } else {
      onAuthSuccess();
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of complete 6-digit code
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

    // Single digit input
    const cleanDigit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = cleanDigit;
    setOtpDigits(newDigits);

    // Auto focus next box
    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (tokenToVerify?: string) => {
    const token = tokenToVerify || otpDigits.join("");
    if (token.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
        onAuthSuccess();
      } else {
        throw new Error("Verification completed but session could not be established.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error verifying OTP:", error);
      setErrorMessage(error.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#0b0f19] text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl glass-dock border border-slate-700/60 p-6 sm:p-8 bg-slate-950/90 shadow-2xl space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[2px] shadow-xl shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              CAMPUS SOCIAL HUB
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {step === "email" ? "Sign In to Campus" : "Verify Gmail Code"}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {step === "email"
                ? "Connect with fellow students via 1-on-1 random video match & multi-peer study rooms."
                : `Enter the 6-digit passcode dispatched to your inbox.`}
            </p>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        {step === "email" && (
          <div className="flex items-center justify-center gap-2 flex-wrap py-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-slate-900/90 border border-slate-800 text-slate-300">
              <Video className="w-3 h-3 text-rose-400" />
              1-on-1 Omegle Match
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-slate-900/90 border border-slate-800 text-slate-300">
              <Users className="w-3 h-3 text-cyan-400" />
              8-Peer Hangouts
            </span>
          </div>
        )}

        {/* Error / Info Alerts */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Gmail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@gmail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {/* Quick Domain Suggestion */}
            {email && !email.includes("@") && (
              <button
                type="button"
                onClick={() => setEmail(`${email}@gmail.com`)}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                Auto-complete: <span className="underline">{email}@gmail.com</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Passcode...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Development Preview Bypass Button */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Quick Test
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleDevBypass}
              className="w-full py-3 rounded-2xl bg-slate-900/90 hover:bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-bold text-xs shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] group cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Continue as Guest (Dev Preview)</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Bypass
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passwordless secure login via Supabase Auth</span>
            </div>
          </form>
        ) : (
          /* STEP 2: 6-DIGIT OTP VERIFICATION */
          <div className="space-y-5">
            {/* Target Email Chip & Edit Button */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {email}
                </span>
              </div>
              <button
                onClick={() => {
                  setStep("email");
                  setOtpDigits(["", "", "", "", "", ""]);
                  setErrorMessage("");
                }}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0 ml-2"
              >
                <Edit2 className="w-3 h-3" />
                Change
              </button>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
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
                  className={`w-11 sm:w-12 h-14 rounded-2xl bg-slate-900 border text-center text-xl font-black text-white focus:outline-none transition-all ${
                    digit
                      ? "border-cyan-400 ring-2 ring-cyan-400/20 bg-slate-900"
                      : "border-slate-700/80 focus:border-indigo-500"
                  }`}
                />
              ))}
            </div>

            {/* Manual Verify Button (in addition to auto-submit) */}
            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.includes("")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Enter Campus</span>
                </>
              )}
            </button>

            {/* Resend Code Options */}
            <div className="text-center pt-2">
              {resendCooldown > 0 ? (
                <p className="text-xs text-slate-400">
                  Resend code in <span className="font-bold text-white">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendCode()}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Didn&apos;t receive code? Resend Email
                </button>
              )}
              <p className="text-[10px] text-slate-500 mt-1">
                Be sure to check your spam / promotions tab if it does not appear immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
