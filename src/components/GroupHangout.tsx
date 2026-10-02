"use client";

import React, { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  VideoTrack,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { UserProfile } from "@/lib/supabase";
import {
  CAMPUS_HANGOUT_ROOMS,
  HangoutRoomConfig,
  fetchLiveKitToken,
} from "@/lib/livekit";
import {
  Users,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  Sparkles,
  Plus,
  MessageSquare,
  Send,
  X,
  Smile,
  Shield,
  Radio,
  Flame,
  Coffee,
  BookOpen,
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

  // Create Room Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [newRoomTag, setNewRoomTag] = useState("Casual");
  const [newRoomEmoji, setNewRoomEmoji] = useState("🍔");

  // In-Room control state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [showInRoomChat, setShowInRoomChat] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredRooms = rooms.filter((r) => {
    if (selectedTag === "All") return true;
    return r.tag.toLowerCase() === selectedTag.toLowerCase();
  });

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
    setIsScreenSharing(false);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const newRoom: HangoutRoomConfig = {
      id: `hangout_${Date.now().toString(36)}`,
      name: `${newRoomTitle.trim()} ${newRoomEmoji}`,
      topic: newRoomTopic.trim() || "Campus group discussion and hangout.",
      emoji: newRoomEmoji,
      tag: newRoomTag,
      maxParticipants: 8,
      initialParticipants: 1,
      gradient: "from-indigo-500/20 to-cyan-500/10 border-indigo-500/30",
    };

    setRooms([newRoom, ...rooms]);
    setCreateModalOpen(false);
    setNewRoomTitle("");
    setNewRoomTopic("");
    handleJoinRoom(newRoom);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 pb-28 md:pb-12 space-y-6">
      {/* If connected to an active room */}
      {activeRoom && livekitToken ? (
        <div className="space-y-3">
          {/* Room Header bar */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl glass-dock border border-slate-700/80">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeRoom.emoji}</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>{activeRoom.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 hidden sm:block truncate max-w-md">
                  {activeRoom.topic}
                </p>
              </div>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </button>
          </div>

          {/* LiveKit Video Grid Session */}
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={livekitToken}
            connect={true}
            video={!isVideoOff}
            audio={!isMuted}
            className="relative w-full min-h-[550px] md:min-h-[600px] flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 p-2 sm:p-4"
          >
            <RoomAudioRenderer />
            <GroupHangoutSession
              room={activeRoom}
              currentProfile={currentProfile}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              onToggleMic={() => setIsMuted(!isMuted)}
              onToggleVideo={() => setIsVideoOff(!isVideoOff)}
              onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
              showParticipantsList={showParticipantsList}
              onToggleParticipants={() => setShowParticipantsList(!showParticipantsList)}
              showInRoomChat={showInRoomChat}
              onToggleChat={() => setShowInRoomChat(!showInRoomChat)}
              onLeave={handleLeaveRoom}
            />
          </LiveKitRoom>
        </div>
      ) : (
        /* LOBBY VIEW */
        <div className="space-y-6">
          {/* Lobby Hero */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900/80 border border-blue-500/20 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Campus Hangouts • Up to 8 Peers
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Themed Campus Video Rooms
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Hop into open multi-seat rooms. Turn cameras on to study together, play chess, jam songs, or talk university politics.
                </p>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Custom Room
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["All", "Casual", "Academic", "Focus", "Music", "Gaming", "Mentorship"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedTag === tag
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className={`relative rounded-3xl p-5 border bg-gradient-to-br ${room.gradient} bg-slate-900/70 hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-3xl p-2 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                      {room.emoji}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-950/80 text-slate-200 border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {room.initialParticipants || 2} / {room.maxParticipants} Seats
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {room.topic}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 text-slate-400 uppercase">
                    {room.tag}
                  </span>

                  <button
                    onClick={() => handleJoinRoom(room)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Join Hangout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl glass-dock border border-slate-700 p-6 bg-slate-950/95 shadow-2xl">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              Create Campus Hangout Room
            </h3>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="e.g. Midnight Code & Coffee"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Room Topic
                </label>
                <input
                  type="text"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  placeholder="What is this room about?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={newRoomTag}
                    onChange={(e) => setNewRoomTag(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {["Casual", "Academic", "Focus", "Music", "Gaming", "Mentorship"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Icon Emoji
                  </label>
                  <select
                    value={newRoomEmoji}
                    onChange={(e) => setNewRoomEmoji(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {["🍔", "💻", "📚", "🎸", "🎮", "☕", "🧠", "🔥"].map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-90 transition-all"
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

// In-Room Grid Session Subcomponent
interface GroupHangoutSessionProps {
  room: HangoutRoomConfig;
  currentProfile: UserProfile | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  showParticipantsList: boolean;
  onToggleParticipants: () => void;
  showInRoomChat: boolean;
  onToggleChat: () => void;
  onLeave: () => void;
}

function GroupHangoutSession({
  room,
  currentProfile,
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  showParticipantsList,
  onToggleParticipants,
  showInRoomChat,
  onToggleChat,
  onLeave,
}: GroupHangoutSessionProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // Quick Emoji Reactions
  const handleEmojiReaction = (emoji: string) => {
    try {
      confetti({
        particleCount: 15,
        spread: 30,
        origin: { y: 0.8 },
      });
    } catch {}
  };

  // 2x4 responsive grid classes based on participant count
  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-4"; // 2x4 dynamic grid for up to 8
  };

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between space-y-4">
      {/* 2x4 Dynamic Video Feeds Grid */}
      <div
        className={`w-full flex-1 grid gap-2.5 sm:gap-3.5 min-h-[440px] max-h-[640px] overflow-y-auto ${getGridClasses(
          Math.max(participants.length, 1)
        )}`}
      >
        {participants.map((p) => {
          const participantTrack = tracks.find((t) => t.participant.identity === p.identity);
          const isSpeaking = p.isSpeaking;

          return (
            <div
              key={p.identity}
              className={`relative rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-200 flex items-center justify-center min-h-[160px] sm:min-h-[190px] ${
                isSpeaking
                  ? "border-emerald-400 active-speaker-ring ring-2 ring-emerald-400/50"
                  : "border-slate-800"
              }`}
            >
              {participantTrack && !participantTrack.publication?.isMuted ? (
                <VideoTrack
                  trackRef={participantTrack}
                  className={`w-full h-full object-cover rounded-2xl ${
                    p.isLocal ? "-scale-x-100" : ""
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                    {p.isLocal ? currentProfile?.avatar || "⚡" : "🎓"}
                  </div>
                  <p className="text-xs font-bold text-white truncate max-w-[120px]">
                    {p.name || p.identity}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {p.isLocal && isVideoOff ? "Cam off" : "Connected"}
                  </p>
                </div>
              )}

              {/* Participant Pill */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-dock border border-white/10 text-[10px] font-semibold text-white">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span className="truncate max-w-[100px]">
                  {p.name || p.identity} {p.isLocal && "(You)"}
                </span>
                {!p.isMicrophoneEnabled && <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating In-Room Media Controls Dock */}
      <div className="h-16 flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-3xl glass-dock border border-slate-700/80 shadow-2xl">
          {/* Mic */}
          <button
            onClick={onToggleMic}
            className={`p-2.5 rounded-2xl border transition-all ${
              isMuted
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Video */}
          <button
            onClick={onToggleVideo}
            className={`p-2.5 rounded-2xl border transition-all ${
              isVideoOff
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`p-2.5 rounded-2xl border transition-all ${
              isScreenSharing
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            }`}
          >
            <ScreenShare className="w-4 h-4" />
          </button>

          {/* Emoji Reactions Bar */}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 rounded-2xl bg-slate-900 border border-slate-800">
            {["🎉", "🔥", "👏", "☕", "❤️"].map((em) => (
              <button
                key={em}
                onClick={() => handleEmojiReaction(em)}
                className="hover:scale-125 active:scale-95 transition-transform p-1 text-sm"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Participants Drawer Trigger */}
          <button
            onClick={onToggleParticipants}
            className={`p-2.5 rounded-2xl border transition-all ${
              showParticipantsList
                ? "bg-indigo-600/30 border-indigo-400 text-indigo-200"
                : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Leave */}
          <button
            onClick={onLeave}
            className="p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40 active:scale-95 transition-all shadow-md shadow-rose-600/30"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Participants Drawer */}
      {showParticipantsList && (
        <div className="absolute top-0 right-0 bottom-20 w-72 glass-dock border border-slate-700 rounded-3xl p-4 z-40 animate-in slide-in-from-right duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Room Participants ({participants.length}/8)
              </span>
              <button
                onClick={onToggleParticipants}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-72 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.identity}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/40 flex items-center justify-center text-xs">
                      {p.isLocal ? currentProfile?.avatar || "⚡" : "🎓"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {p.name || p.identity}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {p.isLocal ? "Host (You)" : "Campus Student"}
                      </p>
                    </div>
                  </div>
                  {p.isSpeaking && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Max 8 participants per hangout room
          </div>
        </div>
      )}
    </div>
  );
}
