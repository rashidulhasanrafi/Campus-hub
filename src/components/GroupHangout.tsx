"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  isTrackReference,
} from "@livekit/components-react";
import { Track, RoomEvent, RemoteParticipant } from "livekit-client";
import { UserProfile, supabase } from "@/lib/supabase";
import {
  CAMPUS_HANGOUT_ROOMS,
  HangoutRoomConfig,
  fetchLiveKitToken,
} from "@/lib/livekit";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  Plus,
  X,
  Lock,
  Pin,
  PinOff,
  MessageSquare,
  Send,
  Smile,
  Sparkles,
  Shield,
  Check,
  AlertCircle,
  KeyRound,
  Search,
  Copy,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Hash,
  FlipHorizontal,
} from "lucide-react";
import confetti from "canvas-confetti";

interface GroupHangoutProps {
  currentProfile: UserProfile | null;
  initialRoomId?: string | null;
  onInCallChange?: (inCall: boolean) => void;
}

export default function GroupHangout({
  currentProfile,
  initialRoomId,
  onInCallChange,
}: GroupHangoutProps) {
  const [rooms, setRooms] = useState<HangoutRoomConfig[]>(CAMPUS_HANGOUT_ROOMS);
  const [activeRoom, setActiveRoom] = useState<HangoutRoomConfig | null>(null);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync call state with parent to hide navigation bars
  useEffect(() => {
    const inCall = Boolean(activeRoom && livekitToken);
    onInCallChange?.(inCall);
    return () => {
      onInCallChange?.(false);
    };
  }, [activeRoom, livekitToken, onInCallChange]);

  // Create Room Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nextRoomCode, setNextRoomCode] = useState("");
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [newRoomTag, setNewRoomTag] = useState("Casual");
  const [newRoomEmoji, setNewRoomEmoji] = useState("🍔");
  const [newRoomPassword, setNewRoomPassword] = useState("");

  // Password Prompt Modal state
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<HangoutRoomConfig | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Copy Room Code helper
  const handleCopyRoomCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {}
  };

  const handleOpenCreateModal = () => {
    const code = `UIU-${Math.floor(1000 + Math.random() * 9000)}`;
    setNextRoomCode(code);
    setCreateModalOpen(true);
  };

  // 1. Fetch persistent rooms from Supabase on mount & listen to real-time additions
  // Helper to format Supabase database row into a HangoutRoomConfig
  const formatDbRoom = (d: any): HangoutRoomConfig => {
    const parts = (d.title || "").split(" ");
    const lastPart = parts[parts.length - 1];
    const isEmoji = /\p{Extended_Pictographic}/u.test(lastPart);
    const emoji = isEmoji ? lastPart : "💬";
    const name = d.title || "Campus Hangout";

    let code = "UIU-ROOM";
    if (d.id) {
      const match = d.id.match(/uiu(\d+)/i);
      if (match) {
        code = `UIU-${match[1]}`;
      } else if (d.id.includes("uiu-")) {
        code = `UIU-${d.id.split("uiu-")[1].split("_")[0].toUpperCase()}`;
      } else {
        code = `UIU-${d.id.slice(0, 4).toUpperCase()}`;
      }
    }

    return {
      id: d.id,
      code,
      name,
      topic: d.topic || "Campus group discussion and hangout.",
      emoji,
      tag: "Community",
      maxParticipants: d.max_participants || 8,
      gradient: "from-zinc-900 to-zinc-900/60 border-zinc-800",
      hostName: d.host_name,
      hostId: d.host_id,
      isCustom: true,
    };
  };

  // 1. Fetch persistent rooms from Supabase on mount & listen to real-time additions
  useEffect(() => {
    let isMounted = true;

    const loadPersistedRooms = async () => {
      try {
        const { data, error } = await supabase
          .from("hangout_rooms")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0 && isMounted) {
          const remoteRooms: HangoutRoomConfig[] = data.map(formatDbRoom);

          setRooms((prev) => {
            const remoteMap = new Map(remoteRooms.map((r) => [r.id, r]));
            const presets = CAMPUS_HANGOUT_ROOMS.filter((p) => !remoteMap.has(p.id));
            return [...remoteRooms, ...presets];
          });
        }
      } catch (err) {
        console.warn("Could not load persisted rooms:", err);
      }
    };

    loadPersistedRooms();

    // Supabase Realtime channel for live room announcements & database inserts
    const lobbyChannel = supabase.channel("campus-hangout-lobby");

    lobbyChannel
      .on("broadcast", { event: "room-created" }, (payload) => {
        if (payload?.payload && isMounted) {
          const newRoom = payload.payload as HangoutRoomConfig;
          setRooms((prev) => {
            if (prev.some((r) => r.id === newRoom.id)) return prev;
            return [newRoom, ...prev];
          });
        }
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hangout_rooms" },
        (payload) => {
          if (payload?.new && isMounted) {
            const mapped = formatDbRoom(payload.new);
            setRooms((prev) => {
              if (prev.some((r) => r.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
          }
        }
      );

    lobbyChannel.subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(lobbyChannel);
    };
  }, []);

  // Handle deep-link / initial room join
  useEffect(() => {
    if (initialRoomId && !activeRoom) {
      const target = rooms.find((r) => r.id === initialRoomId || r.code === initialRoomId);
      if (target) {
        if (target.password && target.password.trim().length > 0) {
          setPasswordPromptRoom(target);
          setEnteredPassword("");
          setPasswordError("");
        } else {
          handleJoinRoom(target);
        }
      }
    }
  }, [initialRoomId, rooms, activeRoom]);

  const filteredRooms = rooms.filter((r) => {
    const matchesTag =
      selectedTag === "All" || r.tag.toLowerCase() === selectedTag.toLowerCase();
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return matchesTag;

    const cleanQuery = rawQuery.replace(/[^a-z0-9]/g, "");
    const cleanCode = (r.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    const matchesSearch =
      r.name.toLowerCase().includes(rawQuery) ||
      r.topic.toLowerCase().includes(rawQuery) ||
      r.tag.toLowerCase().includes(rawQuery) ||
      (r.code && r.code.toLowerCase().includes(rawQuery)) ||
      (cleanCode && cleanQuery && cleanCode.includes(cleanQuery)) ||
      r.id.toLowerCase().includes(rawQuery) ||
      (r.hostName && r.hostName.toLowerCase().includes(rawQuery));

    return matchesTag && matchesSearch;
  });

  const onInitiateJoin = (room: HangoutRoomConfig) => {
    if (room.password && room.password.trim().length > 0) {
      setPasswordPromptRoom(room);
      setEnteredPassword("");
      setPasswordError("");
    } else {
      handleJoinRoom(room);
    }
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPromptRoom) return;
    if (enteredPassword.trim() === (passwordPromptRoom.password || "").trim()) {
      const roomToJoin = passwordPromptRoom;
      setPasswordPromptRoom(null);
      setPasswordError("");
      handleJoinRoom(roomToJoin);
    } else {
      setPasswordError("Incorrect room passcode. Please check with the room host.");
    }
  };

  const handleJoinRoom = async (room: HangoutRoomConfig) => {
    try {
      setErrorMsg("");
      const identity = currentProfile?.id || `student_${Date.now().toString(36)}`;
      const name = currentProfile?.full_name || "Campus Student";

      const { token, url } = await fetchLiveKitToken(room.id, identity, name);
      setLivekitToken(token);
      setLivekitUrl(url);
      setActiveRoom(room);

      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.6 },
          colors: ["#f97316", "#ea580c", "#fbbf24"],
        });
      } catch {}
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error joining hangout room:", error);
      setErrorMsg(error.message || "Failed to join hangout room");
    }
  };

  const handleLeaveRoom = () => {
    setLivekitToken("");
    setActiveRoom(null);
    onInCallChange?.(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const trimmedPassword = newRoomPassword.trim();
    const code = nextRoomCode || `UIU-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRoom: HangoutRoomConfig = {
      id: `hangout_${code.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now().toString(36)}`,
      code,
      name: `${newRoomTitle.trim()} ${newRoomEmoji}`,
      topic: newRoomTopic.trim() || "Campus group discussion and hangout.",
      emoji: newRoomEmoji,
      tag: newRoomTag,
      maxParticipants: 8,
      gradient: "from-zinc-900 to-zinc-900/60 border-zinc-800",
      password: trimmedPassword || undefined,
      hostName: currentProfile?.full_name || "UIU Student",
      hostId: currentProfile?.id || "anon",
      isCustom: true,
    };

    setRooms((prev) => [newRoom, ...prev]);
    setCreateModalOpen(false);
    setNewRoomTitle("");
    setNewRoomTopic("");
    setNewRoomPassword("");

    // 1. Persist to Supabase hangout_rooms table
    try {
      supabase
        .from("hangout_rooms")
        .insert({
          id: newRoom.id,
          title: newRoom.name,
          topic: newRoom.topic,
          host_name: newRoom.hostName,
          host_id: newRoom.hostId,
          max_participants: 8,
          campus: "uiu",
        })
        .then(({ error }) => {
          if (error) console.warn("Supabase hangout_rooms sync note:", error.message);
        });

      // 2. Broadcast via Supabase Realtime channel so all other students see it instantly
      const lobbyChannel = supabase.channel("campus-hangout-lobby");
      lobbyChannel.send({
        type: "broadcast",
        event: "room-created",
        payload: newRoom,
      });
    } catch (err) {
      console.warn("Lobby sync error:", err);
    }

    handleJoinRoom(newRoom);
  };

  // Active In-Call Fullscreen View
  if (activeRoom && livekitToken) {
    return (
      <div className="fixed inset-0 z-50 bg-black h-[100dvh] w-full overflow-hidden flex flex-col justify-between select-none">
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={livekitToken}
          connect={true}
          video={true}
          audio={true}
          onError={(err) => {
            console.error("LiveKit error:", err);
            setErrorMsg(err.message || "Failed to connect to LiveKit room");
          }}
          onMediaDeviceFailure={(failure) => {
            console.warn("Media device failure:", failure);
            setErrorMsg("Could not access camera or microphone. Please check browser permissions.");
          }}
          className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none"
        >
          <RoomAudioRenderer />
          <GroupHangoutSession
            room={activeRoom}
            currentProfile={currentProfile}
            onLeave={handleLeaveRoom}
            copiedCode={copiedCode}
            onCopyRoomCode={handleCopyRoomCode}
          />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-28 md:pb-12 space-y-4">
      {/* LOBBY VIEW */}
      <div className="space-y-5">
          {/* Lobby Hero */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-xs font-medium border border-zinc-700/60">
                  <Users className="w-3.5 h-3.5 text-orange-400" />
                  Campus Hangouts • Up to 8 Peers
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                  Themed Campus Video Rooms
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Hop into open multi-seat rooms or create a private study room with a passcode. Turn cameras on to study together, play chess, or talk university life.
                </p>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4 text-white" />
                Create Custom Room
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Room Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by Room Code (e.g. UIU-101, UIU-4821), name, topic, or host..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200 p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["All", "Casual", "Academic", "Focus", "Music", "Gaming", "Mentorship"].map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-orange-600 hover:bg-zinc-800 text-white border border-orange-600 shadow-sm"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 border border-zinc-800/80"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="rounded-2xl p-8 border border-zinc-800/80 bg-zinc-900/40 text-center space-y-3">
              <span className="text-3xl block">🔍</span>
              <h3 className="text-sm font-bold text-zinc-200">No rooms found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No active hangout rooms match &quot;{searchQuery}&quot; under &quot;{selectedTag}&quot;.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTag("All");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
                >
                  Reset Search
                </button>
                <button
                  onClick={() => {
                    setNewRoomTitle(searchQuery);
                    handleOpenCreateModal();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors"
                >
                  Create This Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRooms.map((room) => {
              const isLocked = Boolean(room.password && room.password.trim().length > 0);

              return (
                <div
                  key={room.id}
                  className="rounded-xl p-5 border border-zinc-800/80 bg-zinc-900/40 hover:border-orange-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      <span className="text-2xl p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 shrink-0">
                        {room.emoji}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Room Code Badge with Copy button */}
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/25 text-orange-400 font-mono text-[11px] font-bold">
                          <Hash className="w-3 h-3 text-orange-400" />
                          <span>{room.code}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyRoomCode(room.code);
                            }}
                            title="Copy Room Code"
                            className="p-0.5 hover:text-white transition-colors ml-0.5"
                          >
                            {copiedCode === room.code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {isLocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Private
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Up to {room.maxParticipants} Seats
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors flex items-center gap-1.5">
                      <span>{room.name}</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {room.topic}
                    </p>
                    {room.hostName && (
                      <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 truncate">
                        <span>Hosted by <strong className="text-zinc-400 font-medium">{room.hostName}</strong></span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/70 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400 uppercase">
                      {room.tag}
                    </span>

                    <button
                      onClick={() => onInitiateJoin(room)}
                      className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5 text-white" /> : <Video className="w-3.5 h-3.5 text-white" />}
                      <span>{isLocked ? "Unlock & Join" : "Join Hangout"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

      {/* Password Prompt Modal */}
      {passwordPromptRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 p-6 bg-zinc-950 shadow-2xl space-y-4">
            <button
              onClick={() => {
                setPasswordPromptRoom(null);
                setPasswordError("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  Private Room Protected
                </h3>
                <p className="text-xs text-zinc-400 truncate max-w-[200px]">
                  {passwordPromptRoom.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              This hangout requires a passcode set by the host to join.
            </p>

            {passwordError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPassword} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                  Enter Passcode
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={enteredPassword}
                  onChange={(e) => {
                    setEnteredPassword(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="Enter room passcode..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptRoom(null);
                    setPasswordError("");
                  }}
                  className="w-1/2 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.98]"
                >
                  Unlock & Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 p-6 bg-zinc-950 shadow-2xl">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-zinc-100 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400" />
              Create Campus Hangout Room
            </h3>

            {/* Prospective Assigned Room Code */}
            <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-orange-400 block">
                  Assigned Room Code
                </span>
                <span className="text-sm sm:text-base font-mono font-bold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                  <Hash className="w-4 h-4 text-orange-400" />
                  {nextRoomCode || "UIU-ROOM"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyRoomCode(nextRoomCode)}
                className="px-2.5 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                {copiedCode === nextRoomCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCode === nextRoomCode ? "Copied" : "Copy Code"}</span>
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="e.g. Midnight Code & Coffee"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Room Topic
                </label>
                <input
                  type="text"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  placeholder="What is this room about?"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={newRoomTag}
                    onChange={(e) => setNewRoomTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-orange-500/50"
                  >
                    {["Casual", "Academic", "Focus", "Music", "Gaming", "Mentorship"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Icon Emoji
                  </label>
                  <select
                    value={newRoomEmoji}
                    onChange={(e) => setNewRoomEmoji(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-orange-500/50"
                  >
                    {["🍔", "💻", "📚", "🎸", "🎮", "☕", "🧠", "🔥"].map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Password Input (Optional) */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-400" />
                    Room Password (Optional)
                  </span>
                  <span className="text-[10px] text-zinc-500">Leave blank for public access</span>
                </label>
                <input
                  type="password"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  placeholder="Leave blank for public room"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.98]"
              >
                Launch Room & Join
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// In-Room Grid Session Subcomponent (Zoom / Google Meet Professional UI)
// =====================================================================
interface GroupHangoutSessionProps {
  room: HangoutRoomConfig;
  currentProfile: UserProfile | null;
  onLeave: () => void;
  copiedCode?: string | null;
  onCopyRoomCode?: (code: string) => void;
}

interface HangoutSidebarContentProps {
  activeTab: "participants" | "chat";
  onTabChange: (tab: "participants" | "chat") => void;
  onClose: () => void;
  participants: any[];
  currentProfile: UserProfile | null;
  chatMessages: Array<{ id: string; sender: string; text: string; time: string; isSelf: boolean; avatar?: string }>;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  unreadCount: number;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
}

function HangoutSidebarContent({
  activeTab,
  onTabChange,
  onClose,
  participants,
  currentProfile,
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendMessage,
  unreadCount,
  chatScrollRef,
}: HangoutSidebarContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Top Segmented Tab Switcher */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex-1">
          <button
            type="button"
            onClick={() => onTabChange("participants")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "participants"
                ? "bg-zinc-800 text-orange-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People ({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("chat")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors relative ${
              activeTab === "chat"
                ? "bg-zinc-800 text-orange-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: PARTICIPANTS */}
      {activeTab === "participants" && (
        <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden min-h-0">
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
              In Room ({participants.length}/8)
            </div>

            {participants.map((p) => (
              <div
                key={p.identity}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <StudentAvatar
                    avatar={p.isLocal ? currentProfile?.avatar : undefined}
                    name={p.name || p.identity}
                    size="sm"
                    showOnlineBadge={false}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {p.name || p.identity}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {p.isLocal ? "Host (You)" : "UIU Student"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {p.isSpeaking && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  )}
                  {p.isMicrophoneEnabled ? (
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {p.isCameraEnabled ? (
                    <Video className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <VideoOff className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 text-center shrink-0">
            Max 8 peers allowed per UIU hangout room
          </div>
        </div>
      )}

      {/* TAB 2: IN-ROOM CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
          <div ref={chatScrollRef} className="flex-1 p-3 space-y-3 overflow-y-auto">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.isSelf ? "items-end" : "items-start"
                } space-y-1 animate-in fade-in duration-100`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="font-semibold text-zinc-300">
                    {msg.sender}
                  </span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                    msg.isSelf
                      ? "bg-orange-600 text-white rounded-tr-none shadow-sm"
                      : "bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/60"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={onSendMessage}
            className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Send a message to room..."
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2 rounded-xl bg-orange-600 hover:bg-zinc-800 disabled:opacity-40 text-white transition-colors active:scale-95 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function GroupHangoutSession({
  room,
  currentProfile,
  onLeave,
  copiedCode,
  onCopyRoomCode,
}: GroupHangoutSessionProps) {
  const livekitRoom = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, cameraTrack } =
    useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // Focused / Pinned participant state
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);

  // Layout View mode: "grid" (Equal Grid by default) vs "speaker" (Dominant Spotlight)
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  // Per-participant object-fit mode: "contain" (default for mobile phone cameras to avoid crop) vs "cover"
  const [fitModes, setFitModes] = useState<Record<string, "cover" | "contain">>({});
  // Swapped state for 1-on-1 mobile PIP
  const [isSwappedLayout, setIsSwappedLayout] = useState(false);

  const toggleFitMode = (identity: string) => {
    setFitModes((prev) => ({
      ...prev,
      [identity]: prev[identity] === "cover" ? "contain" : "cover",
    }));
  };

  // Right sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"participants" | "chat">("chat");
  const [unreadCount, setUnreadCount] = useState(0);

  // In-room Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; isSelf: boolean; avatar?: string }>
  >([
    {
      id: "welcome-chat",
      sender: "UIU Campus Hub",
      text: `Welcome to ${room.name}! Share thoughts, ask questions, or study together.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: false,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Reactions state
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [isCamToggling, setIsCamToggling] = useState(false);
  const [isMicToggling, setIsMicToggling] = useState(false);

  // 1. Leave session
  const handleLeaveSession = useCallback(() => {
    if (livekitRoom) {
      try {
        livekitRoom.localParticipant.trackPublications.forEach((pub) => {
          if (pub.track) {
            pub.track.stop();
          }
        });
      } catch (err) {
        console.error("Error stopping tracks on leave:", err);
      }
    }
    onLeave();
  }, [livekitRoom, onLeave]);

  // 2. TOGGLE CAMERA: properly set camera enabled via LiveKit
  const handleToggleCamera = async () => {
    if (!livekitRoom || !livekitRoom.localParticipant || isCamToggling) return;
    setIsCamToggling(true);
    try {
      await livekitRoom.localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error("Camera toggle error:", err);
    } finally {
      setIsCamToggling(false);
    }
  };

  // 3. TOGGLE MIC: properly set microphone enabled via LiveKit
  const handleToggleMic = async () => {
    if (!livekitRoom || !livekitRoom.localParticipant || isMicToggling) return;
    setIsMicToggling(true);
    try {
      await livekitRoom.localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.error("Mic toggle error:", err);
    } finally {
      setIsMicToggling(false);
    }
  };

  // 4. TOGGLE SCREEN SHARE
  const handleToggleScreenShare = async () => {
    if (!livekitRoom || !livekitRoom.localParticipant) return;
    try {
      await livekitRoom.localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      console.error("Screen share toggle error:", err);
    }
  };

  // 5. IN-ROOM CHAT & DATA CHANNEL LISTENER
  useEffect(() => {
    if (!livekitRoom) return;

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);

        if (data.type === "chat") {
          setChatMessages((prev) => [
            ...prev,
            {
              id: data.id || `msg_${Date.now()}`,
              sender: data.sender || participant?.name || "Peer",
              text: data.text,
              time: data.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isSelf: false,
              avatar: data.avatar,
            },
          ]);
          if (!sidebarOpen || activeSidebarTab !== "chat") {
            setUnreadCount((prev) => prev + 1);
          }
        } else if (data.type === "reaction") {
          try {
            confetti({
              particleCount: 18,
              spread: 45,
              origin: { y: 0.75 },
              colors: ["#f97316", "#ea580c", "#fbbf24"],
            });
          } catch {}
        }
      } catch (e) {
        console.error("Error decoding in-room data channel payload:", e);
      }
    };

    livekitRoom.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      livekitRoom.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [livekitRoom, sidebarOpen, activeSidebarTab]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, sidebarOpen, activeSidebarTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !livekitRoom) return;

    const text = chatInput.trim();
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "chat",
      sender: currentProfile?.full_name || localParticipant.name || "You",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
      avatar: currentProfile?.avatar,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    try {
      const payload = new TextEncoder().encode(JSON.stringify(newMsg));
      livekitRoom.localParticipant.publishData(payload, { reliable: true });
    } catch (err) {
      console.error("Failed to broadcast chat message:", err);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setReactionsOpen(false);
    try {
      confetti({
        particleCount: 22,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#f97316", "#ea580c", "#fbbf24"],
      });
    } catch {}

    if (!livekitRoom) return;
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          type: "reaction",
          emoji,
          sender: currentProfile?.full_name || "Peer",
        })
      );
      livekitRoom.localParticipant.publishData(payload, { reliable: false });
    } catch {}
  };

  // Helper to reliably get active video TrackReference for any participant
  const getParticipantVideoTrack = (p: { identity: string; isLocal: boolean }) => {
    if (p.isLocal) {
      if (isCameraEnabled && cameraTrack && !cameraTrack.isMuted) {
        return {
          participant: localParticipant,
          source: Track.Source.Camera,
          publication: cameraTrack,
        };
      }
      const localInTracks = tracks.find(
        (t) =>
          t.participant.isLocal &&
          (t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare) &&
          isTrackReference(t) &&
          !t.publication?.isMuted
      );
      if (isCameraEnabled && localInTracks) return localInTracks;
      return null;
    } else {
      const remoteInTracks = tracks.find(
        (t) =>
          t.participant.identity === p.identity &&
          (t.source === Track.Source.ScreenShare || t.source === Track.Source.Camera) &&
          isTrackReference(t) &&
          !t.publication?.isMuted
      );
      return remoteInTracks || null;
    }
  };

  // Determine Focus Participant:
  // If user pinned a participant -> pinned
  // Else if anyone is speaking -> active speaker
  // Else if any remote participant has active camera -> remote with cam
  // Else -> local participant
  const pinnedParticipant = participants.find((p) => p.identity === pinnedIdentity);
  const activeSpeaker =
    participants.find((p) => p.isSpeaking && p.identity !== localParticipant.identity) ||
    participants.find((p) => p.isSpeaking);
  const remoteWithCam = participants.find(
    (p) => !p.isLocal && Boolean(getParticipantVideoTrack(p))
  );

  const focusedParticipant =
    pinnedParticipant ||
    activeSpeaker ||
    remoteWithCam ||
    participants.find((p) => !p.isLocal) ||
    localParticipant;

  const focusedTrack = focusedParticipant ? getParticipantVideoTrack(focusedParticipant) : null;
  const isFocusedCamOff = !focusedTrack;

  // On Mobile:
  // For 1-on-1 Hangouts call (or when 1 remote + 1 local):
  const remoteParticipant = participants.find((p) => !p.isLocal);
  const localVideoTrack = getParticipantVideoTrack(localParticipant);
  const remoteVideoTrack = remoteParticipant ? getParticipantVideoTrack(remoteParticipant) : null;

  const mobileBackgroundTrack = isSwappedLayout ? localVideoTrack : (remoteVideoTrack || localVideoTrack);
  const isMobileBackgroundLocal = isSwappedLayout || !remoteParticipant;
  const mobileBackgroundParticipant = isSwappedLayout ? localParticipant : (remoteParticipant || localParticipant);

  const mobilePipTrack = isSwappedLayout ? remoteVideoTrack : localVideoTrack;
  const isMobilePipLocal = !isSwappedLayout;
  const mobilePipParticipant = isSwappedLayout ? remoteParticipant : (remoteParticipant ? localParticipant : null);

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* ======================================================== */}
      {/* 1. MOBILE NATIVE APP VIEW (WhatsApp / Google Meet Style) */}
      {/* ======================================================== */}
      <div className="md:hidden relative w-full h-full overflow-hidden flex flex-col justify-between">
        {/* TOP HEADER OVERLAY: Gradient blur with Title, Room Code, Live, Swap/Mode, and Leave */}
        <div className="absolute top-0 inset-x-0 z-30 pt-3 px-4 pb-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleLeaveSession}
              className="p-2 -ml-1 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
              title="Leave Room"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-base shrink-0">{room.emoji}</span>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
                  {room.name}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => onCopyRoomCode?.(room.code)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0"
                >
                  <Hash className="w-3 h-3 text-orange-400" />
                  <span>{room.code}</span>
                  {copiedCode === room.code ? (
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-zinc-400" />
                  )}
                </button>
                <span className="text-[10px] text-zinc-300 flex items-center gap-1 shrink-0">
                  <Users className="w-3 h-3" />
                  {participants.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {participants.length <= 2 ? (
              <button
                type="button"
                onClick={() => setIsSwappedLayout(!isSwappedLayout)}
                className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
                title="Swap Video Feeds"
              >
                <FlipHorizontal className="w-4 h-4 text-zinc-200" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")}
                className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
                title="Toggle Grid / Speaker View"
              >
                {viewMode === "grid" ? (
                  <Maximize2 className="w-4 h-4 text-zinc-200" />
                ) : (
                  <LayoutGrid className="w-4 h-4 text-orange-400" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveSidebarTab("participants");
                setSidebarOpen(true);
              }}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
              title="Participants"
            >
              <Users className="w-4 h-4 text-zinc-200" />
            </button>
          </div>
        </div>

        {/* MOBILE VIDEO STAGE: */}
        {participants.length <= 2 ? (
          /* 1-on-1 Hangouts Mobile Experience (WhatsApp style full background + floating PIP) */
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-zinc-950">
            {/* Full-screen Remote Background Stream */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
              {mobileBackgroundTrack && mobileBackgroundTrack.publication?.track ? (
                <VideoTrack
                  trackRef={mobileBackgroundTrack}
                  className={`w-full h-full object-cover ${
                    isMobileBackgroundLocal && mobileBackgroundTrack.source === Track.Source.Camera
                      ? "-scale-x-100"
                      : ""
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="relative">
                    <StudentAvatar
                      avatar={isMobileBackgroundLocal ? currentProfile?.avatar : undefined}
                      name={mobileBackgroundParticipant?.name || mobileBackgroundParticipant?.identity || "UIU Student"}
                      size="xl"
                      showOnlineBadge={false}
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {mobileBackgroundParticipant?.name || (isMobileBackgroundLocal ? currentProfile?.full_name : "Classmate")}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {!remoteParticipant
                        ? "Waiting for classmates to join this room..."
                        : !isMobileBackgroundLocal
                        ? "Live Video Hangout"
                        : "Camera turned off"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Left Name Pill for Background Participant */}
            {mobileBackgroundParticipant && (
              <div className="absolute bottom-24 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
                <span
                  className={`w-2 h-2 rounded-full ${
                    mobileBackgroundParticipant.isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                <span className="truncate max-w-[140px]">
                  {mobileBackgroundParticipant.name || mobileBackgroundParticipant.identity}{" "}
                  {mobileBackgroundParticipant.isLocal && "(You)"}
                </span>
                {!mobileBackgroundParticipant.isMicrophoneEnabled && (
                  <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-0.5" />
                )}
              </div>
            )}

            {/* Floating Corner PIP (Local Preview or Remote if swapped) */}
            {mobilePipParticipant && (
              <div
                onClick={() => setIsSwappedLayout(!isSwappedLayout)}
                className="absolute top-20 right-4 w-28 sm:w-32 aspect-[9/16] rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-900 z-20 cursor-pointer active:scale-95 transition-all"
                title="Tap to swap screens"
              >
                {mobilePipTrack && mobilePipTrack.publication?.track ? (
                  <VideoTrack
                    trackRef={mobilePipTrack}
                    className={`w-full h-full object-cover ${
                      isMobilePipLocal && mobilePipTrack.source === Track.Source.Camera ? "-scale-x-100" : ""
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-zinc-950/90 text-center">
                    <StudentAvatar
                      avatar={isMobilePipLocal ? currentProfile?.avatar : undefined}
                      name={mobilePipParticipant.name || mobilePipParticipant.identity}
                      size="sm"
                      showOnlineBadge={false}
                    />
                    <span className="text-[10px] text-zinc-300 font-semibold mt-1 truncate max-w-[80px]">
                      {isMobilePipLocal ? "You" : mobilePipParticipant.name?.split(" ")[0]}
                    </span>
                    <span className="text-[8px] text-zinc-500 flex items-center gap-0.5 mt-0.5">
                      <VideoOff className="w-2 h-2" /> Cam Off
                    </span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white/80">
                  <FlipHorizontal className="w-2.5 h-2.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Multi-Peer Group Hangout on Mobile: Equal Grid fitting neatly within screen height */
          <div className="h-full w-full min-h-0 overflow-hidden pt-16 pb-24 px-2.5 flex items-center justify-center bg-zinc-950">
            <div
              className={`w-full h-full grid gap-2 ${
                participants.length <= 4
                  ? "grid-cols-2 grid-rows-2"
                  : participants.length <= 6
                  ? "grid-cols-2 grid-rows-3"
                  : "grid-cols-2 sm:grid-cols-4"
              }`}
            >
              {participants.map((p) => {
                const pVideoTrack = getParticipantVideoTrack(p);
                const isCamOff = !pVideoTrack;
                const isSpeaking = p.isSpeaking;
                const isPinned = p.identity === pinnedIdentity;

                return (
                  <div
                    key={p.identity}
                    className={`relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border flex items-center justify-center transition-all ${
                      isSpeaking
                        ? "border-emerald-400 ring-2 ring-emerald-400/50"
                        : isPinned
                        ? "border-orange-500 ring-2 ring-orange-500/50"
                        : "border-zinc-800"
                    }`}
                  >
                    {!isCamOff && pVideoTrack ? (
                      <VideoTrack
                        trackRef={pVideoTrack}
                        className={`w-full h-full object-cover ${
                          p.isLocal && pVideoTrack.source === Track.Source.Camera ? "-scale-x-100" : ""
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center space-y-1">
                        <StudentAvatar
                          avatar={p.isLocal ? currentProfile?.avatar : undefined}
                          name={p.name || p.identity}
                          size="md"
                          showOnlineBadge={false}
                        />
                        <span className="text-[11px] font-bold text-zinc-200 truncate max-w-[100px]">
                          {p.name || p.identity} {p.isLocal && "(You)"}
                        </span>
                        <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                          <VideoOff className="w-2.5 h-2.5" /> Cam Off
                        </span>
                      </div>
                    )}

                    {/* Bottom Left Name Pill */}
                    <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                        }`}
                      />
                      <span className="truncate max-w-[80px]">
                        {p.isLocal ? "You" : p.name?.split(" ")[0] || p.identity}
                      </span>
                      {!p.isMicrophoneEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400 ml-0.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM ESSENTIAL CALL CONTROLS DOCK (WhatsApp / Meet circular style) */}
        <div className="absolute bottom-5 inset-x-0 z-30 flex items-center justify-center gap-3.5 pointer-events-auto px-4">
          {/* Mic Toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={isMicToggling}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
              !isMicrophoneEnabled
                ? "bg-rose-600 text-white shadow-rose-600/30"
                : "bg-zinc-800/90 text-white border border-zinc-700/60 backdrop-blur-xl"
            }`}
            title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {!isMicrophoneEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Video Toggle */}
          <button
            type="button"
            onClick={handleToggleCamera}
            disabled={isCamToggling}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
              !isCameraEnabled
                ? "bg-rose-600 text-white shadow-rose-600/30"
                : "bg-zinc-800/90 text-white border border-zinc-700/60 backdrop-blur-xl"
            }`}
            title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {!isCameraEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-orange-400" />}
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
              isScreenShareEnabled
                ? "bg-orange-600 text-white shadow-orange-600/30"
                : "bg-zinc-800/90 text-white border border-zinc-700/60 backdrop-blur-xl"
            }`}
            title={isScreenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* End / Leave Call Button */}
          <button
            type="button"
            onClick={handleLeaveSession}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 active:scale-95 transition-all"
            title="Leave Room"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Chat Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setActiveSidebarTab("chat");
              setSidebarOpen(true);
              setUnreadCount(0);
            }}
            className="relative w-12 h-12 rounded-full bg-zinc-800/90 text-white border border-zinc-700/60 backdrop-blur-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            title="In-Room Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Emoji Reactions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setReactionsOpen(!reactionsOpen)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                reactionsOpen
                  ? "bg-zinc-800 border-orange-500 text-orange-400"
                  : "bg-zinc-800/90 text-white border border-zinc-700/60 backdrop-blur-xl"
              }`}
              title="Send Reaction"
            >
              <Smile className="w-5 h-5" />
            </button>
            {reactionsOpen && (
              <div className="absolute bottom-16 right-0 p-2 rounded-2xl bg-zinc-900 border border-zinc-700/80 backdrop-blur-2xl shadow-2xl flex items-center gap-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                {["🎉", "🔥", "👏", "☕", "❤️", "🚀", "💡"].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleSendReaction(em)}
                    className="p-1.5 hover:scale-125 active:scale-95 transition-transform text-lg"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP ZOOM/MEET PRO WORKSPACE (md: and up)         */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden min-h-0 bg-[#090D16]">
        {/* Active Room Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 shrink-0">
              {room.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-zinc-100 truncate">
                  {room.name}
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">
                  <Hash className="w-3 h-3 text-orange-400" />
                  <span>{room.code}</span>
                  <button
                    type="button"
                    onClick={() => onCopyRoomCode?.(room.code)}
                    title="Copy Room Code to invite classmates"
                    className="ml-1 p-0.5 hover:text-white transition-colors"
                  >
                    {copiedCode === room.code ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
                {room.password && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    SECURE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                {room.topic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
              {room.tag}
            </span>
            <button
              type="button"
              onClick={handleLeaveSession}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </button>
          </div>
        </div>

        {/* Desktop Stage & Sidebar */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Main Stage (Grid or Speaker + Dock) */}
          <div className="flex-1 flex flex-col justify-between p-3 min-w-0 overflow-hidden gap-3">
            {viewMode === "grid" ? (
              /* 1. EQUAL GALLERY GRID */
              <div className="flex-1 relative w-full overflow-hidden min-h-0 flex items-center justify-center">
                <div
                  className={`w-full h-full grid gap-3 p-1 ${
                    participants.length <= 1
                      ? "grid-cols-1 max-w-3xl mx-auto"
                      : participants.length === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : participants.length <= 4
                      ? "grid-cols-2 grid-rows-2"
                      : participants.length <= 6
                      ? "grid-cols-2 md:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {participants.map((p) => {
                    const pVideoTrack = getParticipantVideoTrack(p);
                    const isCamOff = !pVideoTrack;
                    const isSpeaking = p.isSpeaking;
                    const isPinned = p.identity === pinnedIdentity;
                    const fit = fitModes[p.identity] || "contain";

                    return (
                      <div
                        key={p.identity}
                        className={`relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border flex items-center justify-center transition-all duration-200 ${
                          isSpeaking
                            ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20"
                            : isPinned
                            ? "border-orange-500 ring-2 ring-orange-500/50 shadow-md"
                            : "border-zinc-800/90 shadow-md"
                        }`}
                      >
                        {!isCamOff && pVideoTrack ? (
                          <VideoTrack
                            trackRef={pVideoTrack}
                            className={`w-full h-full ${
                              fit === "contain"
                                ? "object-contain bg-zinc-950"
                                : "object-cover"
                            } ${
                              p.isLocal && pVideoTrack.source === Track.Source.Camera
                                ? "-scale-x-100"
                                : ""
                            }`}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center space-y-2 animate-in fade-in duration-150">
                            <div
                              className={`relative rounded-full transition-all duration-300 ${
                                isSpeaking
                                  ? "ring-4 ring-emerald-500/70 shadow-lg shadow-emerald-500/30 scale-105"
                                  : "ring-2 ring-zinc-800"
                              }`}
                            >
                              <StudentAvatar
                                avatar={p.isLocal ? currentProfile?.avatar : undefined}
                                name={p.name || p.identity}
                                size={
                                  participants.length <= 2
                                    ? "xl"
                                    : participants.length <= 4
                                    ? "lg"
                                    : "md"
                                }
                                showOnlineBadge={false}
                              />
                              {isSpeaking && (
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                              )}
                            </div>

                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate max-w-[150px] sm:max-w-[200px]">
                                {p.name || p.identity} {p.isLocal && "(You)"}
                              </h4>
                              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                                  <VideoOff className="w-2.5 h-2.5 text-zinc-500" />
                                  Cam Off
                                </span>
                                {isSpeaking && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    <Mic className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                                    Speaking
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Top Right Controls on Video Tile */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                          {!isCamOff && (
                            <button
                              type="button"
                              onClick={() => toggleFitMode(p.identity)}
                              title={
                                fit === "contain"
                                  ? "Crop & Fill Entire Tile"
                                  : "Fit Complete Frame (No Crop / Mobile Safe)"
                              }
                              className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 backdrop-blur-md transition-colors shadow-sm"
                            >
                              {fit === "contain" ? (
                                <Maximize2 className="w-3 h-3" />
                              ) : (
                                <Minimize2 className="w-3 h-3" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setPinnedIdentity(p.identity);
                              setViewMode("speaker");
                            }}
                            title="Spotlight / Focus this Participant"
                            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 backdrop-blur-md transition-colors shadow-sm"
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Speaking Badge on Top Left */}
                        {isSpeaking && (
                          <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-md backdrop-blur-md">
                              <Mic className="w-2.5 h-2.5 animate-pulse" />
                              Speaking
                            </span>
                          </div>
                        )}

                        {/* Bottom Left Name & Mic Pill */}
                        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 text-[11px] font-medium text-zinc-200 shadow-md max-w-[85%]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                            }`}
                          />
                          <span className="truncate">
                            {p.name || p.identity} {p.isLocal && "(You)"}
                          </span>
                          {!p.isMicrophoneEnabled ? (
                            <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-0.5" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 2. SPEAKER / SPOTLIGHT VIEW */
              <div className="flex-1 flex flex-col justify-between overflow-hidden min-h-0 gap-2">
                <div className="flex-1 relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-2xl flex items-center justify-center min-h-[290px] sm:min-h-[380px]">
                  {!isFocusedCamOff && focusedTrack ? (
                    <VideoTrack
                      trackRef={focusedTrack}
                      className={`w-full h-full ${
                        (fitModes[focusedParticipant.identity] || "contain") === "contain"
                          ? "object-contain bg-zinc-950"
                          : "object-cover"
                      } rounded-2xl ${
                        focusedParticipant.isLocal && focusedTrack.source === Track.Source.Camera
                          ? "-scale-x-100"
                          : ""
                      }`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in duration-200">
                      <div
                        className={`relative rounded-full transition-all duration-300 ${
                          focusedParticipant?.isSpeaking
                            ? "ring-4 ring-emerald-500/70 shadow-lg shadow-emerald-500/30 scale-105"
                            : "ring-2 ring-zinc-800"
                        }`}
                      >
                        <StudentAvatar
                          avatar={focusedParticipant?.isLocal ? currentProfile?.avatar : undefined}
                          name={focusedParticipant?.name || focusedParticipant?.identity}
                          size="xl"
                          showOnlineBadge={false}
                        />
                        {focusedParticipant?.isSpeaking && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                          {focusedParticipant?.name || focusedParticipant?.identity}{" "}
                          {focusedParticipant?.isLocal && "(You)"}
                        </h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                            <VideoOff className="w-3.5 h-3.5 text-zinc-500" />
                            Camera Muted
                          </span>
                          {focusedParticipant?.isSpeaking && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                              Speaking
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating Top Overlays */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                    {pinnedIdentity === focusedParticipant?.identity && (
                      <span className="px-2.5 py-1 rounded-lg bg-orange-600/90 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md">
                        <Pin className="w-3.5 h-3.5" />
                        Pinned Focus
                      </span>
                    )}
                    {focusedParticipant?.isSpeaking && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md">
                        <Mic className="w-3.5 h-3.5 animate-pulse" />
                        Active Speaker
                      </span>
                    )}
                  </div>

                  {/* Top Right Pin & Fit Buttons */}
                  {focusedParticipant && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                      {!isFocusedCamOff && (
                        <button
                          type="button"
                          onClick={() => toggleFitMode(focusedParticipant.identity)}
                          title="Toggle Fit / Fill"
                          className="p-2 rounded-xl border backdrop-blur-md transition-colors shadow-sm bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/60"
                        >
                          {(fitModes[focusedParticipant.identity] || "contain") === "contain" ? (
                            <Maximize2 className="w-4 h-4" />
                          ) : (
                            <Minimize2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setPinnedIdentity(
                            pinnedIdentity === focusedParticipant.identity
                              ? null
                              : focusedParticipant.identity
                          )
                        }
                        title={
                          pinnedIdentity === focusedParticipant.identity
                            ? "Unpin Focus"
                            : "Pin this Participant"
                        }
                        className={`p-2 rounded-xl border backdrop-blur-md transition-colors shadow-sm ${
                          pinnedIdentity === focusedParticipant.identity
                            ? "bg-orange-600 text-white border-orange-500"
                            : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/60"
                        }`}
                      >
                        {pinnedIdentity === focusedParticipant.identity ? (
                          <PinOff className="w-4 h-4" />
                        ) : (
                          <Pin className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Bottom Left Name Pill */}
                  {focusedParticipant && (
                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 text-xs font-semibold text-zinc-200 shadow-md">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          focusedParticipant.isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                        }`}
                      />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {focusedParticipant.name || focusedParticipant.identity}{" "}
                        {focusedParticipant.isLocal && "(You)"}
                      </span>
                      {!focusedParticipant.isMicrophoneEnabled && (
                        <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-0.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* BOTTOM STRIP: Horizontal Peer Video Thumbnails */}
                <div className="h-20 sm:h-24 shrink-0 flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-thin">
                  {participants.map((p) => {
                    const pVideoTrack = getParticipantVideoTrack(p);
                    const isCamOff = !pVideoTrack;
                    const isSelectedFocus = p.identity === focusedParticipant?.identity;
                    const isPinned = p.identity === pinnedIdentity;

                    return (
                      <div
                        key={p.identity}
                        onClick={() =>
                          setPinnedIdentity(pinnedIdentity === p.identity ? null : p.identity)
                        }
                        title={`Click to focus ${p.name || p.identity}`}
                        className={`relative w-28 sm:w-36 aspect-video shrink-0 rounded-xl overflow-hidden cursor-pointer border transition-all duration-150 flex items-center justify-center bg-zinc-900 ${
                          isSelectedFocus
                            ? "border-orange-500 ring-2 ring-orange-500/50 shadow-md"
                            : p.isSpeaking
                            ? "border-emerald-400 ring-1 ring-emerald-400/40"
                            : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                        }`}
                      >
                        {!isCamOff && pVideoTrack ? (
                          <VideoTrack
                            trackRef={pVideoTrack}
                            className={`w-full h-full object-cover ${
                              p.isLocal && pVideoTrack.source === Track.Source.Camera ? "-scale-x-100" : ""
                            }`}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1 text-center">
                            <StudentAvatar
                              avatar={p.isLocal ? currentProfile?.avatar : undefined}
                              name={p.name || p.identity}
                              size="sm"
                              showOnlineBadge={false}
                            />
                            <span className="text-[10px] font-medium text-zinc-300 truncate max-w-[80px] mt-0.5">
                              {p.name || p.identity}
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-zinc-950/80 backdrop-blur-sm text-[9px] font-medium text-zinc-200">
                          <span className="truncate max-w-[70px]">
                            {p.isLocal ? "You" : p.name?.split(" ")[0] || p.identity}
                          </span>
                          {!p.isMicrophoneEnabled ? (
                            <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                          ) : p.isSpeaking ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ) : null}
                        </div>

                        {isPinned && (
                          <span className="absolute top-1 right-1 p-0.5 rounded bg-orange-600 text-white">
                            <Pin className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. CLEAN BOTTOM FLOATING TOOLBAR (Zoom / Meet Style Dock) */}
            <div className="h-14 sm:h-16 flex items-center justify-center shrink-0">
              <div className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-xl shadow-2xl">
                {/* Audio Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  disabled={isMicToggling}
                  title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                    !isMicrophoneEnabled
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {!isMicrophoneEnabled ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">
                    {!isMicrophoneEnabled ? "Unmute" : "Mute"}
                  </span>
                </button>

                {/* Video Toggle */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={isCamToggling}
                  title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                    !isCameraEnabled
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {!isCameraEnabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-orange-400" />}
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">
                    {!isCameraEnabled ? "Start Video" : "Stop Video"}
                  </span>
                </button>

                {/* Screen Share */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  title={isScreenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                    isScreenShareEnabled
                      ? "bg-orange-600 border-orange-500 text-white"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <ScreenShare className="w-4 h-4" />
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">Share</span>
                </button>

                {/* View Mode Switcher */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")}
                  title={viewMode === "grid" ? "Switch to Speaker Spotlight View" : "Switch to Equal Grid View"}
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                    viewMode === "grid"
                      ? "bg-orange-600/20 border-orange-500 text-orange-400"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {viewMode === "grid" ? <LayoutGrid className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">
                    {viewMode === "grid" ? "Grid" : "Speaker"}
                  </span>
                </button>

                {/* Reactions Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setReactionsOpen(!reactionsOpen)}
                    title="Send Emoji Reaction"
                    className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                      reactionsOpen
                        ? "bg-zinc-800 border-orange-500/50 text-orange-400"
                        : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    <Smile className="w-4 h-4" />
                    <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">React</span>
                  </button>

                  {reactionsOpen && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      {["🎉", "🔥", "👏", "☕", "❤️", "🚀", "💡"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => handleSendReaction(em)}
                          className="p-1.5 hover:scale-130 active:scale-95 transition-transform text-sm sm:text-base"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Participants Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarOpen && activeSidebarTab === "participants") {
                      setSidebarOpen(false);
                    } else {
                      setActiveSidebarTab("participants");
                      setSidebarOpen(true);
                    }
                  }}
                  title="View Participants"
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 relative ${
                    sidebarOpen && activeSidebarTab === "participants"
                      ? "bg-orange-600/20 border-orange-500 text-orange-400"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">People</span>
                  <span className="absolute -top-1 -right-1 px-1 rounded-full text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                    {participants.length}
                  </span>
                </button>

                {/* Chat Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarOpen && activeSidebarTab === "chat") {
                      setSidebarOpen(false);
                    } else {
                      setActiveSidebarTab("chat");
                      setSidebarOpen(true);
                      setUnreadCount(0);
                    }
                  }}
                  title="Open In-Room Chat"
                  className={`flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 relative ${
                    sidebarOpen && activeSidebarTab === "chat"
                      ? "bg-orange-600/20 border-orange-500 text-orange-400"
                      : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[9px] font-semibold mt-0.5 hidden sm:inline">Chat</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold bg-orange-600 text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Red Leave Room Button */}
                <button
                  type="button"
                  onClick={handleLeaveSession}
                  title="Leave Hangout Room"
                  className="px-3 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ml-1"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Leave</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Right Sidebar (Collapsible) */}
          {sidebarOpen && (
            <div className="w-80 flex flex-col border-l border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shrink-0 overflow-hidden transition-all duration-200">
              <HangoutSidebarContent
                activeTab={activeSidebarTab}
                onTabChange={setActiveSidebarTab}
                onClose={() => setSidebarOpen(false)}
                participants={participants}
                currentProfile={currentProfile}
                chatMessages={chatMessages}
                chatInput={chatInput}
                onChatInputChange={setChatInput}
                onSendMessage={handleSendMessage}
                unreadCount={unreadCount}
                chatScrollRef={chatScrollRef}
              />
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE SIDEBAR DRAWER (Slide-Up Bottom Sheet on Mobile) */}
      {/* ======================================================== */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] h-[72dvh] bg-zinc-900/98 backdrop-blur-2xl border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200">
          <HangoutSidebarContent
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
            onClose={() => setSidebarOpen(false)}
            participants={participants}
            currentProfile={currentProfile}
            chatMessages={chatMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            unreadCount={unreadCount}
            chatScrollRef={chatScrollRef}
          />
        </div>
      )}
    </div>
  );
}
