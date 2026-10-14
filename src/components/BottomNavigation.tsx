"use client";

import React from "react";
import { MessageSquare, Video, Users, User, UserCheck, Gamepad2 } from "lucide-react";
import { useUiMode } from "@/context/UiModeContext";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";

export type NavTab = "lounge" | "ludo" | "match" | "hangouts" | "friends" | "profile";

interface BottomNavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveCall?: boolean;
  pendingRequestsCount?: number;
}

export default function BottomNavigation({
  currentTab,
  onTabChange,
  hasActiveCall,
  pendingRequestsCount = 0,
}: BottomNavigationProps) {
  const { isLightUi } = useUiMode();
  const { isDark } = useTheme();

  const tabs = [
    {
      id: "lounge" as NavTab,
      label: "Lounge",
      icon: MessageSquare,
      customIcon: "/images/icon-lounge.png",
      badge: null,
    },
    {
      id: "ludo" as NavTab,
      label: "Ludo",
      icon: Gamepad2,
      badge: "4P",
    },
    {
      id: "match" as NavTab,
      label: "1-on-1 Match",
      icon: Video,
      customIcon: "/images/icon-1on1-match.png",
      special: true,
      badge: "LIVE",
    },
    {
      id: "hangouts" as NavTab,
      label: "Hangouts",
      icon: Users,
      customIcon: "/images/icon-hangouts.png",
      badge: "8 Max",
    },
    {
      id: "friends" as NavTab,
      label: "Friends",
      icon: UserCheck,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : null,
    },
    {
      id: "profile" as NavTab,
      label: "Profile",
      icon: User,
      customIcon: "/images/icon-student-id.png",
      badge: null,
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t transition-all duration-300 pb-safe ${
        !isLightUi
          ? "liquid-glass-docked-bar"
          : isDark
            ? "border-zinc-800/80 bg-zinc-950/98 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.8)]"
            : "border-slate-200/90 bg-white/98 backdrop-blur-2xl shadow-[0_-8px_25px_rgba(0,0,0,0.08)]"
      }`}
    >
      <div className="w-full max-w-lg mx-auto px-1 py-1 flex items-center justify-around relative">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          const useCustomIcon = !isLightUi && Boolean(tab.customIcon);

          if (tab.special) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center -mt-4 group focus:outline-none shrink-0 px-1"
              >
                {/* Center Match CTA: Orange by default, turns dark gray on hover like official UIU site */}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 relative ${
                    isActive
                      ? !isLightUi
                        ? "bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white scale-110 border-2 border-white/40 shadow-orange-500/50 shadow-lg"
                        : "bg-orange-600 text-white scale-105 border-2 border-orange-400 shadow-orange-600/30"
                      : "bg-orange-600 hover:bg-zinc-800 text-white active:scale-95"
                  }`}
                >
                  {/* Subtle liquid glow when in heavy mode */}
                  {!isLightUi && isActive && (
                    <motion.div
                      layoutId="liquid-glass-center-glow"
                      className="absolute -inset-1 rounded-2xl bg-orange-500/30 blur-md -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}

                  {useCustomIcon ? (
                    <img
                      src={tab.customIcon}
                      alt={tab.label}
                      className={`w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow transition-transform ${
                        isActive ? "scale-110 liquid-glass-active-icon" : "group-hover:scale-110"
                      }`}
                    />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>
                <span
                  className={`text-[9.5px] sm:text-[10px] font-semibold mt-1 tracking-tight transition-colors ${
                    isActive
                      ? isDark
                        ? "text-orange-400 font-bold"
                        : "text-orange-600 font-bold"
                      : isDark
                        ? "text-zinc-400 group-hover:text-orange-400"
                        : "text-slate-500 group-hover:text-orange-600"
                  }`}
                >
                  {tab.label}
                </span>
                {tab.badge && (
                  <span className={`absolute -top-1 right-0 px-1 py-0.2 rounded-md text-[7px] sm:text-[8px] font-bold shadow-sm ${
                    isDark
                      ? "bg-zinc-900 border border-orange-500/50 text-orange-400"
                      : "bg-white border border-orange-400 text-orange-600 shadow-sm"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 relative group ${
                isActive
                  ? isLightUi
                    ? isDark
                      ? "text-orange-400 font-semibold bg-zinc-900/80"
                      : "text-orange-600 font-semibold bg-slate-100"
                    : isDark
                      ? "text-white font-bold"
                      : "text-zinc-900 font-bold"
                  : isDark
                    ? "text-zinc-400 hover:text-orange-400 active:scale-95"
                    : "text-slate-500 hover:text-orange-600 active:scale-95"
              }`}
            >
              {/* Liquid Glass morphing backdrop pill when active in Heavy UI */}
              {!isLightUi && isActive && (
                <motion.div
                  layoutId="liquid-glass-tab-mobile"
                  className="absolute inset-0 rounded-xl liquid-glass-pill -z-10 pointer-events-none"
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                />
              )}

              <div className="relative flex items-center justify-center">
                {useCustomIcon ? (
                  <img
                    src={tab.customIcon}
                    alt={tab.label}
                    className={`w-4 h-4 sm:w-5 sm:h-5 object-contain mb-0.5 transition-all duration-200 ${
                      isActive
                        ? "scale-110 liquid-glass-active-icon"
                        : "opacity-85 group-hover:opacity-100 group-hover:scale-105"
                    }`}
                  />
                ) : (
                  <Icon
                    className={`w-4 h-4 mb-0.5 transition-colors ${
                      isActive
                        ? isDark
                          ? "text-orange-400"
                          : "text-orange-600"
                        : isDark
                          ? "text-zinc-400 group-hover:text-orange-400"
                          : "text-slate-500 group-hover:text-orange-600"
                    }`}
                  />
                )}
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[7px] font-extrabold bg-orange-500 text-white leading-none shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] sm:text-[10px] truncate max-w-full">{tab.label}</span>
              {isActive && isLightUi && (
                <span className="w-1 h-1 rounded-full bg-orange-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
