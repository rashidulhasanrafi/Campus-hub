"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PlayerColor,
  PLAYER_COLORS,
  COLOR_CONFIG,
  LudoPlayer,
  DiceRollPayload,
  MoveTokenPayload,
  TurnChangePayload,
  GameStartPayload,
  PlayerJoinPayload,
  GameOverPayload,
  canTokenMove,
  calculateNextStep,
  detectCapture,
  ludoAudio,
} from "@/lib/ludoEngine";
import LudoBoardSvg from "@/components/ludo/LudoBoardSvg";
import LudoDice from "@/components/ludo/LudoDice";
import LudoVoiceChat from "@/components/ludo/LudoVoiceChat";
import StudentAvatar from "@/components/StudentAvatar";
import { UserProfile, supabase } from "@/lib/supabase";
import {
  Users,
  Gamepad2,
  Copy,
  Check,
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Share2,
  Crown,
  Trophy,
  RotateCcw,
  Sparkles,
  Radio,
  Clock,
  ShieldAlert,
} from "lucide-react";
import confetti from "canvas-confetti";

interface LudoGameViewProps {
  currentProfile: UserProfile | null;
  initialRoomCode?: string | null;
  initialMode?: "random" | "custom" | null;
  onExitGame?: () => void;
}

export default function LudoGameView({
  currentProfile,
  initialRoomCode,
  initialMode,
  onExitGame,
}: LudoGameViewProps) {
  // Local student fallback if not signed in
  const user: UserProfile = currentProfile || {
    id: `guest_${Math.random().toString(36).substring(2, 8)}`,
    full_name: "UIU Campus Peer",
    department: "BS in CSE",
    batch: "2024",
    avatar: "/images/avatar-male.png",
    status: "Playing Ludo 🎲",
    email: "student@bscse.uiu.ac.bd",
  };

  // Matchmaking State: "menu" | "lobby" | "playing" | "game_over"
  const [gameState, setGameState] = useState<"menu" | "lobby" | "playing" | "game_over">(
    initialRoomCode ? "lobby" : "menu"
  );
  const [roomId, setRoomId] = useState<string>(
    initialRoomCode || `UIU-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [joinInputCode, setJoinInputCode] = useState("");
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Players in room (up to 4)
  const [players, setPlayers] = useState<LudoPlayer[]>([
    {
      id: user.id,
      name: user.full_name,
      avatar: user.avatar,
      department: user.department,
      batch: user.batch,
      color: "RED",
      isHost: true,
      isReady: true,
      tokens: [-1, -1, -1, -1],
    },
  ]);

  // Turn & Game Loop State
  const [currentTurnColor, setCurrentTurnColor] = useState<PlayerColor>("RED");
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const [winner, setWinner] = useState<{ id: string; name: string; color: PlayerColor } | null>(null);

  // Audio & Speaker State
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<string>>(new Set());
  const [mutedSpeakers, setMutedSpeakers] = useState<Record<string, boolean>>({});

  // Animation highlight state
  const [animatingToken, setAnimatingToken] = useState<{
    color: PlayerColor;
    tokenIndex: number;
  } | null>(null);

  // Supabase Realtime Channel Reference
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Current user's color in this game
  const myPlayer = players.find((p) => p.id === user.id);
  const myColor: PlayerColor | null = myPlayer ? myPlayer.color : null;
  const isMyTurn = myColor !== null && currentTurnColor === myColor;

  // -------------------------------------------------------------------
  // 1. SUPABASE REALTIME CHANNEL SYNC (`ludo_${roomId}`)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!roomId) return;

    const channelName = `ludo_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: user.id },
      },
    });
    channelRef.current = channel;

    // A. Listen for DICE_ROLL
    channel.on("broadcast", { event: "DICE_ROLL" }, ({ payload }: { payload: DiceRollPayload }) => {
      ludoAudio.playDiceRoll();
      setIsRolling(true);
      setDiceValue(payload.diceValue);
      setTimeout(() => {
        setIsRolling(false);
        setHasRolled(true);
      }, 350);
    });

    // B. Listen for MOVE_TOKEN
    channel.on("broadcast", { event: "MOVE_TOKEN" }, ({ payload }: { payload: MoveTokenPayload }) => {
      ludoAudio.playTokenMove();
      setAnimatingToken({ color: payload.playerColor, tokenIndex: payload.tokenIndex });

      setPlayers((prev) =>
        prev.map((pl) => {
          if (pl.color === payload.playerColor) {
            const nextTokens = [...pl.tokens];
            nextTokens[payload.tokenIndex] = payload.toPos;
            return { ...pl, tokens: nextTokens };
          }
          if (
            payload.isCaptured &&
            payload.capturedPlayerColor &&
            pl.color === payload.capturedPlayerColor &&
            payload.capturedTokenIndex !== null
          ) {
            ludoAudio.playCapture();
            const nextTokens = [...pl.tokens];
            nextTokens[payload.capturedTokenIndex] = -1; // Reset captured token to base
            return { ...pl, tokens: nextTokens };
          }
          return pl;
        })
      );

      setTimeout(() => setAnimatingToken(null), 400);
    });

    // C. Listen for TURN_CHANGE
    channel.on("broadcast", { event: "TURN_CHANGE" }, ({ payload }: { payload: TurnChangePayload }) => {
      setCurrentTurnColor(payload.nextPlayerColor);
      setDiceValue(null);
      setHasRolled(false);
      setTurnTimeLeft(15);
    });

    // D. Listen for GAME_START
    channel.on("broadcast", { event: "GAME_START" }, ({ payload }: { payload: GameStartPayload }) => {
      setPlayers(payload.players);
      setCurrentTurnColor(payload.firstTurnColor);
      setGameState("playing");
      setDiceValue(null);
      setHasRolled(false);
      setTurnTimeLeft(15);
    });

    // E. Listen for PLAYER_JOIN
    channel.on("broadcast", { event: "PLAYER_JOIN" }, ({ payload }: { payload: PlayerJoinPayload }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === payload.player.id)) return prev;
        return [...prev, payload.player];
      });
    });

    // F. Listen for GAME_OVER
    channel.on("broadcast", { event: "GAME_OVER" }, ({ payload }: { payload: GameOverPayload }) => {
      ludoAudio.playHomeCheer();
      setWinner({
        id: payload.winnerId,
        name: payload.winnerName,
        color: payload.winnerColor,
      });
      setGameState("game_over");
      try {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.5 },
          colors: ["#ea580c", "#f97316", "#fbbf24", "#10b981"],
        });
      } catch {}
    });

    // Presence: Track who is joined
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: user.id,
          name: user.full_name,
          department: user.department,
          avatar: user.avatar,
          joinedAt: Date.now(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user.id, user.full_name, user.department, user.avatar]);

  // -------------------------------------------------------------------
  // 2. TURN TIMEOUT & BOT/PASS AUTOMATION
  // -------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // If my turn and I didn't roll or move, auto-pass
          if (isMyTurn) {
            handlePassTurn();
          }
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isMyTurn, currentTurnColor]);

  // Auto-move token if only one token can legally move
  useEffect(() => {
    if (!isMyTurn || !hasRolled || diceValue === null || gameState !== "playing") return;

    if (!myPlayer) return;

    const legalIndices: number[] = [];
    myPlayer.tokens.forEach((step, idx) => {
      if (canTokenMove(step, diceValue)) {
        legalIndices.push(idx);
      }
    });

    // Case 1: No legal moves => Auto-pass after a brief delay
    if (legalIndices.length === 0) {
      const passTimeout = setTimeout(() => {
        handlePassTurn();
      }, 900);
      return () => clearTimeout(passTimeout);
    }

    // Case 2: Exactly 1 legal move => Auto move for ultra-smooth gameplay
    if (legalIndices.length === 1) {
      const autoMoveTimeout = setTimeout(() => {
        handleMoveToken(legalIndices[0]);
      }, 600);
      return () => clearTimeout(autoMoveTimeout);
    }
  }, [isMyTurn, hasRolled, diceValue, gameState]);

  // -------------------------------------------------------------------
  // 3. GAME ACTIONS & BROADCAST HANDLERS
  // -------------------------------------------------------------------

  // Roll Dice Action
  const handleRollDice = () => {
    if (!isMyTurn || hasRolled || isRolling || myColor === null) return;

    setIsRolling(true);
    const rolled = Math.floor(Math.random() * 6) + 1;
    setDiceValue(rolled);
    ludoAudio.playDiceRoll();

    // Broadcast DICE_ROLL to all cross-platform players
    channelRef.current?.send({
      type: "broadcast",
      event: "DICE_ROLL",
      payload: {
        roomId,
        playerId: user.id,
        playerColor: myColor,
        diceValue: rolled,
        timestamp: Date.now(),
      } as DiceRollPayload,
    });

    setTimeout(() => {
      setIsRolling(false);
      setHasRolled(true);
    }, 350);
  };

  // Move Token Action
  const handleMoveToken = (tokenIndex: number) => {
    if (!isMyTurn || !hasRolled || diceValue === null || myColor === null || !myPlayer) return;

    const currentStep = myPlayer.tokens[tokenIndex];
    if (!canTokenMove(currentStep, diceValue)) return;

    const nextStep = calculateNextStep(currentStep, diceValue);
    const captureResult = detectCapture(myColor, nextStep, players);

    ludoAudio.playTokenMove();
    if (captureResult.isCaptured) {
      ludoAudio.playCapture();
    }
    if (nextStep === 56) {
      ludoAudio.playHomeCheer();
    }

    // Optimistically update local player tokens
    let didWin = false;
    setPlayers((prev) => {
      const updated = prev.map((pl) => {
        if (pl.color === myColor) {
          const nextTokens = [...pl.tokens];
          nextTokens[tokenIndex] = nextStep;
          if (nextTokens.every((t) => t === 56)) {
            didWin = true;
          }
          return { ...pl, tokens: nextTokens };
        }
        if (
          captureResult.isCaptured &&
          captureResult.capturedPlayerColor &&
          pl.color === captureResult.capturedPlayerColor &&
          captureResult.capturedTokenIndex !== null
        ) {
          const nextTokens = [...pl.tokens];
          nextTokens[captureResult.capturedTokenIndex] = -1;
          return { ...pl, tokens: nextTokens };
        }
        return pl;
      });
      return updated;
    });

    // Broadcast MOVE_TOKEN
    channelRef.current?.send({
      type: "broadcast",
      event: "MOVE_TOKEN",
      payload: {
        roomId,
        playerId: user.id,
        playerColor: myColor,
        tokenIndex,
        diceValue,
        fromPos: currentStep,
        toPos: nextStep,
        isCaptured: captureResult.isCaptured,
        capturedPlayerColor: captureResult.capturedPlayerColor,
        capturedTokenIndex: captureResult.capturedTokenIndex,
        timestamp: Date.now(),
      } as MoveTokenPayload,
    });

    // Check Win Condition
    if (didWin) {
      handleGameOver(myColor, user.id, user.full_name);
      return;
    }

    // Determine extra roll:
    // Player gets another roll if they rolled a 6 OR captured an opponent token (and consecutive 6s < 3)
    const earnedBonusRoll =
      (diceValue === 6 && consecutiveSixes < 2) || captureResult.isCaptured;

    if (earnedBonusRoll) {
      if (diceValue === 6) {
        setConsecutiveSixes((prev) => prev + 1);
      }
      setHasRolled(false);
      setDiceValue(null);
      setTurnTimeLeft(15);
    } else {
      setConsecutiveSixes(0);
      handlePassTurn();
    }
  };

  // Pass Turn to next active player
  const handlePassTurn = () => {
    const activeColors = players.map((p) => p.color);
    const currentIndex = activeColors.indexOf(currentTurnColor);
    const nextIndex = (currentIndex + 1) % activeColors.length;
    const nextColor = activeColors[nextIndex] || "RED";
    const nextPlayer = players.find((p) => p.color === nextColor);

    setCurrentTurnColor(nextColor);
    setDiceValue(null);
    setHasRolled(false);
    setTurnTimeLeft(15);

    // Broadcast TURN_CHANGE
    channelRef.current?.send({
      type: "broadcast",
      event: "TURN_CHANGE",
      payload: {
        roomId,
        nextPlayerId: nextPlayer?.id || "",
        nextPlayerColor: nextColor,
        turnIndex: nextIndex,
        timestamp: Date.now(),
      } as TurnChangePayload,
    });
  };

  // Handle Game Over
  const handleGameOver = (winnerColor: PlayerColor, winnerId: string, winnerName: string) => {
    setWinner({ id: winnerId, name: winnerName, color: winnerColor });
    setGameState("game_over");
    ludoAudio.playHomeCheer();

    channelRef.current?.send({
      type: "broadcast",
      event: "GAME_OVER",
      payload: {
        roomId,
        winnerColor,
        winnerId,
        winnerName,
        rankings: players.map((p, idx) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          rank: idx + 1,
        })),
        timestamp: Date.now(),
      } as GameOverPayload,
    });

    try {
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#ea580c", "#f97316", "#fbbf24"],
      });
    } catch {}
  };

  // Start Game (Host only)
  const handleStartGame = () => {
    // If fewer than 4 players, fill remaining spots with Campus AI peers
    const filledPlayers = [...players];
    const unusedColors = PLAYER_COLORS.filter((c) => !players.some((p) => p.color === c));

    while (filledPlayers.length < 4 && unusedColors.length > 0) {
      const nextColor = unusedColors.shift()!;
      const botNames = ["UIU Bot Rafi", "Campus Bot Tanvir", "CSE Bot Shanto", "Library Bot Lamia"];
      const botName = botNames[filledPlayers.length] || `Campus Peer ${filledPlayers.length + 1}`;
      filledPlayers.push({
        id: `ai_${Math.random().toString(36).substring(2, 7)}`,
        name: botName,
        avatar: filledPlayers.length % 2 === 0 ? "/images/avatar-male.png" : "/images/avatar-female.png",
        department: "BS in CSE",
        batch: "2024",
        color: nextColor,
        isHost: false,
        isReady: true,
        tokens: [-1, -1, -1, -1],
      });
    }

    setPlayers(filledPlayers);
    setGameState("playing");
    setCurrentTurnColor("RED");
    setTurnTimeLeft(15);

    // Broadcast GAME_START
    channelRef.current?.send({
      type: "broadcast",
      event: "GAME_START",
      payload: {
        roomId,
        players: filledPlayers,
        firstTurnColor: "RED",
        timestamp: Date.now(),
      } as GameStartPayload,
    });
  };

  // Copy Room Code helper
  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // Toggle individual remote speaker mute
  const handleToggleSpeakerMute = (participantId: string) => {
    setMutedSpeakers((prev) => ({
      ...prev,
      [participantId]: !prev[participantId],
    }));
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center select-none pb-24 md:pb-8 pt-2 sm:pt-4 px-3 sm:px-6">
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: Room Header, Voice Controls, Back Button             */}
      {/* ------------------------------------------------------------- */}
      <header className="w-full max-w-6xl flex items-center justify-between gap-3 py-3 border-b border-zinc-800/80 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitGame || (() => setGameState("menu"))}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            title="Exit Game"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Campus Ludo Arena
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  4-Player Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Room: <span className="font-mono text-zinc-200 font-bold">{roomId}</span>
              </p>
            </div>
          </div>
        </div>

        {/* LiveKit Voice Chat & Room Share */}
        <div className="flex items-center gap-2">
          {gameState === "playing" && (
            <LudoVoiceChat
              roomId={roomId}
              userId={user.id}
              userName={user.full_name}
              onSpeakersChanged={setSpeakingUserIds}
              mutedSpeakers={mutedSpeakers}
              onToggleSpeakerMute={handleToggleSpeakerMute}
            />
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-all cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>{roomId}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* VIEW A: MAIN MATCHMAKING MENU (Create or Join Room)           */}
      {/* ------------------------------------------------------------- */}
      {gameState === "menu" && (
        <div className="w-full max-w-lg mt-8 p-6 sm:p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl backdrop-blur-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Campus Hub Ludo
            </h2>
            <p className="text-xs text-zinc-400">
              Play real-time 4-player Ludo with official UIU students on PC & Mobile!
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Quick Random Match */}
            <button
              type="button"
              onClick={() => {
                const randomId = `UIU-PUB-${Math.floor(100 + Math.random() * 900)}`;
                setRoomId(randomId);
                setGameState("lobby");
              }}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-600/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Random Quick Match (Auto Queue)</span>
            </button>

            {/* Create Custom Room */}
            <button
              type="button"
              onClick={() => {
                const customCode = `UIU-${Math.floor(1000 + Math.random() * 9000)}`;
                setRoomId(customCode);
                setGameState("lobby");
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-100 font-bold text-sm border border-zinc-700 flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer"
            >
              <Users className="w-4 h-4 text-orange-400" />
              <span>Create Custom Room</span>
            </button>
          </div>

          {/* Join by Code Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider absolute">
              OR JOIN BY ROOM CODE
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinInputCode}
              onChange={(e) => setJoinInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. UIU-4821"
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 uppercase tracking-wider"
            />
            <button
              type="button"
              disabled={!joinInputCode.trim()}
              onClick={() => {
                if (joinInputCode.trim()) {
                  setRoomId(joinInputCode.trim());
                  setGameState("lobby");
                }
              }}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-95 cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW B: 4-PLAYER MATCHMAKING LOBBY                            */}
      {/* ------------------------------------------------------------- */}
      {gameState === "lobby" && (
        <div className="w-full max-w-2xl mt-4 p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-md space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Matchmaking Lobby</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {players.length}/4 Joined
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Share this room code with campus friends to join.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{roomId}</span>
              </button>
            </div>
          </div>

          {/* 4 Player Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PLAYER_COLORS.map((color, idx) => {
              const assignedPlayer = players.find((p) => p.color === color) || players[idx];
              const cfg = COLOR_CONFIG[color];

              return (
                <div
                  key={color}
                  className={`relative p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    assignedPlayer
                      ? "bg-zinc-950/80 border-zinc-700/80 shadow-md"
                      : "bg-zinc-950/30 border-dashed border-zinc-800 text-zinc-600"
                  }`}
                >
                  {assignedPlayer ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <StudentAvatar
                            avatar={assignedPlayer.avatar}
                            name={assignedPlayer.name}
                            size="md"
                            isOnline={true}
                          />
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 shadow"
                            style={{ backgroundColor: cfg.hex }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate max-w-[130px]">
                              {assignedPlayer.name}
                            </span>
                            {assignedPlayer.isHost && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block">
                            {assignedPlayer.department} • {assignedPlayer.batch || "2024"}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border"
                        style={{
                          color: cfg.hex,
                          backgroundColor: `${cfg.hex}15`,
                          borderColor: `${cfg.hex}30`,
                        }}
                      >
                        {color}
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full py-2">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-semibold">Slot {idx + 1} Waiting...</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-zinc-600">
                        {color}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lobby Launch Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Host can launch with 1 to 4 players (Bots auto-fill empty seats)</span>
            </span>

            <button
              type="button"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-xl shadow-orange-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Match Now</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW C: ACTIVE LUDO GAME ARENA (Desktop 2-Col / Responsive)   */}
      {/* ------------------------------------------------------------- */}
      {gameState === "playing" && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-2">
          {/* LEFT COLUMN: SVG BOARD (Lg: 8 cols) */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <LudoBoardSvg
              players={players}
              currentTurnColor={currentTurnColor}
              diceValue={diceValue}
              hasRolled={hasRolled}
              myColor={myColor}
              onSelectToken={handleMoveToken}
              animatingToken={animatingToken}
            />

            {/* Mobile-only Bottom Quick Dice Dock */}
            <div className="flex lg:hidden items-center justify-center gap-4 mt-3 w-full p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800">
              <LudoDice
                currentTurnColor={currentTurnColor}
                diceValue={diceValue}
                isRolling={isRolling}
                canRoll={isMyTurn && !hasRolled}
                onRoll={handleRollDice}
                turnTimeLeft={turnTimeLeft}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: 4 PLAYERS HUD & DESKTOP DICE (Lg: 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 w-full">
            {/* Desktop Dice Controller */}
            <div className="hidden lg:flex flex-col items-center justify-center p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
              <LudoDice
                currentTurnColor={currentTurnColor}
                diceValue={diceValue}
                isRolling={isRolling}
                canRoll={isMyTurn && !hasRolled}
                onRoll={handleRollDice}
                turnTimeLeft={turnTimeLeft}
              />
            </div>

            {/* 4 Player Status Cards */}
            <div className="space-y-2.5">
              {players.map((pl) => {
                const cfg = COLOR_CONFIG[pl.color];
                const isCurrentTurn = pl.color === currentTurnColor;
                const isSpeaking = speakingUserIds.has(pl.id);
                const isMuted = Boolean(mutedSpeakers[pl.id]);
                const tokensFinished = pl.tokens.filter((t) => t >= 56).length;

                return (
                  <div
                    key={pl.color}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isCurrentTurn
                        ? "bg-zinc-900/95 border-orange-500/80 shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/40"
                        : "bg-zinc-950/70 border-zinc-800/80 opacity-90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with speaking wave & turn ring */}
                      <div className="relative shrink-0">
                        <StudentAvatar
                          avatar={pl.avatar}
                          name={pl.name}
                          size="sm"
                          isOnline={true}
                        />
                        {/* Speaking Green Ripple Ring */}
                        {isSpeaking && (
                          <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
                        )}
                        {/* Player Color Marker */}
                        <span
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 shadow"
                          style={{ backgroundColor: cfg.hex }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate block">
                            {pl.name} {pl.id === user.id && "(You)"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {pl.department}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Token Home Counter & Speaker Mute Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tokens finished count */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{tokensFinished}/4</span>
                      </div>

                      {/* Individual speaker mute button (for remote players) */}
                      {pl.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleSpeakerMute(pl.id)}
                          title={isMuted ? "Unmute this player" : "Mute this player"}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isMuted
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
                          }`}
                        >
                          {isMuted ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW D: VICTORY & GAME OVER MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {gameState === "game_over" && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-orange-500/40 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                Match Finished! 🏆
              </h3>
              <p className="text-sm text-orange-400 font-bold mt-1">
                {winner.name} won the Campus Ludo Arena!
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Congratulations! Tokens reached UIU center home first.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setGameState("lobby");
                  setWinner(null);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition-all cursor-pointer"
              >
                Back to Lobby
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartGame();
                  setWinner(null);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
