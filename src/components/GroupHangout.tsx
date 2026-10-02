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
import { UserProfile } from "@/lib/supabase";
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
} from "lucide-react";
import confetti from "canvas-confetti";

interface GroupHangoutProps {
  currentProfile: UserProfile | null;
  initialRoomId?: string | null;
}

export default function GroupHangout({
  currentProfile,
  initialRoomId,
}: GroupHangoutProps) {
  const [rooms, setRooms] = useState<HangoutRoomConfig[]>(CAMPUS_HANGOUT_ROOMS);
  const [activeRoom, setActiveRoom] = useState<HangoutRoomConfig | null>(null);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");

  // Create Room Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [newRoomTag, setNewRoomTag] = useState("Casual");
  const [newRoomEmoji, setNewRoomEmoji] = useState("🍔");
  const [newRoomPassword, setNewRoomPassword] = useState("");

  // Password Prompt Modal state
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<HangoutRoomConfig | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Handle deep-link / initial room join
  useEffect(() => {
    if (initialRoomId && !activeRoom) {
      const target = rooms.find((r) => r.id === initialRoomId);
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
    if (selectedTag === "All") return true;
    return r.tag.toLowerCase() === selectedTag.toLowerCase();
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
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const trimmedPassword = newRoomPassword.trim();
    const newRoom: HangoutRoomConfig = {
      id: `hangout_${Date.now().toString(36)}`,
      name: `${newRoomTitle.trim()} ${newRoomEmoji}`,
      topic: newRoomTopic.trim() || "Campus group discussion and hangout.",
      emoji: newRoomEmoji,
      tag: newRoomTag,
      maxParticipants: 8,
      initialParticipants: 1,
      gradient: "from-zinc-900 to-zinc-900/60 border-zinc-800",
      password: trimmedPassword || undefined,
    };

    setRooms([newRoom, ...rooms]);
    setCreateModalOpen(false);
    setNewRoomTitle("");
    setNewRoomTopic("");
    setNewRoomPassword("");
    handleJoinRoom(newRoom);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-28 md:pb-12 space-y-4">
      {/* If connected to an active room */}
      {activeRoom && livekitToken ? (
        <div className="space-y-2.5">
          {/* Active Room Header bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="text-xl sm:text-2xl p-1 sm:p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 shrink-0">
                {activeRoom.emoji}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                    {activeRoom.name}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                  {activeRoom.password && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      SECURE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-md">
                  {activeRoom.topic}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
                {activeRoom.tag}
              </span>
              <button
                onClick={handleLeaveRoom}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Leave Room</span>
              </button>
            </div>
          </div>

          {/* LiveKit Video Grid Session - Zoom/Meet Layout */}
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
            className="relative w-full min-h-[580px] lg:min-h-[660px] flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#090D16] shadow-2xl"
          >
            <RoomAudioRenderer />
            <GroupHangoutSession
              room={activeRoom}
              currentProfile={currentProfile}
              onLeave={handleLeaveRoom}
            />
          </LiveKitRoom>
        </div>
      ) : (
        /* LOBBY VIEW */
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
                onClick={() => setCreateModalOpen(true)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRooms.map((room) => {
              const isLocked = Boolean(room.password && room.password.trim().length > 0);

              return (
                <div
                  key={room.id}
                  className="rounded-xl p-5 border border-zinc-800/80 bg-zinc-900/40 hover:border-orange-500/40 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-2xl p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                        {room.emoji}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isLocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Private
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {room.initialParticipants || 2} / {room.maxParticipants} Seats
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
        </div>
      )}

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

            <h3 className="text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400" />
              Create Campus Hangout Room
            </h3>

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
}

function GroupHangoutSession({
  room,
  currentProfile,
  onLeave,
}: GroupHangoutSessionProps) {
  const livekitRoom = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, cameraTrack } =
    useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // Focused / Pinned participant state
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);

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

  return (
    <div className="relative w-full flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-[#090D16]">
      {/* ================================================================= */}
      {/* MAIN STAGE (LEFT / CENTER): Dominant Video + Thumbnails + Dock    */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col justify-between p-2.5 sm:p-3 min-w-0 overflow-hidden gap-2 sm:gap-3">
        {/* 1. DOMINANT FOCUS VIDEO TILE */}
        <div className="flex-1 relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-2xl flex items-center justify-center min-h-[290px] sm:min-h-[380px]">
          {!isFocusedCamOff && focusedTrack ? (
            <VideoTrack
              trackRef={focusedTrack}
              className={`w-full h-full object-contain sm:object-cover rounded-2xl ${
                focusedParticipant.isLocal && focusedTrack.source === Track.Source.Camera
                  ? "-scale-x-100"
                  : ""
              }`}
            />
          ) : (
            /* Centered Avatar Stage when Camera is Muted/Off */
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
                    <VideoOff className="w-3 h-3 text-zinc-500" />
                    Camera Muted
                  </span>
                  {focusedParticipant?.isSpeaking && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
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
                <Pin className="w-3 h-3" />
                Pinned Focus
              </span>
            )}
            {focusedParticipant?.isSpeaking && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md">
                <Mic className="w-3 h-3 animate-pulse" />
                Active Speaker
              </span>
            )}
          </div>

          {/* Top Right Pin Button */}
          {focusedParticipant && (
            <div className="absolute top-3 right-3 z-10">
              <button
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

        {/* 2. BOTTOM STRIP: Horizontal Peer Video Thumbnails (16:9 Aspect Ratio) */}
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

                {/* Thumbnail Name & Mic Pill */}
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

                {/* Pin Indicator */}
                {isPinned && (
                  <span className="absolute top-1 right-1 p-0.5 rounded bg-orange-600 text-white">
                    <Pin className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. CLEAN BOTTOM FLOATING TOOLBAR (Zoom / Meet Style Dock) */}
        <div className="h-14 sm:h-16 flex items-center justify-center shrink-0">
          <div className="relative flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-xl shadow-2xl">
            {/* Audio Toggle */}
            <button
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

            {/* Reactions Picker */}
            <div className="relative">
              <button
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

              {/* Reactions Popup */}
              {reactionsOpen && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 backdrop-blur-xl shadow-2xl flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  {["🎉", "🔥", "👏", "☕", "❤️", "🚀", "💡"].map((em) => (
                    <button
                      key={em}
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

      {/* ================================================================= */}
      {/* RIGHT SIDEBAR (COLLAPSIBLE): Participants & In-Room Text Chat    */}
      {/* ================================================================= */}
      {sidebarOpen && (
        <div className="w-full lg:w-80 sm:w-88 flex flex-col border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/95 backdrop-blur-xl shrink-0 rounded-2xl lg:rounded-l-none overflow-hidden transition-all duration-200">
          {/* Top Segmented Tab Switcher */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex-1">
              <button
                onClick={() => setActiveSidebarTab("participants")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeSidebarTab === "participants"
                    ? "bg-zinc-800 text-orange-400 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>People ({participants.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveSidebarTab("chat");
                  setUnreadCount(0);
                }}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors relative ${
                  activeSidebarTab === "chat"
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
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: PARTICIPANTS LIST */}
          {activeSidebarTab === "participants" && (
            <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
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

              <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
                Max 8 peers allowed per UIU hangout room
              </div>
            </div>
          )}

          {/* TAB 2: IN-ROOM CHAT */}
          {activeSidebarTab === "chat" && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Message History */}
              <div
                ref={chatScrollRef}
                className="flex-1 p-3 space-y-3 overflow-y-auto"
              >
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

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
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
      )}
    </div>
  );
}
