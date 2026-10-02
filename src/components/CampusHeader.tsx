"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Sparkles,
  Wifi,
  ChevronDown,
  User,
  Sliders,
  Check,
  LogOut,
  MessageSquare,
  Video,
  Users,
} from "lucide-react";

interface CampusHeaderProps {
  profile: UserProfile | null;
  onlineCount: number;
  onOpenProfileModal: () => void;
  onStatusChange: (newStatus: string) => void;
  onSignOut?: () => void;
  currentTab?: "lounge" | "match" | "hangouts" | "profile";
  onTabChange?: (tab: "lounge" | "match" | "hangouts" | "profile") => void;
}

export default function CampusHeader({
  profile,
  onlineCount,
  onOpenProfileModal,
  onStatusChange,
  onSignOut,
  currentTab,
  onTabChange,
}: CampusHeaderProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const handleSelectStatus = async (statusLabel: string) => {
    if (!profile) return;
    setStatusDropdownOpen(false);
    onStatusChange(statusLabel);
    const updated = { ...profile, status: statusLabel };
    await syncProfileWithSupabase(updated);
  };

  const desktopNavItems = [
    { id: "lounge" as const, label: "Lounge & Feed", icon: MessageSquare },
    { id: "match" as const, label: "1-on-1 Match", icon: Video, badge: "LIVE" },
    { id: "hangouts" as const, label: "Hangouts", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand Logo & Campus Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-zinc-950"></span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-tight text-zinc-100">
              CAMPUS HUB
            </h1>
            <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            {profile?.id === "dev-preview-user" && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                GUEST PREVIEW
              </span>
            )}
          </div>
        </div>

        {/* Center: Desktop Navigation & Online Pill */}
        <div className="hidden md:flex items-center gap-3">
          {onTabChange && currentTab && (
            <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-lg border border-zinc-800">
              {desktopNavItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-800 text-zinc-100 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="font-medium text-zinc-200">{onlineCount}</span> online
          </div>

          {/* Quick Status Dropdown */}
          {profile && (
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 transition-colors"
              >
                <span className="truncate max-w-[120px] text-xs font-medium">{profile.status}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-zinc-900 border border-zinc-800 p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Status
                  </div>
                  <div className="space-y-0.5">
                    {CAMPUS_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleSelectStatus(opt.label)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          profile.status === opt.label
                            ? "bg-zinc-800 text-zinc-100 font-medium"
                            : "text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {profile.status === opt.label && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User Profile Chip & Log Out */}
        <div className="flex items-center gap-2">
          {profile ? (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-left group"
            >
              <StudentAvatar
                avatar={profile.avatar}
                name={profile.full_name}
                size="sm"
                showOnlineBadge={false}
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-zinc-200 leading-tight">
                  <span className="truncate max-w-[100px]">{profile.full_name}</span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                  {profile.batch.split(" ")[0]} • {profile.department.split(" ")[0]}
                </div>
              </div>
              <Sliders className="w-3 h-3 text-zinc-500 hidden sm:block group-hover:text-zinc-300 transition-colors" />
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
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
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-1.5 text-xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline font-medium text-[11px]">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
