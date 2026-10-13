"use client";

import React from "react";
import { PlayerColor, COLOR_CONFIG, ludoAudio } from "@/lib/ludoEngine";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";

interface LudoDiceProps {
  currentTurnColor: PlayerColor;
  currentTurnPlayerName?: string;
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  hasRolled?: boolean;
  onRoll: () => void;
  turnTimeLeft?: number;
}

export default function LudoDice({
  currentTurnColor,
  currentTurnPlayerName,
  diceValue,
  isRolling,
  canRoll,
  hasRolled = false,
  onRoll,
  turnTimeLeft = 15,
}: LudoDiceProps) {
  const cfg = COLOR_CONFIG[currentTurnColor];
  const safeTime = Math.max(0, Math.min(15, turnTimeLeft));
  const progressPercent = (safeTime / 15) * 100;
  const isUrgent = safeTime <= 4;

  // Render dots on standard 1..6 dice face
  const renderDots = (val: number | null) => {
    if (!val || val < 1 || val > 6) {
      return (
        <div className="flex items-center justify-center w-full h-full text-zinc-500">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
      );
    }

    // Positions for 3x3 dot matrix
    const dotGrid: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activeIndices = new Set(dotGrid[val] || [4]);

    return (
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-12 h-12 p-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activeIndices.has(idx) ? (
              <div
                className="w-2.5 h-2.5 rounded-full shadow-inner"
                style={{ backgroundColor: cfg.hex }}
              />
            ) : (
              <div className="w-2.5 h-2.5" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-[240px]">
      {/* 15-Second Turn Progress Bar */}
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span
            className={`flex items-center gap-1 ${
              isUrgent ? "text-rose-400 animate-pulse" : "text-zinc-300"
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-orange-400" />
            )}
            <span>{safeTime}s left</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">15s limit</span>
        </div>

        {/* Depleting Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-800/90 overflow-hidden p-[1px] border border-zinc-700/60">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isUrgent
                ? "bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse"
                : safeTime <= 8
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative">
        {/* Pulsing glow ring if it's player's turn to roll */}
        {canRoll && !isRolling && (
          <div
            className="absolute -inset-2 rounded-2xl opacity-75 blur-md animate-pulse pointer-events-none"
            style={{ backgroundColor: cfg.hex }}
          />
        )}

        {/* 3D Dice Box */}
        <button
          type="button"
          disabled={!canRoll || isRolling}
          onClick={() => {
            if (canRoll && !isRolling) {
              ludoAudio.playDiceRoll();
              onRoll();
            }
          }}
          className={`relative w-20 h-20 rounded-2xl bg-gradient-to-b from-white to-zinc-200 border-4 shadow-xl flex items-center justify-center transition-all cursor-pointer ${
            isRolling
              ? "animate-spin scale-95"
              : canRoll
              ? "hover:scale-105 active:scale-90 shadow-orange-500/30"
              : "opacity-85 cursor-not-allowed"
          }`}
          style={{ borderColor: cfg.hex }}
          title={canRoll ? "Click to Roll Dice!" : "Waiting for turn..."}
        >
          {renderDots(diceValue)}
        </button>
      </div>

      {/* Button & Turn Countdown Label */}
      <div className="text-center w-full">
        {canRoll ? (
          <button
            type="button"
            onClick={() => {
              if (canRoll && !isRolling) {
                ludoAudio.playDiceRoll();
                onRoll();
              }
            }}
            disabled={isRolling}
            className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer ${
              isUrgent
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse"
                : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30"
            }`}
          >
            {isRolling ? "Rolling..." : `ROLL DICE (${safeTime}s)`}
          </button>
        ) : hasRolled ? (
          <div className="px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold animate-pulse">
            Pick a token to move! ({safeTime}s)
          </div>
        ) : (
          <div className="text-center">
            <span className="text-[11px] font-bold text-zinc-300 block truncate">
              {currentTurnPlayerName || cfg.name.split(" ")[0]}&apos;s Turn
            </span>
            <span className="text-[10px] text-zinc-500">
              Passes in {safeTime}s if AFK
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
