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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-zinc-950 text-white">
      {/* Subtle Ambient Background Highlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800/80 p-6 sm:p-8 bg-zinc-900/60 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CAMPUS SOCIAL HUB
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
              {step === "email" ? "Sign In to Campus" : "Verify Gmail Code"}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              {step === "email"
                ? "Connect with fellow students via 1-on-1 random video match & multi-peer study rooms."
                : `Enter the 6-digit passcode dispatched to your inbox.`}
            </p>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        {step === "email" && (
          <div className="flex items-center justify-center gap-2 flex-wrap py-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Video className="w-3 h-3 text-zinc-400" />
              1-on-1 Random Match
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Users className="w-3 h-3 text-zinc-400" />
              8-Peer Hangouts
            </span>
          </div>
        )}

        {/* Error / Info Alerts */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Your Gmail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Quick Domain Suggestion */}
            {email && !email.includes("@") && (
              <button
                type="button"
                onClick={() => setEmail(`${email}@gmail.com`)}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
              >
                Auto-complete: <span className="underline">{email}@gmail.com</span>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Passcode...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Development Preview Bypass Button */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
                Quick Test
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={handleDevBypass}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-semibold text-xs transition-colors flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Continue as Guest (Dev Preview)</span>
              <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Bypass
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Passwordless secure login via Supabase Auth</span>
            </div>
          </form>
        ) : (
          /* STEP 2: 6-DIGIT OTP VERIFICATION */
          <div className="space-y-4">
            {/* Target Email Chip & Edit Button */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-medium text-zinc-300 truncate">
                  {email}
                </span>
              </div>
              <button
                onClick={() => {
                  setStep("email");
                  setOtpDigits(["", "", "", "", "", ""]);
                  setErrorMessage("");
                }}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1 shrink-0 ml-2"
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
                  className={`w-11 sm:w-12 h-13 rounded-xl bg-zinc-900 border text-center text-lg font-bold text-zinc-100 focus:outline-none transition-colors ${
                    digit
                      ? "border-zinc-400 ring-1 ring-zinc-400/20"
                      : "border-zinc-800 focus:border-zinc-600"
                  }`}
                />
              ))}
            </div>

            {/* Manual Verify Button */}
            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.includes("")}
              className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs shadow-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Enter Campus</span>
                </>
              )}
            </button>

            {/* Resend Code Options */}
            <div className="text-center pt-1">
              {resendCooldown > 0 ? (
                <p className="text-xs text-zinc-400">
                  Resend code in <span className="font-semibold text-zinc-200">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendCode()}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Didn&apos;t receive code? Resend Email
                </button>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">
                Check spam/promotions tab if it does not appear immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
