"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import {
  User,
  GraduationCap,
  Sparkles,
  Smartphone,
  Check,
  Edit3,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Terminal,
  Layers,
  ChevronRight,
  LogOut,
} from "lucide-react";
import confetti from "canvas-confetti";

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
      });
    } catch {}
    setTimeout(() => setCopiedScript(null), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 pb-28 md:pb-12 space-y-8 animate-in fade-in duration-200">
      {/* 1. DIGITAL STUDENT ID CARD */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-2xl">
        {/* Holographic Watermark */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar Badge */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[3px] shadow-2xl ring-4 ring-indigo-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[21px] flex items-center justify-center text-4xl">
                  {profile.avatar}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                Verified Student ID • {profile.batch}
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {profile.full_name}
              </h2>

              <p className="text-sm font-medium text-cyan-300">
                {profile.department}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={onOpenEditModal}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-white transition-all flex items-center gap-2 active:scale-95 shadow-md"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Card Footer with Student UID & Barcode mockup */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
              Campus Hub Identity Key
            </span>
            <code className="text-xs text-indigo-300 font-mono tracking-wider">
              CAMPUS-{profile.id.toUpperCase()}
            </code>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-2xl border border-white/5">
            <QrCode className="w-6 h-6 text-slate-400" />
            <div className="text-[10px] text-slate-400 font-mono">
              [|||| ||| ||||| || |||]
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK STATUS UPDATER */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
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
                className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                  isSelected
                    ? "bg-indigo-600/30 border-cyan-400 text-white ring-2 ring-cyan-400/30 scale-102"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MOBILE & NATIVE EXPORT GUIDE (Capacitor & Android APK / Xcode iOS) */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-indigo-500/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Native Mobile Export Ready (Android APK & iOS)
            </h3>
            <p className="text-xs text-slate-400">
              Structured with CapacitorJS for zero-friction export to Android Studio & Xcode
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The app is built with mobile-first viewport safe-area padding (<code className="text-cyan-300">env(safe-area-inset-top)</code>) and configured for WebRTC video webviews. You can generate native binaries anytime using the pre-configured scripts:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Android Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Android APK (Android Studio)
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    "npx cap add android && npx cap sync && npx cap open android",
                    "android"
                  )
                }
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                {copiedScript === "android" ? "Copied! ✓" : "Copy Command"}
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
              npx cap add android{"\n"}npx cap sync{"\n"}npx cap open android
            </pre>
          </div>

          {/* iOS Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                iOS App (Xcode)
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    "npx cap add ios && npx cap sync && npx cap open ios",
                    "ios"
                  )
                }
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                {copiedScript === "ios" ? "Copied! ✓" : "Copy Command"}
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-slate-950 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
              npx cap add ios{"\n"}npx cap sync{"\n"}npx cap open ios
            </pre>
          </div>
        </div>
      </div>

      {/* 4. ACCOUNT SESSION & LOG OUT */}
      {onSignOut && (
        <div className="rounded-3xl glass-panel p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Active Student Session
              </p>
              <p className="text-[11px] text-slate-400">
                {profile.email || "Authenticated Gmail Session"}
              </p>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 hover:text-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out / Switch Account</span>
          </button>
        </div>
      )}
    </div>
  );
}
