"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Loader2,
  Smartphone,
  Laptop,
  Search,
  UserPlus,
  X,
  Send,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Friend, getLocalFriends } from "@/lib/friends";

interface LudoGameViewProps {
  currentProfile: UserProfile | null;
  initialRoomCode?: string | null;
  initialMode?: "random" | "custom" | null;
  onExitGame?: () => void;
  onlineStudents?: UserProfile[];
}

export default function LudoGameView({
  currentProfile,
  initialRoomCode,
  initialMode,
  onExitGame,
  onlineStudents = [],
}: LudoGameViewProps) {
  // Local student fallback if not signed in
  const user: UserProfile = useMemo(() => {
    return (
      currentProfile || {
        id: "guest_local_player",
        full_name: "UIU Campus Peer",
        department: "BS in CSE",
        batch: "2024",
        avatar: "/images/avatar-male.png",
        status: "Playing Ludo 🎲",
        email: "student@bscse.uiu.ac.bd",
      }
    );
  }, [currentProfile]);

  // Matchmaking State: "menu" | "matchmaking" | "lobby" | "playing" | "game_over"
  const [gameState, setGameState] = useState<"menu" | "matchmaking" | "lobby" | "playing" | "game_over">(
    initialRoomCode ? "lobby" : initialMode === "random" ? "matchmaking" : "menu"
  );
  const [roomId, setRoomId] = useState<string>(
    initialRoomCode || `UIU-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [joinInputCode, setJoinInputCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Cross-Platform Matchmaking Queue (Synced via campus-ludo-matchmaking presence)
  const [matchQueue, setMatchQueue] = useState<
    Array<{
      id: string;
      name: string;
      avatar: string;
      department: string;
      batch: string;
      joinedAt: number;
    }>
  >([]);
  const matchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // User host state: True if creating room, false if joining with code or initialRoomCode
  const [isHost, setIsHost] = useState<boolean>(!initialRoomCode);
  const isHostRef = useRef<boolean>(!initialRoomCode);
  const updateIsHost = (val: boolean) => {
    setIsHost(val);
    isHostRef.current = val;
  };

  // Players in room (up to 4)
  const [players, setPlayers] = useState<LudoPlayer[]>(() => {
    if (initialRoomCode) {
      return [
        {
          id: "room_host",
          name: "Room Host 👑",
          avatar: "/images/avatar-male.png",
          department: "UIU Campus",
          batch: "Host",
          color: "RED",
          isHost: true,
          isReady: true,
          tokens: [-1, -1, -1, -1],
        },
        {
          id: user.id,
          name: user.full_name,
          avatar: user.avatar,
          department: user.department,
          batch: user.batch,
          color: "GREEN",
          isHost: false,
          isReady: true,
          tokens: [-1, -1, -1, -1],
        },
      ];
    }
    return [
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
    ];
  });

  const playersRef = useRef<LudoPlayer[]>(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Synchronize host player slot whenever currentProfile arrives or updates
  useEffect(() => {
    if (currentProfile && currentProfile.id) {
      setPlayers((prev) => {
        if (!prev || prev.length === 0) return prev;
        const updated = [...prev];
        const playerIndex = updated.findIndex(
          (p) => p.id === currentProfile.id || p.id.startsWith("guest_")
        );
        if (playerIndex !== -1) {
          updated[playerIndex] = {
            ...updated[playerIndex],
            id: currentProfile.id,
            name: currentProfile.full_name,
            avatar: currentProfile.avatar,
            department: currentProfile.department,
            batch: currentProfile.batch,
          };
          return updated;
        }
        return prev;
      });
    }
  }, [currentProfile]);

  // Turn & Game Loop State
  const [currentTurnColor, setCurrentTurnColor] = useState<PlayerColor>("RED");
  const currentTurnColorRef = useRef<PlayerColor>(currentTurnColor);
  useEffect(() => {
    currentTurnColorRef.current = currentTurnColor;
  }, [currentTurnColor]);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [turnTimeLeft, setTurnTimeLeft] = useState(15);
  const [winner, setWinner] = useState<{ id: string; name: string; color: PlayerColor } | null>(null);

  // Friend Invite State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(new Set());

  const isFriendActive = useCallback((friendId: string): boolean => {
    if (onlineStudents && onlineStudents.length > 0) {
      return onlineStudents.some((s) => s.id === friendId);
    }
    return false;
  }, [onlineStudents]);

  // Load friends when modal opens, sorting active friends first
  useEffect(() => {
    if (showInviteModal && user.id) {
      const local = getLocalFriends(user.id);
      const sorted = [...local].sort((a, b) => {
        const aActive = isFriendActive(a.id);
        const bActive = isFriendActive(b.id);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return a.full_name.localeCompare(b.full_name);
      });
      setFriendsList(sorted);
    }
  }, [showInviteModal, user.id, isFriendActive]);

  const handleSendLudoInvite = (friend: Friend) => {
    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "ludo-invite",
        payload: {
          fromId: user.id,
          fromName: user.full_name,
          fromAvatar: user.avatar,
          fromDepartment: user.department,
          toId: friend.id,
          roomId: roomId,
          timestamp: Date.now(),
        },
      });
    } catch {}

    setInvitedFriendIds((prev) => new Set(prev).add(friend.id));
    showTimeoutNotice(`Invitation sent to ${friend.full_name} 🎲`);
  };

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

  // Current active turn player
  const currentTurnPlayer = players.find((p) => p.color === currentTurnColor);

  // Toast notice for 15s timeout
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const showTimeoutNotice = (msg: string) => {
    setTimeoutNotice(msg);
    setTimeout(() => setTimeoutNotice(null), 3200);
  };

  // Broadcast lobby update to all clients on Supabase channel
  const broadcastLobbyState = useCallback((ch: any, currentPlayers: LudoPlayer[]) => {
    if (!ch) return;
    const LUDO_COLORS_MAP = ["red", "green", "yellow", "blue"];
    const lobbyPayload = currentPlayers.map((p, idx) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      department: p.department,
      batch: p.batch || "2024",
      color: LUDO_COLORS_MAP[idx] || "red",
      colorIndex: idx,
      isHost: p.isHost,
      isReady: p.isReady,
      isBot: p.id.startsWith("ai_") || p.id.startsWith("bot_"),
    }));

    ch.send({
      type: "broadcast",
      event: "LOBBY_UPDATE",
      payload: {
        roomId,
        lobby: lobbyPayload,
        players: currentPlayers,
        timestamp: Date.now(),
      },
    });
  }, [roomId]);

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

    // A. Listen for DICE_ROLL (Supports both Android {playerIndex, value} and Web {diceValue, playerColor})
    channel.on("broadcast", { event: "DICE_ROLL" }, ({ payload }: any) => {
      const rolledVal = payload.diceValue ?? payload.value;
      if (rolledVal == null) return;
      ludoAudio.playDiceRoll();
      setIsRolling(true);
      setDiceValue(rolledVal);
      setTimeout(() => {
        setIsRolling(false);
        setHasRolled(true);
        setTurnTimeLeft(15);
      }, 350);
    });

    // B. Listen for MOVE_TOKEN (Supports both Android {playerIndex, tokenIndex, newStep, cutOpponent} and Web)
    channel.on("broadcast", { event: "MOVE_TOKEN" }, ({ payload }: any) => {
      ludoAudio.playTokenMove();
      const targetStep = payload.newStep ?? payload.toPos;
      const targetTokenIdx = payload.tokenIndex;
      const targetColor: PlayerColor | null = payload.playerColor 
        ?? (payload.playerIndex != null ? PLAYER_COLORS[payload.playerIndex] : null);

      if (targetColor && targetTokenIdx != null && targetStep != null) {
        setAnimatingToken({ color: targetColor, tokenIndex: targetTokenIdx });

        const cutPlayerColor: PlayerColor | null = payload.cutOpponent?.cutPlayerIndex != null 
          ? PLAYER_COLORS[payload.cutOpponent.cutPlayerIndex] 
          : payload.capturedPlayerColor;
        const cutTokenIdx = payload.cutOpponent?.cutTokenIndex ?? payload.capturedTokenIndex;

        setPlayers((prev) =>
          prev.map((pl) => {
            if (pl.color === targetColor) {
              const nextTokens = [...pl.tokens];
              nextTokens[targetTokenIdx] = targetStep;
              return { ...pl, tokens: nextTokens };
            }
            if (cutPlayerColor && pl.color === cutPlayerColor && cutTokenIdx != null) {
              ludoAudio.playCapture();
              const nextTokens = [...pl.tokens];
              nextTokens[cutTokenIdx] = -1; // Reset captured token to base
              return { ...pl, tokens: nextTokens };
            }
            return pl;
          })
        );

        setTimeout(() => setAnimatingToken(null), 400);
      }
    });

    // C. Listen for NEXT_TURN (Native Android) and TURN_CHANGE (Web)
    const handleTurnChangeReceived = (payload: any) => {
      const nextCol: PlayerColor | null = payload.nextPlayerColor 
        ?? (payload.nextTurn != null ? PLAYER_COLORS[payload.nextTurn] : null);
      if (nextCol) {
        setCurrentTurnColor(nextCol);
        setDiceValue(null);
        setHasRolled(false);
        setTurnTimeLeft(15);
      }
    };
    channel.on("broadcast", { event: "NEXT_TURN" }, ({ payload }) => handleTurnChangeReceived(payload));
    channel.on("broadcast", { event: "TURN_CHANGE" }, ({ payload }) => handleTurnChangeReceived(payload));

    // D. Listen for GAME_START (Native Android {players, initialTurn} and Web)
    channel.on("broadcast", { event: "GAME_START" }, ({ payload }: any) => {
      const receivedPlayers = payload.players || payload.androidPlayers;
      if (receivedPlayers && Array.isArray(receivedPlayers)) {
        const mappedPlayers: LudoPlayer[] = receivedPlayers.map((p: any, idx: number) => {
          const rawColor = p.color ? (typeof p.color === "string" ? p.color.toUpperCase() : PLAYER_COLORS[idx]) : PLAYER_COLORS[idx];
          const color: PlayerColor = (PLAYER_COLORS.includes(rawColor as PlayerColor) ? rawColor : PLAYER_COLORS[idx]) as PlayerColor;
          const tokens = Array.isArray(p.tokens)
            ? (typeof p.tokens[0] === "object" ? p.tokens.map((t: any) => t.step ?? -1) : p.tokens)
            : [-1, -1, -1, -1];
          return {
            id: p.id,
            name: p.name || `Player ${idx + 1}`,
            avatar: p.avatar || "/images/avatar-male.png",
            department: p.department || "BS in CSE",
            batch: p.batch || "2024",
            color,
            isHost: p.isHost ?? idx === 0,
            isReady: true,
            tokens,
          };
        });
        setPlayers(mappedPlayers);
      }
      const rawStart = payload.firstTurnColor || (payload.initialTurn != null ? PLAYER_COLORS[payload.initialTurn] : "RED");
      const startCol = (typeof rawStart === "string" ? rawStart.toUpperCase() : "RED") as PlayerColor;
      setCurrentTurnColor(PLAYER_COLORS.includes(startCol) ? startCol : "RED");
      setGameState("playing");
      setDiceValue(null);
      setHasRolled(false);
      setTurnTimeLeft(15);
    });

    // E. Listen for LOBBY_UPDATE (Native Android & Web)
    channel.on("broadcast", { event: "LOBBY_UPDATE" }, ({ payload }: any) => {
      const data = payload?.payload || payload;
      const remoteList = data?.players || data?.lobby;
      if (!remoteList || !Array.isArray(remoteList) || remoteList.length === 0) return;

      const mapped: LudoPlayer[] = remoteList.map((lp: any, idx: number) => {
        const rawCol = lp.color
          ? typeof lp.color === "string"
            ? lp.color.toUpperCase()
            : PLAYER_COLORS[idx]
          : PLAYER_COLORS[idx];
        const color: PlayerColor = (PLAYER_COLORS.includes(rawCol as PlayerColor)
          ? rawCol
          : PLAYER_COLORS[idx]) as PlayerColor;

        return {
          id: lp.id,
          name: lp.name || `Player ${idx + 1}`,
          avatar: lp.avatar || "/images/avatar-male.png",
          department: lp.department || "BS in CSE",
          batch: lp.batch || "2024",
          color,
          isHost: lp.isHost ?? idx === 0,
          isReady: lp.isReady ?? true,
          tokens: [-1, -1, -1, -1],
        };
      });

      // CRITICAL FIX: If current user is a guest, ensure they are NEVER wiped out
      // Even if host broadcasted a lobby list with only the host or missing this guest
      let finalList = mapped;
      const meFound = mapped.some((p) => p.id === user.id);
      if (!isHostRef.current && !meFound) {
        const usedColors = mapped.map((p) => p.color);
        const assignedColor = PLAYER_COLORS.find((c) => !usedColors.includes(c)) || "GREEN";
        const mePlayer: LudoPlayer = {
          id: user.id,
          name: user.full_name,
          avatar: user.avatar,
          department: user.department,
          batch: user.batch || "2024",
          color: assignedColor,
          isHost: false,
          isReady: true,
          tokens: [-1, -1, -1, -1],
        };
        finalList = [...mapped, mePlayer];
      }

      setPlayers(finalList);
      playersRef.current = finalList;

      // Verify whether the current user is host in this lobby
      const myRecord = finalList.find((p) => p.id === user.id);
      if (myRecord) {
        updateIsHost(Boolean(myRecord.isHost));
      }
    });

    // F. Listen for PLAYER_JOIN and PLAYER_JOIN_REQUEST (Web & Native)
    const handleIncomingPlayerJoin = ({ payload }: any) => {
      const data = payload?.payload || payload;
      const incoming = data?.player;
      if (!incoming || !incoming.id || incoming.id === user.id) return;

      if (isHostRef.current) {
        setPlayers((prev) => {
          if (prev.some((p) => p.id === incoming.id)) {
            broadcastLobbyState(channel, prev);
            return prev;
          }

          const usedColors = prev.map((p) => p.color);
          const nextColor = PLAYER_COLORS.find((c) => !usedColors.includes(c)) || "GREEN";
          const newPlayer: LudoPlayer = {
            id: incoming.id,
            name: incoming.name || "Campus Peer",
            avatar: incoming.avatar || "/images/avatar-male.png",
            department: incoming.department || "BS in CSE",
            batch: incoming.batch || "2024",
            color: nextColor,
            isHost: false,
            isReady: true,
            tokens: [-1, -1, -1, -1],
          };

          const updated = [...prev, newPlayer];
          playersRef.current = updated;
          broadcastLobbyState(channel, updated);
          return updated;
        });
      }
    };
    channel.on("broadcast", { event: "PLAYER_JOIN" }, handleIncomingPlayerJoin);
    channel.on("broadcast", { event: "PLAYER_JOIN_REQUEST" }, handleIncomingPlayerJoin);

    // G. Listen for REQUEST_LOBBY and REQUEST_LOBBY_STATE
    const handleIncomingLobbyRequest = () => {
      if (isHostRef.current) {
        broadcastLobbyState(channel, playersRef.current);
      }
    };
    channel.on("broadcast", { event: "REQUEST_LOBBY" }, handleIncomingLobbyRequest);
    channel.on("broadcast", { event: "REQUEST_LOBBY_STATE" }, handleIncomingLobbyRequest);

    // H. Listen for PLAYER_LEFT
    channel.on("broadcast", { event: "PLAYER_LEFT" }, ({ payload }: any) => {
      const leftUserId = payload?.userId || payload?.playerId;
      const leftPlayerName = payload?.playerName;
      const leftColor = payload?.playerColor;

      if (leftUserId || leftColor) {
        showTimeoutNotice(`${leftPlayerName || "A player"} ber hoye gese (left match) 🏃‍♂️`);
        ludoAudio.playCapture();

        // If currently in lobby, remove them from the slot
        if (gameStateRef.current === "lobby") {
          setPlayers((prev) => prev.filter((p) => p.id !== leftUserId));
          if (isHostRef.current) {
            setTimeout(() => {
              broadcastLobbyState(channel, playersRef.current);
            }, 100);
          }
          return;
        }

        // If in playing match: mark hasLeft: true and empty their tokens (guti faka hoye jabe)
        setPlayers((prev) => {
          const updated = prev.map((pl) => {
            if (pl.id === leftUserId || (leftColor && pl.color === leftColor)) {
              return {
                ...pl,
                hasLeft: true,
                tokens: [], // Guti faka hoye jabe! Board theke sob guti clear
              };
            }
            return pl;
          });

          // Check if only 1 active player remains
          const activeRemaining = updated.filter((p) => !p.hasLeft && p.tokens.length > 0);
          if (activeRemaining.length === 1 && gameStateRef.current === "playing") {
            const loneWinner = activeRemaining[0];
            setTimeout(() => {
              handleGameOverRef.current(loneWinner.color, loneWinner.id, loneWinner.name);
            }, 600);
          }

          return updated;
        });

        // If the player who left had the active turn, advance turn immediately
        if (
          currentTurnColorRef.current === leftColor ||
          playersRef.current.find((p) => p.id === leftUserId)?.color === currentTurnColorRef.current
        ) {
          setTimeout(() => {
            handlePassTurnRef.current();
          }, 350);
        }
      }
    });

    // I. Listen for GAME_OVER
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

    // J. Presence: Track who is joined & Auto-sync lobby
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUsers: any[] = [];
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p && p.id && !onlineUsers.some((u) => u.id === p.id)) {
            onlineUsers.push(p);
          }
        });
      });

      // If in playing match, check if any active human player dropped out
      if (gameStateRef.current === "playing") {
        let presenceDropped = false;
        const currentList = [...playersRef.current];
        currentList.forEach((pl) => {
          const isBot = pl.id.startsWith("ai_") || pl.id.startsWith("bot_");
          if (!isBot && pl.id !== user.id && !pl.hasLeft) {
            const isOnline = onlineUsers.some((u) => u.id === pl.id);
            if (!isOnline) {
              pl.hasLeft = true;
              pl.tokens = []; // Guti faka
              presenceDropped = true;
              showTimeoutNotice(`${pl.name} ber hoye gese (disconnected) 🏃‍♂️`);
              if (currentTurnColorRef.current === pl.color) {
                setTimeout(() => {
                  handlePassTurnRef.current();
                }, 350);
              }
            }
          }
        });

        if (presenceDropped) {
          setPlayers(currentList);
          const activeRemaining = currentList.filter((p) => !p.hasLeft && p.tokens.length > 0);
          if (activeRemaining.length === 1) {
            setTimeout(() => {
              handleGameOverRef.current(activeRemaining[0].color, activeRemaining[0].id, activeRemaining[0].name);
            }, 600);
          }
        }
      }

      // If we are Host, inspect online peers and ensure all connected users are represented in the lobby
      if (isHostRef.current && gameStateRef.current === "lobby") {
        let changed = false;
        let currentList = [...playersRef.current];

        onlineUsers.forEach((presUser) => {
          if (presUser.id !== user.id && !currentList.some((p) => p.id === presUser.id)) {
            const usedColors = currentList.map((p) => p.color);
            const nextColor = PLAYER_COLORS.find((c) => !usedColors.includes(c));
            if (nextColor && currentList.length < 4) {
              currentList.push({
                id: presUser.id,
                name: presUser.name || "Campus Peer",
                avatar: presUser.avatar || "/images/avatar-male.png",
                department: presUser.department || "BS in CSE",
                batch: presUser.batch || "2024",
                color: nextColor,
                isHost: false,
                isReady: true,
                tokens: [-1, -1, -1, -1],
              });
              changed = true;
            }
          }
        });

        if (changed) {
          setPlayers(currentList);
          broadcastLobbyState(channel, currentList);
        } else {
          broadcastLobbyState(channel, currentList);
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: user.id,
          name: user.full_name,
          department: user.department,
          avatar: user.avatar,
          batch: user.batch || "2024",
          isHost: isHostRef.current,
          joinedAt: Date.now(),
        });

        if (!isHostRef.current) {
          // Guest: announce join and request current lobby state from host
          const guestMe: LudoPlayer = {
            id: user.id,
            name: user.full_name,
            avatar: user.avatar,
            department: user.department,
            batch: user.batch || "2024",
            color: "GREEN",
            isHost: false,
            isReady: true,
            tokens: [-1, -1, -1, -1],
          };

          const joinPayload = {
            roomId,
            player: guestMe,
            timestamp: Date.now(),
          };

          // Send both Web and Native Android join events
          channel.send({
            type: "broadcast",
            event: "PLAYER_JOIN",
            payload: joinPayload,
          });

          channel.send({
            type: "broadcast",
            event: "PLAYER_JOIN_REQUEST",
            payload: { player: guestMe },
          });

          // Send both Web and Native Android lobby request events
          channel.send({
            type: "broadcast",
            event: "REQUEST_LOBBY",
            payload: {
              roomId,
              userId: user.id,
              userName: user.full_name,
              timestamp: Date.now(),
            },
          });

          channel.send({
            type: "broadcast",
            event: "REQUEST_LOBBY_STATE",
            payload: { requesterId: user.id },
          });

          // Secondary ping after 450ms to ensure Android host catches join even across subscription races
          setTimeout(() => {
            if (channelRef.current && !isHostRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "PLAYER_JOIN",
                payload: joinPayload,
              });
              channelRef.current.send({
                type: "broadcast",
                event: "PLAYER_JOIN_REQUEST",
                payload: { player: guestMe },
              });
              channelRef.current.send({
                type: "broadcast",
                event: "REQUEST_LOBBY",
                payload: {
                  roomId,
                  userId: user.id,
                  userName: user.full_name,
                  timestamp: Date.now(),
                },
              });
            }
          }, 450);
        } else {
          // Host: broadcast current lobby state
          broadcastLobbyState(channel, playersRef.current);
        }
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user.id, user.full_name, user.department, user.avatar, user.batch, broadcastLobbyState]);

  // -------------------------------------------------------------------
  // 2. TURN PASSING, GAME OVER & LOBBY START HELPERS
  // -------------------------------------------------------------------

  // Handle Game Over
  const handleGameOver = useCallback((winnerColor: PlayerColor, winnerId: string, winnerName: string) => {
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
  }, [players, roomId]);

  // Pass Turn to next active player (Broadcasts both NEXT_TURN and TURN_CHANGE)
  const handlePassTurn = useCallback(() => {
    // Only pass turn between players who have NOT left and still have active tokens
    const activePlayers = players.filter((p) => !p.hasLeft && p.tokens.length > 0);
    if (activePlayers.length === 0) return;

    if (activePlayers.length === 1 && gameState === "playing") {
      const loneWinner = activePlayers[0];
      handleGameOver(loneWinner.color, loneWinner.id, loneWinner.name);
      return;
    }

    const activeColors = activePlayers.map((p) => p.color);
    const currentIndex = activeColors.indexOf(currentTurnColor);
    const nextIndex = (currentIndex + 1) % activeColors.length;
    const nextColor = activeColors[nextIndex] || activeColors[0] || "RED";
    const nextPlayer = activePlayers.find((p) => p.color === nextColor);

    setCurrentTurnColor(nextColor);
    setDiceValue(null);
    setHasRolled(false);
    setTurnTimeLeft(15);

    const androidTurnIdx = PLAYER_COLORS.indexOf(nextColor);

    // 1. Broadcast NEXT_TURN (Native Android)
    channelRef.current?.send({
      type: "broadcast",
      event: "NEXT_TURN",
      payload: {
        nextTurn: androidTurnIdx >= 0 ? androidTurnIdx : nextIndex,
      },
    });

    // 2. Broadcast TURN_CHANGE (Web)
    channelRef.current?.send({
      type: "broadcast",
      event: "TURN_CHANGE",
      payload: {
        roomId,
        nextPlayerId: nextPlayer?.id || "",
        nextPlayerColor: nextColor,
        turnIndex: nextIndex,
        nextTurn: androidTurnIdx >= 0 ? androidTurnIdx : nextIndex,
        timestamp: Date.now(),
      } as TurnChangePayload,
    });
  }, [players, currentTurnColor, roomId, gameState, handleGameOver]);

  const handlePassTurnRef = useRef(handlePassTurn);
  const handleGameOverRef = useRef(handleGameOver);
  useEffect(() => {
    handlePassTurnRef.current = handlePassTurn;
    handleGameOverRef.current = handleGameOver;
  }, [handlePassTurn, handleGameOver]);

  // Start Game (Host only in private lobby)
  const handleStartGame = useCallback(() => {
    // Only the verified room host can launch
    if (!isHostRef.current) {
      showTimeoutNotice("Only the room host can launch the match.");
      return;
    }

    const current = playersRef.current;
    if (current.length < 2) {
      showTimeoutNotice("At least 2 players are required to start the match.");
      return;
    }

    // Start with joined players directly (2, 3, or 4 players - NO bots added for custom room)
    const finalPlayers = [...current];

    setPlayers(finalPlayers);
    setGameState("playing");
    setCurrentTurnColor("RED");
    setTurnTimeLeft(15);

    // Broadcast GAME_START to all devices (Android and Web compatible)
    const LUDO_COLORS_MAP = ["red", "green", "yellow", "blue"];
    const androidPlayersPayload = finalPlayers.map((p, idx) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      department: p.department,
      batch: p.batch || "2024",
      color: LUDO_COLORS_MAP[idx] || "red",
      colorIndex: idx,
      isHost: p.isHost,
      isReady: p.isReady,
      isBot: p.id.startsWith("ai_") || p.id.startsWith("bot_"),
      tokens: p.tokens,
    }));

    channelRef.current?.send({
      type: "broadcast",
      event: "GAME_START",
      payload: {
        roomId,
        players: finalPlayers,
        androidPlayers: androidPlayersPayload,
        initialTurn: 0,
        firstTurnColor: "RED",
        timestamp: Date.now(),
      },
    });
  }, [roomId]);

  // -------------------------------------------------------------------
  // 3. TURN TIMEOUT (15s LIMIT) & AUTOMATIC PASS LOGIC
  // -------------------------------------------------------------------
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          // 15 SECONDS LIMIT EXPIRED!
          if (isMyTurn) {
            showTimeoutNotice("15s time up! Your turn has passed.");
            handlePassTurn();
          } else if (myPlayer?.isHost) {
            // As host, pass for inactive/disconnected player
            const inactivePlayer = players.find((p) => p.color === currentTurnColor);
            showTimeoutNotice(`15s time up! ${inactivePlayer?.name || "Player"}'s turn passed.`);
            handlePassTurn();
          }
          return 15;
        }

        // Warning sound on last 3 seconds
        if (prev <= 4 && isMyTurn) {
          ludoAudio.playTokenMove();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isMyTurn, currentTurnColor, myPlayer?.isHost, players]);

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

  // -------------------------------------------------------------------
  // 3. CROSS-PLATFORM RANDOM MATCHMAKING ENGINE
  // (Syncs with Native Android campus-ludo-matchmaking channel)
  // -------------------------------------------------------------------

  // Start Quick Match Queue
  const handleStartQuickMatch = useCallback(() => {
    setGameState("matchmaking");
    setMatchQueue([]);

    if (matchChannelRef.current) {
      supabase.removeChannel(matchChannelRef.current);
      matchChannelRef.current = null;
    }

    const matchChannel = supabase.channel("campus-ludo-matchmaking", {
      config: {
        presence: { key: user.id },
        broadcast: { self: false },
      },
    });
    matchChannelRef.current = matchChannel;

    // A. Sync queue presence
    matchChannel.on("presence", { event: "sync" }, () => {
      const state = matchChannel.presenceState();
      const waitingList: Array<{
        id: string;
        name: string;
        avatar: string;
        department: string;
        batch: string;
        joinedAt: number;
      }> = [];

      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p && p.id && !waitingList.some((item) => item.id === p.id)) {
            waitingList.push(p);
          }
        });
      });

      waitingList.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      setMatchQueue(waitingList);

      // Deterministic Coordinator: Oldest waiting student triggers match launch when 4 join
      const isCoordinator = waitingList[0]?.id === user.id;
      if (isCoordinator && waitingList.length >= 4) {
        launchQuickMatch(waitingList.slice(0, 4));
      }
    });

    // B. Listen for match launch broadcast from coordinator (Android or Web)
    matchChannel.on("broadcast", { event: "LUDO_MATCH_START" }, ({ payload }) => {
      const { matchedIds, roomCode: matchedCode, players: matchedLobby } = payload || {};
      if (matchedIds && Array.isArray(matchedIds) && matchedIds.includes(user.id)) {
        if (matchChannelRef.current) {
          supabase.removeChannel(matchChannelRef.current);
          matchChannelRef.current = null;
        }

        setRoomId(matchedCode);

        // Build game players for Ludo Board
        const initialGamePlayers: LudoPlayer[] = (matchedLobby || []).map((lp: any, idx: number) => {
          const color = PLAYER_COLORS[idx] || "RED";
          return {
            id: lp.id,
            name: lp.name || `Player ${idx + 1}`,
            avatar: lp.avatar || "/images/avatar-male.png",
            department: lp.department || "BS in CSE",
            batch: lp.batch || "2024",
            color,
            isHost: idx === 0,
            isReady: true,
            tokens: [-1, -1, -1, -1],
          };
        });

        const isMeCoordinator = initialGamePlayers[0]?.id === user.id;
        updateIsHost(isMeCoordinator);
        setPlayers(initialGamePlayers);
        setCurrentTurnColor("RED");
        setDiceValue(null);
        setHasRolled(false);
        setTurnTimeLeft(15);
        setGameState("playing");
      }
    });

    // C. Subscribe and track presence
    matchChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await matchChannel.track({
          id: user.id,
          name: user.full_name || "UIU Student",
          avatar: user.avatar || "/images/avatar-male.png",
          department: user.department || "BS in CSE",
          batch: user.batch || "2024",
          joinedAt: Date.now(),
        });
      }
    });
  }, [user.id, user.full_name, user.avatar, user.department, user.batch]);

  // Coordinator helper to trigger matched game
  const launchQuickMatch = (group: typeof matchQueue) => {
    if (!matchChannelRef.current) return;
    const newCode = `UIU-Q${Math.floor(100 + Math.random() * 900)}`;

    const LUDO_COLORS_LOWER = ["red", "green", "yellow", "blue"];
    const groupLobby: any[] = group.map((u, idx) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      department: u.department,
      batch: u.batch,
      color: LUDO_COLORS_LOWER[idx],
      colorIndex: idx,
      isHost: idx === 0,
      isReady: true,
      isBot: false,
    }));

    // If fewer than 4 players, fill remaining with AI peers so game can start
    const botNames = ["UIU Bot Green 🤖", "Campus Bot Yellow ⚡", "CSE Bot Blue 🎮"];
    while (groupLobby.length < 4) {
      const idx = groupLobby.length;
      groupLobby.push({
        id: `bot_${idx}_${Date.now()}`,
        name: botNames[idx - 1] || `Campus Bot ${idx + 1} 🤖`,
        avatar: idx % 2 === 0 ? "/images/avatar-male.png" : "/images/avatar-female.png",
        department: "BS in CSE",
        batch: "AI",
        color: LUDO_COLORS_LOWER[idx],
        colorIndex: idx,
        isHost: false,
        isReady: true,
        isBot: true,
      });
    }

    matchChannelRef.current.send({
      type: "broadcast",
      event: "LUDO_MATCH_START",
      payload: {
        matchedIds: group.map((u) => u.id),
        roomCode: newCode,
        players: groupLobby,
      },
    });

    if (matchChannelRef.current) {
      supabase.removeChannel(matchChannelRef.current);
      matchChannelRef.current = null;
    }

    setRoomId(newCode);

    const initialGamePlayers: LudoPlayer[] = groupLobby.map((lp: any, idx: number) => {
      const color = PLAYER_COLORS[idx] || "RED";
      return {
        id: lp.id,
        name: lp.name,
        avatar: lp.avatar,
        department: lp.department,
        batch: lp.batch || "2024",
        color,
        isHost: idx === 0,
        isReady: true,
        tokens: [-1, -1, -1, -1],
      };
    });

    const isCoordinator = group[0]?.id === user.id;
    updateIsHost(isCoordinator);
    setPlayers(initialGamePlayers);
    setCurrentTurnColor("RED");
    setDiceValue(null);
    setHasRolled(false);
    setTurnTimeLeft(15);
    setGameState("playing");
  };

  // Cancel Matchmaking
  const handleCancelMatchmaking = () => {
    if (matchChannelRef.current) {
      supabase.removeChannel(matchChannelRef.current);
      matchChannelRef.current = null;
    }
    setMatchQueue([]);
    setGameState("menu");
  };

  // Auto trigger random match if initiated via URL param
  useEffect(() => {
    if (initialMode === "random" && gameState === "matchmaking") {
      handleStartQuickMatch();
    }
    return () => {
      if (matchChannelRef.current) {
        supabase.removeChannel(matchChannelRef.current);
        matchChannelRef.current = null;
      }
    };
  }, [initialMode, handleStartQuickMatch]);

  // Create Custom Room helper (Host role)
  const handleCreateCustomRoom = () => {
    const customCode = `UIU-${Math.floor(1000 + Math.random() * 9000)}`;
    updateIsHost(true);
    setPlayers([
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
    setRoomId(customCode);
    setGameState("lobby");
  };

  // Join Room by Code helper (Guest role)
  const handleJoinByCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    updateIsHost(false);
    // Initialize as non-host guest with host slot ready so both appear immediately in lobby
    setPlayers([
      {
        id: "room_host",
        name: "Room Host 👑",
        avatar: "/images/avatar-male.png",
        department: "UIU Campus",
        batch: "Host",
        color: "RED",
        isHost: true,
        isReady: true,
        tokens: [-1, -1, -1, -1],
      },
      {
        id: user.id,
        name: user.full_name,
        avatar: user.avatar,
        department: user.department,
        batch: user.batch || "2024",
        color: "GREEN",
        isHost: false,
        isReady: true,
        tokens: [-1, -1, -1, -1],
      },
    ]);
    setRoomId(clean);
    setGameState("lobby");
  };

  // Unified Exit Game / Match handler (Broadcasts PLAYER_LEFT so opponent board clears tokens)
  const handleExitMatchOrMenu = () => {
    if (channelRef.current) {
      if (gameState === "playing" || gameState === "lobby") {
        channelRef.current.send({
          type: "broadcast",
          event: "PLAYER_LEFT",
          payload: {
            roomId,
            userId: user.id,
            playerId: user.id,
            playerName: user.full_name,
            playerColor: myColor,
            reason: "User exited match",
          },
        }).catch(() => {});
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (matchChannelRef.current) {
      supabase.removeChannel(matchChannelRef.current);
      matchChannelRef.current = null;
    }
    if (gameState !== "menu") {
      setGameState("menu");
      setRoomId(`UIU-${Math.floor(1000 + Math.random() * 9000)}`);
      updateIsHost(true);
      setPlayers([
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
    } else if (onExitGame) {
      onExitGame();
    }
  };

  // Leave Lobby helper
  const handleLeaveLobby = () => {
    handleExitMatchOrMenu();
  };

  // -------------------------------------------------------------------
  // 4. GAME ACTIONS & TWO-WAY BROADCAST HANDLERS
  // -------------------------------------------------------------------

  // Roll Dice Action (Supports both Android & Web protocol)
  const handleRollDice = () => {
    if (!isMyTurn || hasRolled || isRolling || myColor === null) return;

    setIsRolling(true);
    const rolled = Math.floor(Math.random() * 6) + 1;
    setDiceValue(rolled);
    ludoAudio.playDiceRoll();

    const colorIndex = PLAYER_COLORS.indexOf(myColor);

    // Broadcast DICE_ROLL with both Android ({playerIndex, value}) and Web ({diceValue, playerColor}) keys
    channelRef.current?.send({
      type: "broadcast",
      event: "DICE_ROLL",
      payload: {
        playerIndex: colorIndex >= 0 ? colorIndex : 0,
        value: rolled,
        diceValue: rolled,
        playerColor: myColor,
        roomId,
        playerId: user.id,
        timestamp: Date.now(),
      },
    });

    setTimeout(() => {
      setIsRolling(false);
      setHasRolled(true);
      setTurnTimeLeft(15);
    }, 350);
  };

  // Move Token Action (Supports both Android & Web protocol)
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

    const myColorIdx = PLAYER_COLORS.indexOf(myColor);
    const cutOpp =
      captureResult.isCaptured &&
      captureResult.capturedPlayerColor &&
      captureResult.capturedTokenIndex !== null
        ? {
            cutPlayerIndex: PLAYER_COLORS.indexOf(captureResult.capturedPlayerColor),
            cutTokenIndex: captureResult.capturedTokenIndex,
          }
        : null;

    // Broadcast MOVE_TOKEN with both Android ({playerIndex, tokenIndex, newStep, cutOpponent}) and Web fields
    channelRef.current?.send({
      type: "broadcast",
      event: "MOVE_TOKEN",
      payload: {
        playerIndex: myColorIdx >= 0 ? myColorIdx : 0,
        tokenIndex,
        newStep: nextStep,
        cutOpponent: cutOpp,
        extraTurnReason:
          diceValue === 6
            ? "Rolled 6! Extra turn 🎲"
            : captureResult.isCaptured
            ? "Captured opponent! Extra turn ⚔️"
            : null,
        roomId,
        playerId: user.id,
        playerColor: myColor,
        fromPos: currentStep,
        toPos: nextStep,
        isCaptured: captureResult.isCaptured,
        capturedPlayerColor: captureResult.capturedPlayerColor,
        capturedTokenIndex: captureResult.capturedTokenIndex,
        timestamp: Date.now(),
      },
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
            onClick={handleExitMatchOrMenu}
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

          {gameState === "playing" && (
            <button
              type="button"
              onClick={handleExitMatchOrMenu}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Exit Ludo Match"
            >
              <span>Exit Match</span>
            </button>
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

      {/* 15s Timeout Notice Floating Toast */}
      {timeoutNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-rose-950/95 border border-rose-500/50 text-rose-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>{timeoutNotice}</span>
        </div>
      )}

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
            {/* Quick Random Match (Cross-Platform with Android) */}
            <button
              type="button"
              onClick={handleStartQuickMatch}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-600/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer group"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Random Quick Match (Auto Queue)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 border border-white/30 text-white">
                Live
              </span>
            </button>

            {/* Create Custom Room */}
            <button
              type="button"
              onClick={handleCreateCustomRoom}
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
              placeholder="e.g. UIU-4821 or UIU-Q105"
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 uppercase tracking-wider"
            />
            <button
              type="button"
              disabled={!joinInputCode.trim()}
              onClick={() => handleJoinByCode(joinInputCode)}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-95 cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW B: CROSS-PLATFORM RANDOM MATCHMAKING QUEUE               */}
      {/* ------------------------------------------------------------- */}
      {gameState === "matchmaking" && (
        <div className="w-full max-w-lg mt-8 p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-orange-500/30 shadow-2xl backdrop-blur-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-orange-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Searching for Campus Students...
            </h2>
            <p className="text-xs text-zinc-400">
              Cross-platform matchmaking with UIU Android App & Web students
            </p>
          </div>

          {/* Queue Slots Indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-1">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                <span>Matchmaking Pool</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono">
                {matchQueue.length}/4 Joined
              </span>
            </div>

            {/* 4 Player Slots */}
            <div className="grid grid-cols-1 gap-2.5">
              {[0, 1, 2, 3].map((slotIdx) => {
                const player = matchQueue[slotIdx];
                const slotColor = PLAYER_COLORS[slotIdx];
                const cfg = COLOR_CONFIG[slotColor];

                if (player) {
                  const isMe = player.id === user.id;
                  const isCoordinator = slotIdx === 0;

                  return (
                    <div
                      key={player.id}
                      className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-700/80 flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <StudentAvatar
                            avatar={player.avatar || "/images/avatar-male.png"}
                            name={player.name}
                            size="md"
                          />
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 shadow-sm"
                            style={{ backgroundColor: cfg.hex }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                              {player.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold">
                                You
                              </span>
                            )}
                            {isCoordinator && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span>{player.department || "UIU Student"}</span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500">Slot {slotIdx + 1} ({cfg.name})</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ready</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`slot-${slotIdx}`}
                    className="p-3 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800 flex items-center justify-between gap-3 text-zinc-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-semibold text-zinc-500 block">
                          Waiting for peer...
                        </span>
                        <span className="text-[10px] text-zinc-600">Slot {slotIdx + 1} ({cfg.name})</span>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-zinc-800 animate-pulse" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Area */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3 text-xs text-orange-300">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0 animate-spin" />
              <span>
                {matchQueue.length < 4
                  ? `Waiting for 4 students (${matchQueue.length}/4)... 4 jon dhukle match auto start hoye jabe!`
                  : `4 students joined! Match auto starting now...`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancelMatchmaking}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-bold text-xs border border-zinc-700 transition-all active:scale-98 cursor-pointer"
            >
              Cancel Matchmaking
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
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handleLeaveLobby}
                className="mt-0.5 p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Leave Lobby"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Matchmaking Lobby</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                    {players.length}/4 Joined
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {isHost
                    ? "Share this room code with campus friends. As host, you can launch when ready."
                    : "Connected to room! Waiting for room host to launch the match."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
                title="Invite active friends to this room"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="font-mono tracking-wider">{roomId}</span>
              </button>
            </div>
          </div>

          {/* 4 Player Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PLAYER_COLORS.map((color, idx) => {
              const assignedPlayer = players.find(
                (p) => p.color === color || (typeof p.color === "string" && p.color.toUpperCase() === color)
              );
              const cfg = COLOR_CONFIG[color];
              const isMe = assignedPlayer?.id === user.id;

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
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
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
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100 truncate max-w-[120px]">
                              {assignedPlayer.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold shrink-0">
                                You
                              </span>
                            )}
                            {assignedPlayer.isHost && (
                              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">
                                <Crown className="w-3 h-3 text-amber-400" />
                                Host
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {assignedPlayer.department} • {assignedPlayer.batch || "2024"}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0"
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

          {/* Lobby Launch Button for Host / Waiting state for Guest */}
          <div className="pt-2">
            {isHost ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                  <span>You are the Host • Launch match when at least 2 players have joined</span>
                </span>

                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                    players.length >= 2
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-600/30 active:scale-95 cursor-pointer"
                      : "bg-zinc-800 text-zinc-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {players.length >= 2
                      ? `Launch Match Now (${players.length} Players)`
                      : `Waiting for Players (${players.length}/2 joined)`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-4 rounded-2xl bg-zinc-950/80 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-100 block">
                      Waiting for Room Host to launch match...
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Host: <strong className="text-amber-400">{players.find((p) => p.isHost)?.name || "Room Creator"}</strong> • Match will launch automatically on your screen once host starts.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected & Ready
                  </span>
                </div>
              </div>
            )}
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
                currentTurnPlayerName={currentTurnPlayer?.name}
                diceValue={diceValue}
                isRolling={isRolling}
                canRoll={isMyTurn && !hasRolled}
                hasRolled={hasRolled}
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
                currentTurnPlayerName={currentTurnPlayer?.name}
                diceValue={diceValue}
                isRolling={isRolling}
                canRoll={isMyTurn && !hasRolled}
                hasRolled={hasRolled}
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
                const tokensFinished = pl.tokens ? pl.tokens.filter((t) => t >= 56).length : 0;

                if (pl.hasLeft) {
                  return (
                    <div
                      key={pl.color}
                      className="p-3 sm:p-3.5 rounded-2xl border border-dashed border-rose-900/40 bg-zinc-950/40 opacity-55 flex items-center justify-between gap-3 text-zinc-500"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0 grayscale opacity-40">
                          <StudentAvatar
                            avatar={pl.avatar}
                            name={pl.name}
                            size="sm"
                            isOnline={false}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-400 line-through block truncate">
                            {pl.name}
                          </span>
                          <span className="text-[10px] text-rose-400 font-bold block">
                            Ber hoye gese (Vacated)
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold shrink-0">
                        Left
                      </span>
                    </div>
                  );
                }

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

                    {/* Right side: 15s Timer Badge, Token Home Counter & Speaker Mute Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active 15s Countdown Badge */}
                      {isCurrentTurn && (
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                            turnTimeLeft <= 4
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                              : "bg-orange-500/15 text-orange-400 border-orange-500/30"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{turnTimeLeft}s</span>
                        </div>
                      )}

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
      {/* VIEW: INVITE ACTIVE FRIENDS MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Invite Friends to Ludo</h3>
                  <p className="text-xs text-zinc-400">
                    Room Code: <span className="font-mono text-orange-400 font-bold">{roomId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Friends list container */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {friendsList.length === 0 ? (
                <div className="text-center py-8 px-4 text-zinc-500 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                  <p className="text-zinc-400 font-medium">No friends added yet.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Connect with classmates in Campus Lounge to invite them to your matches!</p>
                </div>
              ) : (
                friendsList.map((f) => {
                  const active = isFriendActive(f.id);
                  const isInvited = invitedFriendIds.has(f.id);

                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-900/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <StudentAvatar
                            avatar={f.avatar}
                            name={f.full_name}
                            size="md"
                            isOnline={active}
                          />
                          {active && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate block">
                              {f.full_name}
                            </span>
                            {active ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shrink-0">
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-500 font-medium shrink-0">
                                Offline
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block truncate">
                            {f.department || "UIU Student"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendLudoInvite(f)}
                        disabled={isInvited}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                          isInvited
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : active
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 active:scale-95"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {isInvited ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Sent ✓</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Invite</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Share Code Footer */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>Direct Room Code: <strong className="font-mono text-white">{roomId}</strong></span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-orange-400 hover:text-orange-300 font-bold cursor-pointer"
              >
                {copiedCode ? "Copied!" : "Copy Code"}
              </button>
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
