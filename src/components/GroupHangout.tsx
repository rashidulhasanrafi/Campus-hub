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
          particleCount: 20,
          spread: 40,
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
      gradient: "from-zinc-900 to-zinc-900/60 border-zinc-800",
    };

    setRooms([newRoom, ...rooms]);
    setCreateModalOpen(false);
    setNewRoomTitle("");
    setNewRoomTopic("");
    handleJoinRoom(newRoom);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
      {/* If connected to an active room */}
      {activeRoom && livekitToken ? (
        <div className="space-y-3">
          {/* Room Header bar */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeRoom.emoji}</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
                  <span>{activeRoom.name}</span>
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 hidden sm:block truncate max-w-md">
                  {activeRoom.topic}
                </p>
              </div>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
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
            className="relative w-full min-h-[520px] md:min-h-[580px] flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950 p-2 sm:p-3"
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
        <div className="space-y-5">
          {/* Lobby Hero */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-xs font-medium border border-zinc-700/60">
                  <Users className="w-3.5 h-3.5 text-zinc-300" />
                  Campus Hangouts • Up to 8 Peers
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                  Themed Campus Video Rooms
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Hop into open multi-seat rooms. Turn cameras on to study together, play chess, jam songs, or talk university life.
                </p>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Custom Room
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["All", "Casual", "Academic", "Focus", "Music", "Gaming", "Mentorship"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedTag === tag
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="rounded-xl p-5 border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700/80 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60">
                      {room.emoji}
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {room.initialParticipants || 2} / {room.maxParticipants} Seats
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    {room.name}
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
                    onClick={() => handleJoinRoom(room)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
                  >
                    <Video className="w-3.5 h-3.5 text-zinc-900" />
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
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 p-6 bg-zinc-950 shadow-2xl">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Create Campus Hangout Room
            </h3>

            <form onSubmit={handleCreateRoom} className="space-y-4">
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
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
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
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
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
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
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
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
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
                className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs shadow-sm transition-colors"
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

  const handleEmojiReaction = (emoji: string) => {
    try {
      confetti({
        particleCount: 15,
        spread: 30,
        origin: { y: 0.8 },
      });
    } catch {}
  };

  const getGridClasses = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 sm:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-2 sm:grid-cols-4";
  };

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between space-y-3">
      {/* 2x4 Dynamic Video Feeds Grid */}
      <div
        className={`w-full flex-1 grid gap-2.5 sm:gap-3 min-h-[420px] max-h-[620px] overflow-y-auto ${getGridClasses(
          Math.max(participants.length, 1)
        )}`}
      >
        {participants.map((p) => {
          const participantTrack = tracks.find((t) => t.participant.identity === p.identity);
          const isSpeaking = p.isSpeaking;

          return (
            <div
              key={p.identity}
              className={`relative rounded-xl overflow-hidden bg-zinc-900 border transition-all duration-150 flex items-center justify-center min-h-[160px] sm:min-h-[180px] ${
                isSpeaking
                  ? "border-emerald-400 ring-1 ring-emerald-400/40"
                  : "border-zinc-800"
              }`}
            >
              {participantTrack && !participantTrack.publication?.isMuted ? (
                <VideoTrack
                  trackRef={participantTrack}
                  className={`w-full h-full object-cover rounded-xl ${
                    p.isLocal ? "-scale-x-100" : ""
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl">
                    {p.isLocal ? (
                      <StudentAvatar
                        avatar={currentProfile?.avatar}
                        name={currentProfile?.full_name}
                        size="md"
                        showOnlineBadge={false}
                      />
                    ) : (
                      "🎓"
                    )}
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">
                    {p.name || p.identity}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {p.isLocal && isVideoOff ? "Cam off" : "Connected"}
                  </p>
                </div>
              )}

              {/* Participant Pill */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 text-[10px] font-medium text-zinc-200">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSpeaking ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                <span className="truncate max-w-[90px]">
                  {p.name || p.identity} {p.isLocal && "(You)"}
                </span>
                {!p.isMicrophoneEnabled && <MicOff className="w-3 h-3 text-rose-400 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating In-Room Media Controls Dock */}
      <div className="h-14 flex items-center justify-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-xl shadow-xl">
          {/* Mic */}
          <button
            onClick={onToggleMic}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Video */}
          <button
            onClick={onToggleVideo}
            className={`p-2 rounded-lg border transition-colors ${
              isVideoOff
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`p-2 rounded-lg border transition-colors ${
              isScreenSharing
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <ScreenShare className="w-4 h-4" />
          </button>

          {/* Emoji Reactions Bar */}
          <div className="hidden sm:flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700/60">
            {["🎉", "🔥", "👏", "☕", "❤️"].map((em) => (
              <button
                key={em}
                onClick={() => handleEmojiReaction(em)}
                className="hover:scale-125 active:scale-95 transition-transform p-1 text-xs"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Participants Drawer Trigger */}
          <button
            onClick={onToggleParticipants}
            className={`p-2 rounded-lg border transition-colors ${
              showParticipantsList
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Leave */}
          <button
            onClick={onLeave}
            className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40 active:scale-95 transition-colors shadow-sm"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Participants Drawer */}
      {showParticipantsList && (
        <div className="absolute top-0 right-0 bottom-16 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-4 z-40 animate-in slide-in-from-right duration-150 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Room Participants ({participants.length}/8)
              </span>
              <button
                onClick={onToggleParticipants}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-72 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.identity}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center text-xs">
                      {p.isLocal ? "👤" : "🎓"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">
                        {p.name || p.identity}
                      </p>
                      <p className="text-[10px] text-zinc-400">
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

          <div className="text-[11px] text-zinc-500 text-center">
            Max 8 participants per hangout room
          </div>
        </div>
      )}
    </div>
  );
}
