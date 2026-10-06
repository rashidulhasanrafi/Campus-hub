"use client";

import React from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import {
  GraduationCap,
  Sparkles,
  Check,
  Edit3,
  QrCode,
  LogOut,
  Sun,
  Moon,
  User,
  BookOpen,
  Calendar,
  Mail,
  FileText,
  Sliders,
  MessageSquare,
  Video,
  Users,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useUiMode } from "@/context/UiModeContext";
import { getWhatsAppFeedbackUrl } from "@/config/creator";

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
  const { isLightUi, toggleUiMode, setUiMode } = useUiMode();

  if (!profile) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-32 sm:pb-36 md:pb-12 space-y-5 animate-in fade-in duration-150">
      {/* 1. TOP HEADER: UIU Student Profile */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shrink-0 overflow-hidden">
            {!isLightUi ? (
              <img
                src="/images/icon-student-id.png"
                alt="Student ID"
                className="w-6 h-6 object-contain"
              />
            ) : (
              <GraduationCap className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
              UIU Student Profile
            </h1>
            <p className="text-[11px] text-zinc-400">
              Verified campus identity & live student status
            </p>
          </div>
        </div>
      </div>

      {/* 2. DIGITAL STUDENT ID CARD - Sleek UIU Badge */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 hover:border-orange-500/30 backdrop-blur-md shadow-sm transition-colors">
        {/* Subtle Watermark on ID Card - Hidden in Light UI to avoid GPU rendering on low-end phones */}
        {!isLightUi && (
          <img
            src="/images/campus-hub-emblem-tight.png"
            alt=""
            className="absolute -right-8 -bottom-8 w-56 h-auto opacity-[0.06] pointer-events-none select-none filter contrast-125"
          />
        )}

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
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

          {/* Quick UI Mode Switch directly inside Student ID Card (Mobile & Desktop) */}
          <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={toggleUiMode}
              title={
                isLightUi
                  ? "Light Mode UI is ON (Dynamic 720p 30fps video calls, no background logos, zero overheat on 2GB RAM phones). Tap to switch to Heavy Mode UI."
                  : "Heavy Mode UI is ON (3D illustrated icons, ambient watermarks). Tap to switch to Light Mode UI."
              }
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                isLightUi
                  ? "bg-orange-500/15 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/30"
                  : "bg-zinc-800/90 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-600"
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-orange-400" />
                  {isLightUi ? "Light UI (Active)" : "Heavy UI (Active)"}
                </span>
                <span className="text-[9px] text-zinc-400 font-normal">
                  {isLightUi ? "Max 720p 30fps • 0 Heat" : "3D Icons • Unrestricted"}
                </span>
              </div>
              <div
                className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ml-1 ${
                  isLightUi ? "bg-orange-500 justify-end" : "bg-zinc-700 justify-start"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              </div>
            </button>
          </div>
        </div>

        {/* Card Footer with Student UID & Barcode mockup */}
        <div className="mt-5 pt-4 border-t border-zinc-800/70 flex flex-col sm:flex-row items-center justify-between gap-3">
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

      {/* 3. STUDENT PROFILE INFORMATION BREAKDOWN */}
      <div className="rounded-2xl bg-zinc-900/40 p-4 sm:p-5 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-orange-400" />
            Student Profile Details
          </h3>
          <button
            onClick={onOpenEditModal}
            className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <User className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block">Full Name</span>
              <span className="text-zinc-200 font-medium">{profile.full_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <BookOpen className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block">Academic Program</span>
              <span className="text-zinc-200 font-medium">{profile.department}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block">Batch / Class Year</span>
              <span className="text-zinc-200 font-medium">{profile.batch}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <Mail className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-500 block">Student Email</span>
              <span className="text-zinc-200 font-medium truncate block max-w-[200px]">
                {profile.email || `${profile.id}@bscse.uiu.ac.bd`}
              </span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-2.5 text-xs">
            <FileText className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-zinc-500 block">Campus Interest / Bio</span>
              <p className="text-zinc-300 leading-relaxed">{profile.bio}</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. BROADCAST LIVE CAMPUS STATUS */}
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

      {/* 5. THEME PREFERENCE (LIGHT / DARK MODE) */}
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

      {/* 5B. UI & PERFORMANCE MODE (LIGHT MODE UI vs HEAVY MODE UI) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              Performance & UI Mode (Light UI)
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Optimized for Android WebView & 2GB RAM phones (prevents overheating)
            </p>
          </div>
          <button
            type="button"
            onClick={toggleUiMode}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
              isLightUi
                ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                : "bg-orange-500/15 border-orange-500/40 text-orange-400"
            }`}
          >
            <span>{isLightUi ? "Light UI: ON" : "Light UI: OFF (Heavy)"}</span>
            <div
              className={`w-6 h-3 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                isLightUi ? "bg-orange-500 justify-end" : "bg-zinc-700 justify-start"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Heavy UI Option */}
          <button
            type="button"
            onClick={() => {
              if (isLightUi) setUiMode("heavy");
            }}
            className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
              !isLightUi
                ? "bg-orange-600/15 border-orange-500 text-white shadow-sm ring-1 ring-orange-500/30"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-1.5">
                <img
                  src="/images/icon-lounge.png"
                  alt="Lounge"
                  className="w-5 h-5 object-contain"
                />
                <img
                  src="/images/icon-1on1-match.png"
                  alt="1-on-1 Match"
                  className="w-5 h-5 object-contain"
                />
                <img
                  src="/images/icon-hangouts.png"
                  alt="Hangouts"
                  className="w-5 h-5 object-contain"
                />
                <img
                  src="/images/icon-student-id.png"
                  alt="Student ID"
                  className="w-5 h-5 object-contain"
                />
              </div>
              {!isLightUi && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">Heavy Mode UI (Default)</span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Custom 3D illustrated icons, ambient background watermark, maximum desktop fidelity.
              </span>
            </div>
          </button>

          {/* Light Mode UI Option */}
          <button
            type="button"
            onClick={() => {
              if (!isLightUi) setUiMode("light");
            }}
            className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
              isLightUi
                ? "bg-orange-600/15 border-orange-500 text-white shadow-sm ring-1 ring-orange-500/30"
                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 hover:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2 text-orange-400">
                <MessageSquare className="w-4 h-4" />
                <Video className="w-4 h-4" />
                <Users className="w-4 h-4" />
                <User className="w-4 h-4" />
              </div>
              {isLightUi && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Light Mode UI <span className="text-orange-400 text-[10px] font-bold">★ Zero Overheat</span>
              </span>
              <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                Dynamic max 720p @ 30fps video calls, no background logos or heavy blurs. Smooth for 2GB RAM phones.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 6. FEEDBACK & BUG REPORT (DIRECT WHATSAPP CHAT) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-emerald-950/25 via-zinc-900/60 to-zinc-900/40 border border-emerald-500/25 hover:border-emerald-500/40 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  Feedback & Bug Report
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  WhatsApp Direct
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Facing any problem or have suggestions for improvements? Message directly on WhatsApp!
              </p>
            </div>
          </div>

          <a
            href={getWhatsAppFeedbackUrl("bug")}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>Message on WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 7. ACCOUNT SESSION & LOG OUT */}
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
              <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                {profile.email || `${profile.id}@bscse.uiu.ac.bd`}
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
