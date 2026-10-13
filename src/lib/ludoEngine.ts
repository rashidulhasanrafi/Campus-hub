// =====================================================================
// CAMPUS HUB - LUDO GAME ENGINE & CROSS-DEVICE SYNC DEFINITIONS
// Standard 15x15 Ludo Board with Safe Spots, Captures, & Cross-Platform Events
// =====================================================================

export type PlayerColor = "RED" | "GREEN" | "YELLOW" | "BLUE";

export const PLAYER_COLORS: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];

export const COLOR_CONFIG: Record<
  PlayerColor,
  {
    name: string;
    bg: string;
    border: string;
    fill: string;
    text: string;
    glow: string;
    startIndex: number;
    homeEntranceIndex: number;
    homeRunColor: string;
    hex: string;
  }
> = {
  RED: {
    name: "Red (Canteen Fire)",
    bg: "bg-rose-500",
    border: "border-rose-500",
    fill: "#f43f5e",
    text: "text-rose-400",
    glow: "shadow-rose-500/50",
    startIndex: 0,
    homeEntranceIndex: 50,
    homeRunColor: "#fda4af",
    hex: "#e11d48",
  },
  GREEN: {
    name: "Green (Campus Field)",
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    fill: "#10b981",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/50",
    startIndex: 13,
    homeEntranceIndex: 11,
    homeRunColor: "#6ee7b7",
    hex: "#059669",
  },
  YELLOW: {
    name: "Yellow (UIU Sunshine)",
    bg: "bg-amber-400",
    border: "border-amber-400",
    fill: "#f59e0b",
    text: "text-amber-400",
    glow: "shadow-amber-400/50",
    startIndex: 26,
    homeEntranceIndex: 24,
    homeRunColor: "#fde68a",
    hex: "#d97706",
  },
  BLUE: {
    name: "Blue (CSE Coders)",
    bg: "bg-sky-500",
    border: "border-sky-500",
    fill: "#0ea5e9",
    text: "text-sky-400",
    glow: "shadow-sky-500/50",
    startIndex: 39,
    homeEntranceIndex: 37,
    homeRunColor: "#7dd3fc",
    hex: "#0284c7",
  },
};

export interface LudoPlayer {
  id: string;
  name: string;
  avatar: string;
  department: string;
  batch?: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
  tokens: number[]; // 4 tokens, step: -1 (base), 0..50 (common), 51..55 (home path), 56 (finished)
  isAudioMuted?: boolean;
  isSpeaking?: boolean;
}

// Coordinate on 15x15 board (0 to 14)
export interface BoardCoord {
  r: number;
  c: number;
}

// 52 Common Perimeter Cells: Clockwise around the cross
// Starting at Red's entry cell: (13, 6)
export const COMMON_PATH: BoardCoord[] = [
  // 0..4 (Red upward arm)
  { r: 13, c: 6 },
  { r: 12, c: 6 },
  { r: 11, c: 6 },
  { r: 10, c: 6 },
  { r: 9, c: 6 },
  // 5..10 (Turn left to Green base)
  { r: 8, c: 5 },
  { r: 8, c: 4 },
  { r: 8, c: 3 },
  { r: 8, c: 2 },
  { r: 8, c: 1 },
  { r: 8, c: 0 },
  // 11..12 (Green vertical entry)
  { r: 7, c: 0 },
  { r: 6, c: 0 },
  // 13..17 (Green start & rightward arm)
  { r: 6, c: 1 },
  { r: 6, c: 2 },
  { r: 6, c: 3 },
  { r: 6, c: 4 },
  { r: 6, c: 5 },
  // 18..23 (Upward to top)
  { r: 5, c: 6 },
  { r: 4, c: 6 },
  { r: 3, c: 6 },
  { r: 2, c: 6 },
  { r: 1, c: 6 },
  { r: 0, c: 6 },
  // 24..25 (Top horizontal turn)
  { r: 0, c: 7 },
  { r: 0, c: 8 },
  // 26..30 (Yellow start & downward arm)
  { r: 1, c: 8 },
  { r: 2, c: 8 },
  { r: 3, c: 8 },
  { r: 4, c: 8 },
  { r: 5, c: 8 },
  // 31..36 (Turn right to Blue)
  { r: 6, c: 9 },
  { r: 6, c: 10 },
  { r: 6, c: 11 },
  { r: 6, c: 12 },
  { r: 6, c: 13 },
  { r: 6, c: 14 },
  // 37..38 (Right vertical turn)
  { r: 7, c: 14 },
  { r: 8, c: 14 },
  // 39..43 (Blue start & leftward arm)
  { r: 8, c: 13 },
  { r: 8, c: 12 },
  { r: 8, c: 11 },
  { r: 8, c: 10 },
  { r: 8, c: 9 },
  // 44..49 (Downward arm)
  { r: 9, c: 8 },
  { r: 10, c: 8 },
  { r: 11, c: 8 },
  { r: 12, c: 8 },
  { r: 13, c: 8 },
  { r: 14, c: 8 },
  // 50..51 (Bottom horizontal turn)
  { r: 14, c: 7 },
  { r: 14, c: 6 },
];

