"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { fetchLiveKitToken } from "@/lib/livekit";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  PhoneOff,
  Search,
  Sparkles,
  MessageSquare,
  Send,
  X,
  FlipHorizontal,
  RefreshCw,
  Flame,
  Coffee,
  Code,
  Music,
} from "lucide-react";
import confetti from "canvas-confetti";

interface RandomMatchProps {
  currentProfile: UserProfile | null;
  onEndMatch: () => void;
  directRoomName?: string | null;
}

const MATCH_TOPICS = [
  { id: "random", label: "Random Surprise 🎲", icon: Sparkles },
  { id: "campus", label: "Campus Life & Chill ☕", icon: Coffee },
  { id: "coding", label: "Coding & Projects 💻", icon: Code },
  { id: "exams", label: "Exam Stress & Venting 🔥", icon: Flame },
  { id: "music", label: "Music & Indie Vibes 🎸", icon: Music },
];

export default function RandomMatch({
  currentProfile,
  onEndMatch,
  directRoomName,
}: RandomMatchProps) {
  const [selectedTopic, setSelectedTopic] = useState("random");
  const [matchState, setMatchState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomName, setRoomName] = useState<string>("");
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: string; text: string; time: string; isSelf: boolean }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [searchTimer, setSearchTimer] = useState<number>(0);
  const [isSwappedLayout, setIsSwappedLayout] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const searchingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // If a direct room was requested via an invite
  useEffect(() => {
    if (directRoomName) {
      connectToRoom(directRoomName);
    }
  }, [directRoomName]);

  const connectToRoom = async (targetRoom: string) => {
    try {
      setErrorMsg("");
      setMatchState("searching");
      setRoomName(targetRoom);

      const identity = currentProfile?.id || `student_${Date.now().toString(36)}`;
      const name = currentProfile?.full_name || "Campus Student";

      const { token, url } = await fetchLiveKitToken(targetRoom, identity, name);
      setLivekitToken(token);
      setLivekitUrl(url);

      // Short search delay simulation to mimic matching radar if not direct
      if (!directRoomName) {
        setTimeout(() => {
          setMatchState("connected");
          try {
            confetti({
              particleCount: 20,
              spread: 50,
              origin: { y: 0.6 },
            });
          } catch {}
        }, 1600);
      } else {
        setMatchState("connected");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Match connection error:", error);
      setErrorMsg(error.message || "Failed to connect to LiveKit video server");
      setMatchState("idle");
    }
  };

  const startFindingMatch = () => {
    setMatchState("searching");
    setSearchTimer(0);

    const roomBucket = Math.floor(Date.now() / (1000 * 60 * 30));
    const randomSalt = Math.floor(Math.random() * 4);
    const newRoomName = `campus_match_${selectedTopic}_${roomBucket}_${randomSalt}`;

    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    searchingIntervalRef.current = setInterval(() => {
      setSearchTimer((prev) => prev + 1);
    }, 1000);

    setTimeout(() => {
      if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
      connectToRoom(newRoomName);
    }, 1500);
  };

  const cancelSearch = () => {
    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    setMatchState("idle");
    setSearchTimer(0);
  };

  const skipToNextMatch = () => {
    setLivekitToken("");
    setMatchState("searching");
    setChatMessages([]);

    const newSalt = Math.random().toString(36).substring(2, 7);
    const nextRoom = `campus_match_${selectedTopic}_${Date.now()}_${newSalt}`;
    connectToRoom(nextRoom);
  };

  const handleEndCall = () => {
    setLivekitToken("");
    setMatchState("idle");
    setChatMessages([]);
    onEndMatch();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: currentProfile?.full_name || "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem-4rem)] md:h-[calc(100vh-3.5rem)] max-w-6xl mx-auto p-2 sm:p-4 flex flex-col justify-between">
      {/* 1. IDLE STATE: TOPIC SELECTOR & START BUTTON */}
      {matchState === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto px-4 space-y-6 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-md flex items-center justify-center">
              <Video className="w-7 h-7 text-zinc-100" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.2 rounded-md text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              1-ON-1 LIVE
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
              1-on-1 Campus Video Roulette
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              Match instantly with verified campus students. Skip anytime with one tap. Talk about classes, career, or late-night banter.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Topic Selector Chips */}
          <div className="w-full space-y-2">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Select Discussion Mood
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {MATCH_TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isSelected = selectedTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-orange-600 hover:bg-zinc-800 text-white border border-orange-600 shadow-sm"
                        : "bg-zinc-900/80 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 border border-zinc-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{topic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Matching Big Button: UIU Orange by default, turns dark gray on hover */}
          <button
            onClick={startFindingMatch}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Start Matching Students</span>
          </button>

          <p className="text-[11px] text-zinc-500">
            Powered by LiveKit Cloud WebRTC • Camera & Mic enabled on join
          </p>
        </div>
      )}

      {/* 2. SEARCHING / RADAR STATE */}
      {matchState === "searching" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
          {/* Concentric Radar Rings */}
          <div className="relative flex items-center justify-center w-48 h-48">
            <div className="absolute inset-0 rounded-full border border-zinc-800/80 radar-wave-1" />
            <div className="absolute inset-0 rounded-full border border-zinc-700/60 radar-wave-2" />
            <div className="absolute inset-0 rounded-full border border-zinc-600/40 radar-wave-3" />

            <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-zinc-700/80 shadow-xl flex flex-col items-center justify-center p-2 z-10">
              <Search className="w-6 h-6 text-zinc-300 animate-pulse mb-1" />
              <span className="text-[11px] font-semibold text-zinc-300">
                {searchTimer}s
              </span>
            </div>
          </div>

          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              Looking for a campus peer...
            </h3>
            <p className="text-xs text-zinc-400">
              Matching for: <span className="text-zinc-200 font-medium">{MATCH_TOPICS.find((t) => t.id === selectedTopic)?.label}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={skipToNextMatch}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Retry Next Room
            </button>

            <button
              onClick={cancelSearch}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. CONNECTED STATE: LIVEKIT SPLIT-SCREEN VIDEO FEEDS & DOCK */}
      {matchState === "connected" && livekitToken && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={livekitToken}
          connect={true}
          video={!isVideoOff}
          audio={!isMuted}
          className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950"
        >
          <RoomAudioRenderer />
          <ConnectedMatchContent
            currentProfile={currentProfile}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            onToggleMic={() => setIsMuted(!isMuted)}
            onToggleVideo={() => setIsVideoOff(!isVideoOff)}
            onSkip={skipToNextMatch}
            onEndCall={handleEndCall}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen(!chatOpen)}
            chatMessages={chatMessages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            isSwappedLayout={isSwappedLayout}
            onToggleSwap={() => setIsSwappedLayout(!isSwappedLayout)}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}

// Subcomponent inside LiveKitRoom to access participant tracks
interface ConnectedMatchContentProps {
  currentProfile: UserProfile | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onSkip: () => void;
  onEndCall: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  chatMessages: Array<{ sender: string; text: string; time: string; isSelf: boolean }>;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isSwappedLayout: boolean;
  onToggleSwap: () => void;
}

function ConnectedMatchContent({
  currentProfile,
  isMuted,
  isVideoOff,
  onToggleMic,
  onToggleVideo,
  onSkip,
  onEndCall,
  chatOpen,
  onToggleChat,
  chatMessages,
  chatInput,
  onChatInputChange,
  onSendMessage,
  isSwappedLayout,
  onToggleSwap,
}: ConnectedMatchContentProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);

  const remoteParticipant = participants.find((p) => !p.isLocal);
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-2 sm:p-3">
      {/* Split Video Container */}
      <div className="relative flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full h-[calc(100%-4.5rem)] overflow-hidden">
        {/* Feed A: Stranger / Remote Peer */}
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {remoteTrack && remoteTrack.publication?.isSubscribed && !remoteTrack.publication.isMuted ? (
            <VideoTrack
              trackRef={remoteTrack}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl">
                {remoteParticipant ? "🎓" : "⏳"}
              </div>
              <p className="text-xs font-semibold text-zinc-200">
                {remoteParticipant?.name || remoteParticipant?.identity || "Connecting Campus Stranger..."}
              </p>
              <p className="text-[10px] text-zinc-500">
                {remoteParticipant ? "Live in 1-on-1 Room" : "Waiting for peer WebRTC stream..."}
              </p>
            </div>
          )}

          {/* Stranger Tag */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 text-xs font-medium text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Stranger</span>
          </div>
        </div>

        {/* Feed B: Local Self Preview */}
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {localTrack && !isVideoOff ? (
            <VideoTrack
              trackRef={localTrack}
              className="w-full h-full object-cover rounded-xl -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
              <StudentAvatar
                avatar={currentProfile?.avatar}
                name={currentProfile?.full_name || "Me"}
                size="lg"
                showOnlineBadge={false}
              />
              <p className="text-xs font-semibold text-zinc-200">
                {currentProfile?.full_name || "You (Local Preview)"}
              </p>
              <p className="text-[10px] text-zinc-500">
                {isVideoOff ? "Camera turned off" : "Camera active"}
              </p>
            </div>
          )}

          {/* Local User Tag */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 text-xs font-medium text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>You</span>
          </div>

          {/* Layout Flip Button on mobile */}
          <button
            onClick={onToggleSwap}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-zinc-400 hover:text-zinc-200"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* In-Call Text Chat Drawer Overlay */}
        {chatOpen && (
          <div className="absolute top-0 right-0 bottom-16 w-full sm:w-80 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 z-30 flex flex-col justify-between animate-in slide-in-from-right duration-150 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                Live In-Call Chat
              </span>
              <button
                onClick={onToggleChat}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-2 space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <p className="text-[11px] text-zinc-500 text-center py-8">
                  Say hi to your campus match!
                </p>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.isSelf ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-xl ${
                        m.isSelf
                          ? "bg-zinc-100 text-zinc-950 font-medium"
                          : "bg-zinc-800 text-zinc-200"
                      }`}
                    >
                      <p>{m.text}</p>
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-0.5">{m.time}</span>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={onSendMessage} className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Floating Responsive Control Dock */}
      <div className="h-14 flex items-center justify-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-xl shadow-xl">
          {/* Skip / Next Match: Orange by default, turns dark gray on hover */}
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all"
          >
            <SkipForward className="w-3.5 h-3.5 text-white" />
            <span>Next / Skip</span>
          </button>

          {/* Mic Toggle */}
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

          {/* Camera Toggle */}
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

          {/* Text Chat Toggle */}
          <button
            onClick={onToggleChat}
            className={`p-2 rounded-lg border transition-colors ${
              chatOpen
                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* End Call */}
          <button
            onClick={onEndCall}
            className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40 active:scale-95 transition-colors shadow-sm"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
