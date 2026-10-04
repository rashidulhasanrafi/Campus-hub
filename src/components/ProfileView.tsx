"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import {
  GraduationCap,
  Sparkles,
  Smartphone,
  Check,
  Edit3,
  QrCode,
  Terminal,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useTheme } from "@/context/ThemeContext";

interface ProfileViewProps {
  profile: UserProfile | null;
  onOpenEditModal: () => void;
  onUpdateStatus: (status: string) => void;
  onSignOut?: () => void;
}

export default function ProfileView({
  profile,
  onOpenEditModal,
  onUpdateStatus,
  onSignOut,
}: ProfileViewProps) {
  const { isDark, toggleTheme } = useTheme();
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  if (!profile) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    try {
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.8 },
        colors: ["#f97316", "#ea580c", "#fbbf24"],
      });
    } catch {}
    setTimeout(() => setCopiedScript(null), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-6 animate-in fade-in duration-150">
      {/* 1. DIGITAL STUDENT ID CARD - Sleek UIU Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 hover:border-orange-500/30 backdrop-blur-md shadow-sm transition-colors">
        {/* Subtle Watermark on ID Card */}
        <img
          src="/images/campus-hub-emblem-tight.png"
          alt=""
          className="absolute -right-8 -bottom-8 w-56 h-auto opacity-[0.06] pointer-events-none select-none filter contrast-125"
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Avatar Badge with StudentAvatar */}
            <StudentAvatar
              avatar={profile.avatar}
              name={profile.full_name}
              size="xl"
              isOnline={profile.is_online !== false}
            />

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[11px] font-semibold border border-orange-500/25">
                <GraduationCap className="w-3.5 h-3.5 text-orange-400" />
                UIU Student ID • {profile.batch}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                {profile.full_name}
              </h2>

              <p className="text-xs font-medium text-zinc-400">
                {profile.department}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-800 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button: Orange by default, turns dark gray on hover */}
          <button
            onClick={onOpenEditModal}
            className="px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-white" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Card Footer with Student UID & Barcode mockup */}
        <div className="mt-6 pt-4 border-t border-zinc-800/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold block">
              UIU Campus Hub Identity Key
            </span>
            <code className="text-xs text-orange-400 font-mono tracking-wider">
              UIU-STUDENT-{profile.id.toUpperCase().slice(0, 14)}
            </code>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <QrCode className="w-5 h-5 text-orange-400" />
            <div className="text-[10px] text-zinc-500 font-mono tracking-widest">
              [|||| ||| ||||| || |||]
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK STATUS UPDATER */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          Broadcast Live Campus Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CAMPUS_STATUS_OPTIONS.map((opt) => {
            const isSelected = profile.status === opt.label;
            return (
              <button
                key={opt.label}
                onClick={async () => {
                  onUpdateStatus(opt.label);
                  await syncProfileWithSupabase({ ...profile, status: opt.label });
                }}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium text-left transition-colors ${
                  isSelected
                    ? "bg-orange-600 hover:bg-zinc-800 border-orange-600 text-white shadow-sm"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 hover:bg-zinc-900"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* THEME PREFERENCE (LIGHT / DARK MODE) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          {isDark ? <Moon className="w-3.5 h-3.5 text-orange-400" /> : <Sun className="w-3.5 h-3.5 text-orange-400" />}
          Display Appearance & Theme
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (isDark) toggleTheme();
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium transition-all ${
              !isDark
                ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:text-orange-400 hover:border-orange-500/40 hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className={`w-4 h-4 ${!isDark ? "text-white" : "text-amber-400"}`} />
              <span className="font-semibold">Light Mode</span>
            </div>
            {!isDark && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          <button
            onClick={() => {
              if (!isDark) toggleTheme();
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium transition-all ${
              isDark
                ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:text-orange-400 hover:border-orange-500/40 hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon className={`w-4 h-4 ${isDark ? "text-white" : "text-orange-400"}`} />
              <span className="font-semibold">Dark Mode</span>
            </div>
            {isDark && <Check className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>

      {/* 3. MOBILE & NATIVE EXPORT GUIDE (Capacitor & Android APK / Xcode iOS) */}
      <div className="rounded-2xl bg-zinc-900/40 p-6 sm:p-7 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Native Mobile Export Ready (Android APK & iOS)
            </h3>
            <p className="text-xs text-zinc-400">
              Structured with CapacitorJS for zero-friction export to Android Studio & Xcode
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          The app is built with mobile-first viewport safe-area padding (<code className="text-zinc-300 font-mono">env(safe-area-inset-top)</code>) and configured for WebRTC video webviews. You can generate native binaries anytime using the pre-configured scripts:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Android Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                Android APK (Android Studio)
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    "npx cap add android && npx cap sync && npx cap open android",
                    "android"
                  )
                }
                className="text-[10px] font-semibold text-zinc-400 hover:text-orange-400 transition-colors"
              >
                {copiedScript === "android" ? "Copied! ✓" : "Copy Command"}
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800/60">
              npx cap add android{"\n"}npx cap sync{"\n"}npx cap open android
            </pre>
          </div>

          {/* iOS Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-orange-400" />
                iOS App (Xcode)
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    "npx cap add ios && npx cap sync && npx cap open ios",
                    "ios"
                  )
                }
                className="text-[10px] font-semibold text-zinc-400 hover:text-orange-400 transition-colors"
              >
                {copiedScript === "ios" ? "Copied! ✓" : "Copy Command"}
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800/60">
              npx cap add ios{"\n"}npx cap sync{"\n"}npx cap open ios
            </pre>
          </div>
        </div>
      </div>

      {/* 4. ACCOUNT SESSION & LOG OUT */}
      {onSignOut && (
        <div className="rounded-xl bg-zinc-900/40 p-4 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
              <LogOut className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">
                Active Student Session
              </p>
              <p className="text-[11px] text-zinc-400">
                {profile.email || "Authenticated UIU Student Session"}
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-500/40 text-xs font-semibold text-zinc-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out / Switch Account</span>
          </button>
        </div>
      )}
    </div>
  );
}