// Safe Spots (Star Cells on Common Path):
// Red start (0), Safe 1 (8), Green start (13), Safe 2 (21),
// Yellow start (26), Safe 3 (34), Blue start (39), Safe 4 (47)
export const SAFE_INDICES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// Home Paths (steps 51 to 55) for each color
export const HOME_PATHS: Record<PlayerColor, BoardCoord[]> = {
  RED: [
    { r: 13, c: 7 },
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 },
  ],
  GREEN: [
    { r: 7, c: 1 },
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 },
  ],
  YELLOW: [
    { r: 1, c: 7 },
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 },
  ],
  BLUE: [
    { r: 7, c: 13 },
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 },
  ],
};

// Base Yard Slots coordinates for tokens when step === -1
export const BASE_SLOTS: Record<PlayerColor, BoardCoord[]> = {
  RED: [
    { r: 10, c: 1.5 },
    { r: 10, c: 3.5 },
    { r: 12.5, c: 1.5 },
    { r: 12.5, c: 3.5 },
  ],
  GREEN: [
    { r: 1.5, c: 1.5 },
    { r: 1.5, c: 3.5 },
    { r: 3.5, c: 1.5 },
    { r: 3.5, c: 3.5 },
  ],
  YELLOW: [
    { r: 1.5, c: 10.5 },
    { r: 1.5, c: 12.5 },
    { r: 3.5, c: 10.5 },
    { r: 3.5, c: 12.5 },
  ],
  BLUE: [
    { r: 10.5, c: 10.5 },
    { r: 10.5, c: 12.5 },
    { r: 12.5, c: 10.5 },
    { r: 12.5, c: 12.5 },
  ],
};

// Center Final Home coordinate
export const CENTER_HOME_COORDS: Record<PlayerColor, BoardCoord> = {
  RED: { r: 7.7, c: 7 },
  GREEN: { r: 7, c: 6.3 },
  YELLOW: { r: 6.3, c: 7 },
  BLUE: { r: 7, c: 7.7 },
};

/**
 * Resolves token position on 15x15 board
 */
export function getTokenBoardCoord(
  color: PlayerColor,
  tokenIndex: number,
  step: number
): BoardCoord {
  // 1. Inside Base Yard
  if (step === -1) {
    const slots = BASE_SLOTS[color];
    return slots[tokenIndex] || slots[0];
  }

  // 2. Finished Center Home
  if (step >= 56) {
    return CENTER_HOME_COORDS[color];
  }

  // 3. Home Run Path (step 51..55)
  if (step >= 51) {
    const homeIndex = step - 51;
    const path = HOME_PATHS[color];
    return path[homeIndex] || path[path.length - 1];
  }

  // 4. Common Path (step 0..50)
  const baseStart = COLOR_CONFIG[color].startIndex;
  const commonIndex = (baseStart + step) % 52;
  return COMMON_PATH[commonIndex];
}

/**
 * Checks if a token can legally move given a dice roll (1..6)
 */
