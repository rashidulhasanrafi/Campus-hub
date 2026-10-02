"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import {
  Sparkles,
  Wifi,
  ChevronDown,
  User,
  Sliders,
  Bell,
  Check,
  LogOut,
} from "lucide-react";

interface CampusHeaderProps {
  profile: UserProfile | null;
  onlineCount: number;
  onOpenProfileModal: () => void;
  onStatusChange: (newStatus: string) => void;
  onSignOut?: () => void;
}

export default function CampusHeader({
  profile,
  onlineCount,
  onOpenProfileModal,
  onStatusChange,
  onSignOut,
}: CampusHeaderProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const handleSelectStatus = async (statusLabel: string) => {
    if (!profile) return;
    setStatusDropdownOpen(false);
    onStatusChange(statusLabel);
    const updated = { ...profile, status: statusLabel };
    await syncProfileWithSupabase(updated);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 bg-slate-950/80 backdrop-blur-xl pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Campus Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CAMPUS HUB
              </h1>
              <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
              {profile?.id === "dev-preview-user" && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ⚡ GUEST PREVIEW
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-none">
              Real-time Video & Social Lounge
            </p>
          </div>
        </div>

        {/* Center: Online Student Counter & Status Pill */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">{onlineCount}</span> students online
          </div>

          {/* Quick Status Dropdown */}
          {profile && (
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 hover:bg-indigo-900/50 transition-colors"
              >
                <span className="truncate max-w-[130px] font-medium">{profile.status}</span>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-dock p-2 border border-slate-700/60 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Update Campus Status
                  </div>
                  <div className="space-y-1">
                    {CAMPUS_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleSelectStatus(opt.label)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                          profile.status === opt.label
                            ? "bg-indigo-600/30 text-white font-medium border border-indigo-500/30"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {profile.status === opt.label && (
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User Profile Chip / Onboarding Trigger */}
        <div className="flex items-center gap-2">
          {profile ? (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow-md ring-2 ring-indigo-400/30 group-hover:ring-indigo-400/60 transition-all">
                {profile.avatar}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  <span className="truncate max-w-[100px]">{profile.full_name}</span>
                </div>
                <div className="text-[10px] text-indigo-300/80 truncate max-w-[110px]">
                  {profile.batch.split(" ")[0]} • {profile.department.split(" ")[0]}
                </div>
              </div>
              <Sliders className="w-3.5 h-3.5 text-slate-400 hidden sm:block group-hover:text-white transition-colors" />
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Join Campus
            </button>
          )}

          {/* Clean Log Out / Switch Account Button */}
          {onSignOut && profile && (
            <button
              onClick={onSignOut}
              title="Log Out / Switch Account"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-full bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all flex items-center gap-1.5 text-xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-medium text-[11px]">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
