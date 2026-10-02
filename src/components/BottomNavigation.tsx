"use client";

import React from "react";
import { MessageSquare, Video, Users, User, Flame } from "lucide-react";

export type NavTab = "lounge" | "match" | "hangouts" | "profile";

interface BottomNavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveCall?: boolean;
}

export default function BottomNavigation({
  currentTab,
  onTabChange,
  hasActiveCall,
}: BottomNavigationProps) {
  const tabs = [
    {
      id: "lounge" as NavTab,
      label: "Lounge & Feed",
      icon: MessageSquare,
      badge: null,
    },
    {
      id: "match" as NavTab,
      label: "1-on-1 Match",
      icon: Video,
      special: true,
      badge: "LIVE",
    },
    {
      id: "hangouts" as NavTab,
      label: "Hangout Rooms",
      icon: Users,
      badge: "8 Max",
    },
    {
      id: "profile" as NavTab,
      label: "Student ID",
      icon: User,
      badge: null,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe">
      <div className="mx-3 mb-2 rounded-3xl glass-dock border border-slate-700/60 bg-slate-950/90 shadow-2xl p-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center -mt-5 group focus:outline-none"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 text-white scale-105 shadow-purple-500/40 ring-4 ring-purple-500/30"
                      : "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-600/30 hover:scale-105"
                  }`}
                >
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 tracking-tight ${
                    isActive ? "text-indigo-400" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
                {tab.badge && (
                  <span className="absolute -top-1 right-0 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-md animate-bounce">
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? "text-indigo-400 font-semibold bg-white/5"
                  : "text-slate-400 hover:text-slate-200 active:scale-95"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
              <span className="text-[10px] truncate max-w-[70px]">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