export function canTokenMove(step: number, diceValue: number): boolean {
  if (step === -1) {
    return diceValue === 6;
  }
  if (step >= 56) {
    return false; // Already finished
  }
  return step + diceValue <= 56;
}

/**
 * Calculates new step after moving
 */
export function calculateNextStep(step: number, diceValue: number): number {
  if (step === -1) {
    return diceValue === 6 ? 0 : -1;
  }
  return step + diceValue;
}

/**
 * Determines whether a cell is safe from opponent captures
 */
export function isSafeCell(color: PlayerColor, step: number): boolean {
  if (step === -1 || step >= 51) return true;
  const commonIndex = (COLOR_CONFIG[color].startIndex + step) % 52;
  return SAFE_INDICES.has(commonIndex);
}

/**
 * Checks if an opponent token is captured by this move
 */
export function detectCapture(
  movingColor: PlayerColor,
  targetStep: number,
  allPlayers: LudoPlayer[]
): {
  isCaptured: boolean;
  capturedPlayerColor: PlayerColor | null;
  capturedTokenIndex: number | null;
} {
  // Tokens in yard, home path, or safe spots cannot be captured
  if (targetStep === -1 || targetStep >= 51 || isSafeCell(movingColor, targetStep)) {
    return { isCaptured: false, capturedPlayerColor: null, capturedTokenIndex: null };
  }

  const movingCommonIndex =
    (COLOR_CONFIG[movingColor].startIndex + targetStep) % 52;

  for (const player of allPlayers) {
    if (player.color === movingColor) continue;

    const oppStart = COLOR_CONFIG[player.color].startIndex;
    for (let t = 0; t < player.tokens.length; t++) {
      const oppStep = player.tokens[t];
      if (oppStep >= 0 && oppStep < 51) {
        const oppCommonIndex = (oppStart + oppStep) % 52;
        if (oppCommonIndex === movingCommonIndex) {
          return {
            isCaptured: true,
            capturedPlayerColor: player.color,
            capturedTokenIndex: t,
          };
        }
      }
    }
  }

  return { isCaptured: false, capturedPlayerColor: null, capturedTokenIndex: null };
}

// =====================================================================
// SUPABASE REALTIME BROADCAST PAYLOAD INTERFACES
// =====================================================================

export interface DiceRollPayload {
  roomId: string;
  playerId: string;
  playerColor: PlayerColor;
  diceValue: number;
  timestamp: number;
}

export interface MoveTokenPayload {
  roomId: string;
  playerId: string;
  playerColor: PlayerColor;
  tokenIndex: number;
  diceValue: number;
  fromPos: number;
  toPos: number;
  isCaptured: boolean;
  capturedPlayerColor: PlayerColor | null;
  capturedTokenIndex: number | null;
  timestamp: number;
}

export interface TurnChangePayload {
  roomId: string;
  nextPlayerId: string;
  nextPlayerColor: PlayerColor;
  turnIndex: number;
  timestamp: number;
}

export interface GameStartPayload {
  roomId: string;
  players: LudoPlayer[];
  firstTurnColor: PlayerColor;
  timestamp: number;
}

export interface PlayerJoinPayload {
  roomId: string;
  player: LudoPlayer;
  timestamp: number;
}

export interface PlayerLeavePayload {
  roomId: string;
  playerId: string;
  timestamp: number;
}

export interface GameOverPayload {
  roomId: string;
  winnerColor: PlayerColor;
  winnerId: string;
  winnerName: string;
  rankings: { id: string; name: string; color: PlayerColor; rank: number }[];
  timestamp: number;
}

// =====================================================================
// SYNTHESIZED SOUND EFFECTS (Zero External Asset Dependency)
// =====================================================================

class LudoSoundFx {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playDiceRoll() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320 + Math.random() * 200, now + i * 0.05);
        gain.gain.setValueAtTime(0.08, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.05);
      }
    } catch {}
  }

  playTokenMove() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  playCapture() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  playHomeCheer() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.18);
      });
    } catch {}
  }
}

export const ludoAudio = new LudoSoundFx();
