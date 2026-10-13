"use client";

import React, { useState } from "react";
import { PlayerColor, COLOR_CONFIG, ludoAudio } from "@/lib/ludoEngine";
import { Sparkles } from "lucide-react";

interface LudoDiceProps {
  currentTurnColor: PlayerColor;
  diceValue: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  turnTimeLeft?: number;
}

export default function LudoDice({
  currentTurnColor,
  diceValue,
  isRolling,
  canRoll,
  onRoll,
  turnTimeLeft = 15,
}: LudoDiceProps) {
  const cfg = COLOR_CONFIG[currentTurnColor];

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
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Pulsing ring if it's player's turn to roll */}
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
              : "opacity-80 cursor-not-allowed"
          }`}
          style={{ borderColor: cfg.hex }}
          title={canRoll ? "Click to Roll Dice!" : "Waiting for turn..."}
        >
          {renderDots(diceValue)}
        </button>
      </div>

      {/* Button & Turn Countdown Label */}
      <div className="text-center">
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
            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-lg shadow-orange-600/30 active:scale-95 transition-all cursor-pointer"
          >
            {isRolling ? "Rolling..." : `ROLL DICE (${turnTimeLeft}s)`}
          </button>
        ) : (
          <span className="text-[11px] font-bold text-zinc-400">
            {cfg.name.split(" ")[0]}&apos;s Turn
          </span>
        )}
      </div>
    </div>
  );
}
