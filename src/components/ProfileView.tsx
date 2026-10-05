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
} from "lucide-react";
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

  if (!profile) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-5 pb-32 sm:pb-36 md:pb-12 space-y-5 animate-in fade-in duration-150">
      {/* 1. TOP HEADER: UIU Student Profile */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-sm shrink-0">
            <GraduationCap className="w-5 h-5" />
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
        {/* Subtle Watermark on ID Card */}
        <img
          src="/images/campus-hub-emblem-tight.png"
          alt=""
          className="absolute -right-8 -bottom-8 w-56 h-auto opacity-[0.06] pointer-events-none select-none filter contrast-125"
        />

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

      {/* 6. ACCOUNT SESSION & LOG OUT */}
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
