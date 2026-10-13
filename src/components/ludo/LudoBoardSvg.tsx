"use client";

import React, { useMemo } from "react";
import {
  PlayerColor,
  LudoPlayer,
  COLOR_CONFIG,
  COMMON_PATH,
  SAFE_INDICES,
  getTokenBoardCoord,
  canTokenMove,
} from "@/lib/ludoEngine";
import { Star, Trophy } from "lucide-react";

interface LudoBoardSvgProps {
  players: LudoPlayer[];
  currentTurnColor: PlayerColor;
  diceValue: number | null;
  hasRolled: boolean;
  myColor: PlayerColor | null;
  onSelectToken: (tokenIndex: number) => void;
  animatingToken?: { color: PlayerColor; tokenIndex: number } | null;
}

export default function LudoBoardSvg({
  players,
  currentTurnColor,
  diceValue,
  hasRolled,
  myColor,
  onSelectToken,
  animatingToken,
}: LudoBoardSvgProps) {
  // Grid size: 15 cells of 100px each => 1500 x 1500 viewBox
  const cellSize = 100;
  const boardSize = 1500;

  // Determine if it's currently my turn and I have rolled a dice
  const isMyTurn = myColor !== null && currentTurnColor === myColor;
  const myPlayer = players.find((p) => p.color === myColor);

  // Collect all tokens with their computed pixel coordinates
  const tokenPlacements = useMemo(() => {
    interface TokenItem {
      color: PlayerColor;
      player: LudoPlayer;
      tokenIndex: number;
      step: number;
      cx: number;
      cy: number;
      isMoveable: boolean;
    }

    const cellMap: Record<string, TokenItem[]> = {};
    const items: TokenItem[] = [];

    players.forEach((player) => {
      player.tokens.forEach((step, tokenIndex) => {
        const coord = getTokenBoardCoord(player.color, tokenIndex, step);
        const cx = coord.c * cellSize + cellSize / 2;
        const cy = coord.r * cellSize + cellSize / 2;

        const isMoveable =
          isMyTurn &&
          hasRolled &&
          diceValue !== null &&
          player.color === myColor &&
          canTokenMove(step, diceValue);

        const key = `${Math.round(coord.r * 10)}_${Math.round(coord.c * 10)}`;
        const tokenItem: TokenItem = {
          color: player.color,
          player,
          tokenIndex,
          step,
          cx,
          cy,
          isMoveable,
        };

        if (!cellMap[key]) cellMap[key] = [];
        cellMap[key].push(tokenItem);
        items.push(tokenItem);
      });
    });

    // Offset tokens if multiple tokens share the exact same cell
    Object.values(cellMap).forEach((group) => {
      if (group.length > 1) {
        const radius = 22;
        group.forEach((token, idx) => {
          const angle = (idx / group.length) * 2 * Math.PI;
          token.cx += Math.cos(angle) * radius;
          token.cy += Math.sin(angle) * radius;
        });
      }
    });

    return items;
  }, [players, isMyTurn, hasRolled, diceValue, myColor]);

  return (
    <div className="relative w-full aspect-square max-w-[620px] mx-auto select-none rounded-3xl overflow-hidden shadow-2xl border-4 border-zinc-800 bg-zinc-950">
      <svg
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle drop shadows for 3D tokens */}
          <filter id="token-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.45" />
          </filter>
          <filter id="token-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#f59e0b" floodOpacity="0.9" />
          </filter>

          {/* Gradients for Home Bases */}
          <linearGradient id="red-base-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
          <linearGradient id="green-base-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="yellow-base-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="blue-base-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* 1. BACKGROUND BOARD GRID                                     */}
        {/* ============================================================ */}
        <rect width={boardSize} height={boardSize} fill="#18181b" />

        {/* ============================================================ */}
        {/* 2. FOUR CORNER HOME BASES (6x6 cells each)                   */}
        {/* ============================================================ */}

        {/* GREEN BASE: Top-Left (0..6, 0..6) */}
        <g>
          <rect x={0} y={0} width={600} height={600} fill="url(#green-base-grad)" rx={24} />
          {/* Inner yard box */}
          <rect x={90} y={90} width={420} height={420} fill="#ffffff" rx={32} opacity={0.96} />
          <rect x={120} y={120} width={360} height={360} fill="#ecfdf5" rx={24} />
          {/* Yard circles */}
          {[
            { cx: 200, cy: 200 },
            { cx: 400, cy: 200 },
            { cx: 200, cy: 400 },
            { cx: 400, cy: 400 },
          ].map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={46}
              fill="#10b981"
              stroke="#047857"
              strokeWidth={8}
            />
          ))}
          <text
            x={300}
            y={305}
            textAnchor="middle"
            fill="#065f46"
            fontSize={36}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            GREEN
          </text>
        </g>

        {/* YELLOW BASE: Top-Right (9..15, 0..6) */}
        <g>
          <rect x={900} y={0} width={600} height={600} fill="url(#yellow-base-grad)" rx={24} />
          <rect x={990} y={90} width={420} height={420} fill="#ffffff" rx={32} opacity={0.96} />
          <rect x={1020} y={120} width={360} height={360} fill="#fffbeb" rx={24} />
          {[
            { cx: 1100, cy: 200 },
            { cx: 1300, cy: 200 },
            { cx: 1100, cy: 400 },
            { cx: 1300, cy: 400 },
          ].map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={46}
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth={8}
            />
          ))}
          <text
            x={1200}
            y={305}
            textAnchor="middle"
            fill="#92400e"
            fontSize={36}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            YELLOW
          </text>
        </g>

        {/* RED BASE: Bottom-Left (0..6, 9..15) */}
        <g>
          <rect x={0} y={900} width={600} height={600} fill="url(#red-base-grad)" rx={24} />
          <rect x={90} y={990} width={420} height={420} fill="#ffffff" rx={32} opacity={0.96} />
          <rect x={120} y={1020} width={360} height={360} fill="#fff1f2" rx={24} />
          {[
            { cx: 200, cy: 1100 },
            { cx: 400, cy: 1100 },
            { cx: 200, cy: 1300 },
            { cx: 400, cy: 1300 },
          ].map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={46}
              fill="#f43f5e"
              stroke="#be123c"
              strokeWidth={8}
            />
          ))}
          <text
            x={300}
            y={1205}
            textAnchor="middle"
            fill="#9f1239"
            fontSize={36}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            RED
          </text>
        </g>

        {/* BLUE BASE: Bottom-Right (9..15, 9..15) */}
        <g>
          <rect x={900} y={900} width={600} height={600} fill="url(#blue-base-grad)" rx={24} />
          <rect x={990} y={990} width={420} height={420} fill="#ffffff" rx={32} opacity={0.96} />
          <rect x={1020} y={1020} width={360} height={360} fill="#f0f9ff" rx={24} />
          {[
            { cx: 1100, cy: 1100 },
            { cx: 1300, cy: 1100 },
            { cx: 1100, cy: 1300 },
            { cx: 1300, cy: 1300 },
          ].map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r={46}
              fill="#0ea5e9"
              stroke="#0369a1"
              strokeWidth={8}
            />
          ))}
          <text
            x={1200}
            y={1205}
            textAnchor="middle"
            fill="#075985"
            fontSize={36}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            BLUE
          </text>
        </g>

        {/* ============================================================ */}
        {/* 3. TRACK CELLS (Common Track + Home Columns)                 */}
        {/* ============================================================ */}

        {/* Draw common path cells */}
        {COMMON_PATH.map((cell, idx) => {
          const isSafe = SAFE_INDICES.has(idx);
          let cellFill = "#27272a"; // Neutral slate-zinc
          let cellBorder = "#3f3f46";

          // Start cells colored accordingly
          if (idx === 0) {
            cellFill = "#f43f5e"; // Red start
            cellBorder = "#be123c";
          } else if (idx === 13) {
            cellFill = "#10b981"; // Green start
            cellBorder = "#047857";
          } else if (idx === 26) {
            cellFill = "#f59e0b"; // Yellow start
            cellBorder = "#b45309";
          } else if (idx === 39) {
            cellFill = "#0ea5e9"; // Blue start
            cellBorder = "#0369a1";
          }

          const x = cell.c * cellSize;
          const y = cell.r * cellSize;

          return (
            <g key={`common_${idx}`}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={cellFill}
                stroke={cellBorder}
                strokeWidth={3}
              />
              {/* Star on Safe Spots */}
              {isSafe && (
                <g transform={`translate(${x + cellSize / 2}, ${y + cellSize / 2})`}>
                  <polygon
                    points="0,-24 7,-8 24,-7 11,5 15,22 0,12 -15,22 -11,5 -24,-7 -7,-8"
                    fill="#fbbf24"
                    stroke="#b45309"
                    strokeWidth={2}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* GREEN HOME RUN: (row 7, cols 1..5) */}
        {[1, 2, 3, 4, 5].map((col) => (
          <rect
            key={`green_home_${col}`}
            x={col * cellSize}
            y={7 * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#10b981"
            stroke="#047857"
            strokeWidth={3}
          />
        ))}

        {/* YELLOW HOME RUN: (rows 1..5, col 7) */}
        {[1, 2, 3, 4, 5].map((row) => (
          <rect
            key={`yellow_home_${row}`}
            x={7 * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth={3}
          />
        ))}

        {/* BLUE HOME RUN: (row 7, cols 9..13) */}
        {[9, 10, 11, 12, 13].map((col) => (
          <rect
            key={`blue_home_${col}`}
            x={col * cellSize}
            y={7 * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#0ea5e9"
            stroke="#0369a1"
            strokeWidth={3}
          />
        ))}

        {/* RED HOME RUN: (rows 9..13, col 7) */}
        {[9, 10, 11, 12, 13].map((row) => (
          <rect
            key={`red_home_${row}`}
            x={7 * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#f43f5e"
            stroke="#be123c"
            strokeWidth={3}
          />
        ))}

        {/* ============================================================ */}
        {/* 4. CENTER TRIANGLE FINISHING ZONE (cols 6..8, rows 6..8)      */}
        {/* ============================================================ */}
        <g>
          {/* Green Triangle (Left) */}
          <polygon
            points="600,600 600,900 750,750"
            fill="#10b981"
            stroke="#047857"
            strokeWidth={3}
          />
          {/* Yellow Triangle (Top) */}
          <polygon
            points="600,600 900,600 750,750"
            fill="#f59e0b"
            stroke="#b45309"
            strokeWidth={3}
          />
          {/* Blue Triangle (Right) */}
          <polygon
            points="900,600 900,900 750,750"
            fill="#0ea5e9"
            stroke="#0369a1"
            strokeWidth={3}
          />
          {/* Red Triangle (Bottom) */}
          <polygon
            points="600,900 900,900 750,750"
            fill="#f43f5e"
            stroke="#be123c"
            strokeWidth={3}
          />

          {/* Center Gold Circle with UIU Trophy */}
          <circle cx={750} cy={750} r={55} fill="#18181b" stroke="#fbbf24" strokeWidth={6} />
          <circle cx={750} cy={750} r={42} fill="#ea580c" />
          <g transform="translate(726, 726) scale(2)">
            <polygon
              points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
              fill="#fef08a"
              stroke="#ca8a04"
              strokeWidth={1}
            />
          </g>
        </g>

        {/* ============================================================ */}
        {/* 5. TOKENS ON BOARD WITH INTERACTIVE PULSE & CLICK            */}
        {/* ============================================================ */}
        {tokenPlacements.map((tok) => {
          const cfg = COLOR_CONFIG[tok.color];
          const isSelectedOrAnimated =
            animatingToken?.color === tok.color &&
            animatingToken?.tokenIndex === tok.tokenIndex;

          return (
            <g
              key={`${tok.color}_${tok.tokenIndex}`}
              className={
                tok.isMoveable
                  ? "cursor-pointer group transition-transform duration-150"
                  : ""
              }
              onClick={() => {
                if (tok.isMoveable) {
                  onSelectToken(tok.tokenIndex);
                }
              }}
            >
              {/* Moveable Pulsing Halo */}
              {tok.isMoveable && (
                <circle
                  cx={tok.cx}
                  cy={tok.cy}
                  r={48}
                  fill={cfg.fill}
                  opacity={0.35}
                  className="animate-ping"
                />
              )}

              {/* Glowing ring if moveable */}
              {tok.isMoveable && (
                <circle
                  cx={tok.cx}
                  cy={tok.cy}
                  r={42}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={6}
                  strokeDasharray="8 4"
                  filter="url(#token-glow)"
                />
              )}

              {/* Base Drop Shadow */}
              <ellipse
                cx={tok.cx}
                cy={tok.cy + 14}
                rx={28}
                ry={12}
                fill="#000000"
                opacity={0.4}
              />

              {/* 3D Outer Token Shell */}
              <circle
                cx={tok.cx}
                cy={tok.cy}
                r={isSelectedOrAnimated ? 36 : 30}
                fill={cfg.fill}
                stroke="#ffffff"
                strokeWidth={5}
                filter="url(#token-shadow)"
                className="transition-all duration-200"
              />

              {/* 3D Inner Cap */}
              <circle
                cx={tok.cx}
                cy={tok.cy}
                r={isSelectedOrAnimated ? 24 : 20}
                fill="#ffffff"
                opacity={0.92}
              />

              {/* Token Number Label (1..4) */}
              <text
                x={tok.cx}
                y={tok.cy + 6}
                textAnchor="middle"
                fill={cfg.hex}
                fontSize={20}
                fontWeight="900"
                fontFamily="sans-serif"
              >
                {tok.tokenIndex + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
