"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_STATUS_OPTIONS,
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
  Bell,
  BellOff,
  UserCheck,
  Gamepad2,
} from "lucide-react";
import { motion } from "framer-motion";
import { getWhatsAppFeedbackUrl } from "@/config/creator";

interface CampusHeaderProps {
  profile: UserProfile | null;
  onlineCount: number;
  onOpenProfileModal: () => void;
  onStatusChange: (newStatus: string) => void;
  onToggleCallRestriction?: () => void;
  onSignOut?: () => void;
  currentTab?: "lounge" | "ludo" | "match" | "hangouts" | "friends" | "profile";
  onTabChange?: (tab: "lounge" | "ludo" | "match" | "hangouts" | "friends" | "profile") => void;
  pendingRequestsCount?: number;
}

export default function CampusHeader({
  profile,
  onlineCount,
  onOpenProfileModal,
  onStatusChange,
  onToggleCallRestriction,
  onSignOut,
  currentTab,
  onTabChange,
  pendingRequestsCount = 0,
}: CampusHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { uiMode, isLightUi, toggleUiMode } = useUiMode();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const handleSelectStatus = async (statusLabel: string) => {
    if (!profile) return;
    setStatusDropdownOpen(false);
    onStatusChange(statusLabel);
  };

  const desktopNavItems = [
    {
      id: "lounge" as const,
      line1: "Lounge",
      line2: "& Feed",
      icon: MessageSquare,
      customIcon: "/images/icon-lounge.png",
    },
    {
      id: "match" as const,
      line1: "1-on-1",
      line2: "Match",
      badge: "LIVE",
      icon: Video,
      customIcon: "/images/icon-1on1-match.png",
      isProminent: true,
    },
    {
      id: "hangouts" as const,
      label: "Hangouts",
      icon: Users,
      customIcon: "/images/icon-hangouts.png",
    },
    {
      id: "friends" as const,
      label: "Friends",
      icon: UserCheck,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : null,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl pt-safe">
      {/* UIU Orange Accent Strip - Inspired by official UIU web portal header */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500" />

      <div className="w-full px-2 sm:px-3 lg:px-3.5 xl:px-4 h-14 flex items-center justify-between gap-1 sm:gap-1.5 xl:gap-2 max-w-full">
        {/* Brand Logo & UIU Campus Badge - Positioned cleanly in the corner */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            onClick={() => onTabChange && onTabChange("lounge")}
            className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900/90 border border-orange-500/40 p-1 shadow-sm shrink-0 group hover:border-orange-500/70 transition-all cursor-pointer"
            title="UIU Campus Hub"
          >
            <img
              src="/images/campus-hub-icon.png"
              alt="Campus Hub Logo"
              className="w-full h-full object-contain filter drop-shadow-sm transition-transform group-hover:scale-105"
            />
          </div>

          <div
            onClick={() => onTabChange && onTabChange("lounge")}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <div className="flex flex-col leading-[1.05]">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-tight text-zinc-100">
                CAMPUS
              </span>
              <span className="text-[11px] sm:text-xs font-extrabold tracking-tight text-zinc-100">
                HUB
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              UIU
            </span>
          </div>

          {/* PC-only UI Mode Toggle: Same as screenshot (Light / UI stacked + toggle + ON) */}
          <div className="hidden md:flex items-center ml-1 pl-2 border-l border-zinc-800/80">
            <button
              type="button"
              onClick={toggleUiMode}
              title={
                isLightUi
                  ? "Light Mode UI is ON. Click to switch to Heavy Mode UI"
                  : "Heavy Mode UI is ON. Click to switch to Light Mode UI"
              }
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all select-none ${
                isLightUi
                  ? "bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-orange-500/40 hover:text-white"
                  : "bg-orange-500/10 border-orange-500/40 text-orange-400 hover:bg-orange-500/20 shadow-sm"
              }`}
            >
              <div className="flex flex-col text-left leading-[1.05] text-[9px] text-zinc-400 font-semibold">
                <span>Light</span>
                <span>UI</span>
              </div>
              {/* Slider switch */}
              <div
                className={`w-6 h-3 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                  isLightUi ? "bg-orange-500 justify-end" : "bg-zinc-700 justify-start"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
              </div>
              <span
                className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                  isLightUi ? "bg-orange-500/20 text-orange-300" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {isLightUi ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Desktop Navigation & Status Dropdown */}
        <div className="hidden md:flex items-center gap-1 lg:gap-1.5 xl:gap-2 shrink min-w-0">
          {onTabChange && currentTab && (
            <div
              className={`flex items-center gap-1 p-0.5 rounded-lg border transition-all duration-300 relative ${
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
                const isMatch = item.id === "match";
                const Icon = item.icon;
                const useCustom = !isLightUi && Boolean(item.customIcon);

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`relative flex items-center transition-all duration-200 select-none whitespace-nowrap rounded-md ${
                      isMatch
                        ? "gap-1.5 px-3 xl:px-3.5 py-1 xl:py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 shadow-sm"
                        : "gap-1.5 px-2 xl:px-2.5 py-1 text-xs font-medium"
                    } ${
                      isActive
                        ? isLightUi
                          ? isDark
                            ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm font-semibold"
                            : "bg-white text-orange-600 border border-orange-400/40 shadow-sm font-semibold"
                          : isDark
                            ? "text-orange-400 font-bold border border-orange-500/30 bg-orange-500/10 shadow-sm"
                            : "text-orange-600 font-bold border border-orange-400/40 bg-orange-50 shadow-sm"
                        : isDark
                          ? isMatch
                            ? "text-zinc-100 font-medium hover:text-orange-400"
                            : "text-zinc-300 hover:text-orange-400 hover:bg-orange-500/10 active:scale-95"
                          : isMatch
                            ? "text-zinc-900 font-medium hover:text-orange-600"
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
                        alt={item.id}
                        className={`${isMatch ? "w-4 h-4" : "w-3.5 h-3.5"} object-contain shrink-0 transition-transform ${
                          isActive ? "scale-110 liquid-glass-active-icon" : "group-hover:scale-105"
                        }`}
                      />
                    ) : (
                      <Icon className={`${isMatch ? "w-4 h-4 text-orange-400" : "w-3.5 h-3.5"} shrink-0`} />
                    )}

                    {/* Exact 2-line rendering as in screenshot, with 1-on-1 Match slightly larger */}
                    {item.line1 ? (
                      <div className={`flex flex-col text-left leading-[1.05] ${isMatch ? "text-[11px] xl:text-xs" : "text-[10px] xl:text-[11px]"}`}>
                        <span className={isMatch ? "font-bold text-zinc-100" : ""}>{item.line1}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={isMatch ? "font-bold text-zinc-100" : ""}>{item.line2}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-orange-500/25 text-orange-400 border border-orange-500/40 shadow-sm animate-pulse">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] xl:text-[11px] font-medium">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1 py-0.1 rounded text-[7.5px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cross-Platform Ludo Game Arena Link */}
          <button
            type="button"
            onClick={() => onTabChange ? onTabChange("ludo") : (window.location.href = "/games/ludo")}
            title="Play 4-Player Ludo with Voice Chat"
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer ${
              currentTab === "ludo"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-sm shadow-orange-600/30"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Ludo 🎲</span>
          </button>

          {/* Online count badge: Exactly as screenshot */}
          <div
            title={`${onlineCount} student${onlineCount === 1 ? "" : "s"} online`}
            className="flex items-center gap-1 px-1.5 xl:px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-orange-400 transition-colors whitespace-nowrap shrink-0"
          >
            <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-semibold text-zinc-200">{onlineCount}</span>
            <span>online</span>
          </div>

          {/* Quick Status Dropdown: Exactly as screenshot */}
          {profile && (
            <div className="relative shrink-0">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-1 px-1.5 xl:px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 hover:text-orange-400 text-[11px] text-zinc-300 transition-colors"
                title={`Status: ${profile.status}`}
              >
                <span className="truncate max-w-[65px] xl:max-w-[85px] font-medium">
                  {profile.status}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
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

        {/* Right side: Restriction status, feedback, theme toggle, and profile */}
        <div className="flex items-center gap-1 xl:gap-1.5 shrink-0 min-w-0">
          {/* Quick Call Restriction toggle button (Calls / Open 2-line layout) */}
          {profile && onToggleCallRestriction && (
            <button
              onClick={onToggleCallRestriction}
              title={
                profile.call_restricted
                  ? "Call Restriction is ON (Nobody can disturb you with calls). Tap to disable."
                  : "Calls are OPEN. Tap to enable Do Not Disturb."
              }
              className={`flex items-center gap-1 px-1.5 xl:px-2 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 shadow-sm cursor-pointer shrink-0 ${
                profile.call_restricted
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-950/40"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {profile.call_restricted ? (
                <>
                  <BellOff className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                  <div className="flex flex-col text-left leading-[1.05] text-[9px] font-bold text-rose-300">
                    <span>Calls</span>
                    <span>Blocked</span>
                  </div>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex flex-col text-left leading-[1.05] text-[9px] text-zinc-400 font-medium">
                    <span>Calls</span>
                    <span>Open</span>
                  </div>
                </>
              )}
            </button>
          )}

          {/* Online count for Mobile only (Desktop already has it in the center) */}
          <div className="flex md:hidden items-center gap-1 px-1.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 shrink-0">
            <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-medium text-zinc-200">{onlineCount}</span>
          </div>

          {/* Mobile Profile Avatar quick access button */}
          {profile && (
            <button
              type="button"
              onClick={() => (onTabChange ? onTabChange("profile") : onOpenProfileModal())}
              title="Open Student Profile"
              className="flex md:hidden items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <StudentAvatar
                avatar={profile.avatar}
                name={profile.full_name}
                size="sm"
                showOnlineBadge={false}
              />
            </button>
          )}

          {/* Desktop-only action buttons */}
          <div className="hidden md:flex items-center gap-1 xl:gap-1.5 shrink-0">
            {/* PC Mode Dedicated WhatsApp Feedback Button */}
            <a
              href={getWhatsAppFeedbackUrl("general")}
              target="_blank"
              rel="noopener noreferrer"
              title="Send Feedback or Report Bug on WhatsApp"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Feedback</span>
            </a>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle light or dark mode"
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/40 transition-all flex items-center justify-center active:scale-95 shadow-sm shrink-0"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-orange-500 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            {/* Dynamic Profile Button - Same as screenshot, guaranteed to fit without cutoffs! */}
            {profile ? (
              <button
                type="button"
                onClick={() => (onTabChange ? onTabChange("profile") : onOpenProfileModal())}
                title={`Signed in as ${profile.full_name} (${profile.department}) - Click to view full Profile`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-orange-500/40 transition-colors text-left group cursor-pointer shrink-0 max-w-[125px] sm:max-w-[150px] xl:max-w-[180px]"
              >
                <StudentAvatar
                  avatar={profile.avatar}
                  name={profile.full_name}
                  size="sm"
                  showOnlineBadge={false}
                />
                <div className="flex flex-col text-left min-w-0 leading-[1.05]">
                  <span className="text-[11px] xl:text-xs font-semibold text-zinc-200 group-hover:text-orange-400 transition-colors truncate max-w-[55px] sm:max-w-[75px] xl:max-w-[100px]">
                    {profile.full_name}
                  </span>
                  <span className="text-[9px] text-zinc-400 truncate max-w-[55px] sm:max-w-[75px] xl:max-w-[100px] mt-0.5">
                    {profile.batch.split(" ")[0]} • {profile.department.split(" ")[0]}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenProfileModal}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-zinc-800 text-white active:scale-95 transition-all flex items-center gap-1 shadow-sm shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span>Join</span>
              </button>
            )}

            {/* Clean Log Out / Switch Account Button */}
            {onSignOut && profile && (
              <button
                onClick={onSignOut}
                title="Log Out / Switch Account"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-colors flex items-center justify-center active:scale-95 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
