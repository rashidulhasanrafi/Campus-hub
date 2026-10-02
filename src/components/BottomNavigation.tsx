"use client";

import React from "react";
import { MessageSquare, Video, Users, User } from "lucide-react";

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
      label: "Lounge",
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
      label: "Hangouts",
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
      <div className="mx-3 mb-2 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          if (tab.special) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center -mt-4 group focus:outline-none"
              >
                {/* Center Match CTA: Orange by default, turns dark gray on hover like official UIU site */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                    isActive
                      ? "bg-orange-600 text-white scale-105 border-2 border-orange-400 shadow-orange-600/30"
                      : "bg-orange-600 hover:bg-zinc-800 text-white active:scale-95"
                  }`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 tracking-tight transition-colors ${
                    isActive ? "text-orange-400" : "text-zinc-400 group-hover:text-orange-400"
                  }`}
                >
                  {tab.label}
                </span>
                {tab.badge && (
                  <span className="absolute -top-1 right-0 px-1 py-0.2 rounded-md text-[8px] font-bold bg-zinc-900 border border-orange-500/50 text-orange-400 shadow-sm">
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors duration-150 relative group ${
                isActive
                  ? "text-orange-400 font-semibold bg-zinc-900/80"
                  : "text-zinc-400 hover:text-orange-400 active:scale-95"
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-0.5 transition-colors ${
                  isActive ? "text-orange-400" : "text-zinc-400 group-hover:text-orange-400"
                }`}
              />
              <span className="text-[10px] truncate max-w-[65px]">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-orange-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
