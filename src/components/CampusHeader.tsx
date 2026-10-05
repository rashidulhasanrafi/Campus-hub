"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import { useTheme } from "@/context/ThemeContext";
import { useUiMode } from "@/context/UiModeContext";
import {
  Wifi,
  ChevronDown,
  User,
  Sliders,
  Check,
  LogOut,
  MessageSquare,
  Video,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { motion } from "framer-motion";

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
  const { isDark, toggleTheme } = useTheme();
  const { uiMode, isLightUi, toggleUiMode } = useUiMode();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const handleSelectStatus = async (statusLabel: string) => {
    if (!profile) return;
    setStatusDropdownOpen(false);
    onStatusChange(statusLabel);
    const updated = { ...profile, status: statusLabel };
    await syncProfileWithSupabase(updated);
  };

  const desktopNavItems = [
    {
      id: "lounge" as const,
      label: "Lounge & Feed",
      icon: MessageSquare,
      customIcon: "/images/icon-lounge.png",
    },
    {
      id: "match" as const,
      label: "1-on-1 Match",
      icon: Video,
      customIcon: "/images/icon-1on1-match.png",
      badge: "LIVE",
    },
    {
      id: "hangouts" as const,
      label: "Hangouts",
      icon: Users,
      customIcon: "/images/icon-hangouts.png",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl pt-safe">
      {/* UIU Orange Accent Strip - Inspired by official UIU web portal header */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand Logo & UIU Campus Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900/90 border border-orange-500/40 p-1 shadow-sm shrink-0 group hover:border-orange-500/70 transition-all">
            <img
              src="/images/campus-hub-icon.png"
              alt="Campus Hub Logo"
              className="w-full h-full object-contain filter drop-shadow-sm transition-transform group-hover:scale-105"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">
                CAMPUS HUB
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                UIU
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wide hidden xs:inline">
              United International University
            </span>
          </div>

          {/* PC-only UI Mode Toggle: App logo shathe thakbe */}
          <div className="hidden md:flex items-center ml-2 pl-3 border-l border-zinc-800/80">
            <button
              type="button"
              onClick={toggleUiMode}
              title={
                isLightUi
                  ? "Light Mode UI is ON (Clean vector icons). Click to switch to Heavy Mode UI (Custom illustrated 3D icons)"
                  : "Heavy Mode UI is ON (Custom illustrated 3D icons). Click to switch to Light Mode UI (Clean vector icons)"
              }
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all select-none ${
                isLightUi
                  ? "bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white"
                  : "bg-orange-500/10 border-orange-500/40 text-orange-400 hover:bg-orange-500/20 shadow-sm shadow-orange-500/10"
              }`}
            >
              <span className="text-[10px] tracking-tight text-zinc-400 font-medium">Light UI</span>
              {/* Slider switch */}
              <div
                className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                  isLightUi ? "bg-orange-500 justify-end" : "bg-zinc-700 justify-start"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
              </div>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                  isLightUi ? "bg-orange-500/20 text-orange-300" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {isLightUi ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Desktop Navigation (Options turn Orange on hover like photo) & Online Pill */}
        <div className="hidden md:flex items-center gap-3">
          {onTabChange && currentTab && (
            <div
              className={`flex items-center gap-1 p-1 rounded-lg border transition-all duration-300 relative ${
                !isLightUi
                  ? isDark
                    ? "bg-zinc-950/80 border-white/10 backdrop-blur-xl shadow-lg shadow-black/40"
                    : "bg-slate-100/90 border-slate-200 backdrop-blur-xl shadow-sm"
                  : isDark
                    ? "bg-zinc-900/90 border-zinc-800"
                    : "bg-slate-100 border-slate-200"
              }`}
            >
              {desktopNavItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                const useCustom = !isLightUi && Boolean(item.customIcon);

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 select-none ${
                      isActive
                        ? isLightUi
                          ? isDark
                            ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm"
                            : "bg-white text-orange-600 border border-orange-400/40 shadow-sm font-semibold"
                          : isDark
                            ? "text-white font-bold"
                            : "text-zinc-900 font-bold"
                        : isDark
                          ? "text-zinc-300 hover:text-orange-400 hover:bg-orange-500/10 active:scale-95"
                          : "text-slate-600 hover:text-orange-600 hover:bg-orange-500/10 active:scale-95"
                    }`}
                  >
                    {!isLightUi && isActive && (
                      <motion.div
                        layoutId="desktop-liquid-glass"
                        className="absolute inset-0 rounded-md liquid-glass-pill -z-10 pointer-events-none"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 30,
                          mass: 0.8,
                        }}
                      />
                    )}

                    {useCustom ? (
                      <img
                        src={item.customIcon}
                        alt={item.label}
                        className={`w-4 h-4 object-contain shrink-0 transition-transform ${
                          isActive ? "scale-110 liquid-glass-active-icon" : "group-hover:scale-105"
                        }`}
                      />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-orange-400 transition-colors">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="font-medium text-zinc-200">{onlineCount}</span> online
          </div>

          {/* Quick Status Dropdown (Options turn Orange on hover) */}
          {profile && (
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 hover:text-orange-400 text-xs text-zinc-300 transition-colors"
              >
                <span className="truncate max-w-[120px] text-xs font-medium">{profile.status}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-zinc-900 border border-zinc-800 p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Campus Status
                  </div>
                  <div className="space-y-0.5">
                    {CAMPUS_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleSelectStatus(opt.label)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          profile.status === opt.label
                            ? "bg-zinc-800 text-orange-400 font-medium border border-orange-500/30"
                            : "text-zinc-300 hover:text-orange-400 hover:bg-orange-500/10"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {profile.status === opt.label && (
                          <Check className="w-3 h-3 text-orange-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Theme Toggle, User Profile Chip & Log Out (Desktop Only - mobile actions exist in Student ID tab) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle light or dark mode"
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/40 transition-all flex items-center justify-center active:scale-95 shadow-sm"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-orange-500 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {profile ? (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-orange-500/40 transition-colors text-left group"
            >
              <StudentAvatar
                avatar={profile.avatar}
                name={profile.full_name}
                size="sm"
                showOnlineBadge={false}
              />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors leading-tight">
                  <span className="truncate max-w-[100px]">{profile.full_name}</span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                  {profile.batch.split(" ")[0]} • {profile.department.split(" ")[0]}
                </div>
              </div>
              <Sliders className="w-3 h-3 text-zinc-500 hidden sm:block group-hover:text-orange-400 transition-colors" />
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-zinc-800 text-white active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              Join UIU Hub
            </button>
          )}

          {/* Clean Log Out / Switch Account Button */}
          {onSignOut && profile && (
            <button
              onClick={onSignOut}
              title="Log Out / Switch Account"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-colors flex items-center gap-1.5 text-xs active:scale-95"
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
