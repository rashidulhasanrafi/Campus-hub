"use client";

import React from "react";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Sparkles,
  Users,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Radio,
  Dices,
  Flame,
} from "lucide-react";

export default function GamesHubPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-8 select-none">
      <div className="w-full max-w-4xl space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            >
              ← Back to Campus Hub
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Campus Games Lounge
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Cross-Platform Ready</span>
          </div>
        </div>

        {/* Featured Flagship Game: UIU Ludo 4-Player */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-orange-500/30 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-extrabold">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Featured • Real-time Multiplayer</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Campus Hub <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400 bg-clip-text text-transparent">
                  4-Player Ludo Arena
                </span>
              </h1>

              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                Play the classic board game with verified UIU peers in real-time. Features live
                voice chat, desktop and mobile cross-play sync, and fast-paced matchmaking!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/games/ludo")}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-orange-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Play Ludo Arena Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/games/ludo?mode=random")}
                  className="px-5 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm border border-zinc-700 transition-all cursor-pointer"
                >
                  Quick Random Queue
                </button>
              </div>
            </div>

            {/* Interactive Visual Card */}
            <div className="md:col-span-5 flex items-center justify-center">
              <div className="w-64 h-64 rounded-3xl bg-zinc-950/80 border-2 border-orange-500/40 p-5 shadow-2xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 p-1 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-xl bg-zinc-950 flex items-center justify-center text-4xl">
                    🎲
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Ludo 4-Player</h3>
                  <span className="text-xs text-orange-400 font-semibold">
                    Voice Chat • Cross-Device
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>Red</span> • <span>Green</span> • <span>Yellow</span> • <span>Blue</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">LiveKit Voice Chat</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Crystal clear web voice audio with mute toggles and live speaker indicators.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <Radio className="w-5 h-5 text-orange-400" />
            <h4 className="text-sm font-bold text-white">Cross-Platform Sync</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              PC and Android mobile players sync turns instantly over Supabase Realtime.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Custom Rooms & Random</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create private rooms with code or join public matchmaking instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
