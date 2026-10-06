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
import { Track } from "livekit-client";
import { supabase, UserProfile } from "@/lib/supabase";
import { fetchLiveKitToken, getOptimalLiveKitOptions } from "@/lib/livekit";
import { useUiMode } from "@/context/UiModeContext";
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
  Flame,
  Coffee,
  Code,
  Music,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";

interface RandomMatchProps {
  currentProfile: UserProfile | null;
  onEndMatch: () => void;
  directRoomName?: string | null;
  onInCallChange?: (inCall: boolean) => void;
}

const MATCH_TOPICS = [
  { id: "random", label: "Random Surprise 🎲", icon: Sparkles },
  { id: "campus", label: "Campus Life & Chill ☕", icon: Coffee },
  { id: "coding", label: "Coding & Projects 💻", icon: Code },
  { id: "exams", label: "Exam Stress & Venting 🔥", icon: Flame },
  { id: "music", label: "Music & Indie Vibes 🎸", icon: Music },
];

interface MatchPresence {
  clientId: string;
  userId: string;
  userName: string;
  avatar: string;
  department: string;
  topic: string;
  joinedAt: number;
  status: "searching" | "matched";
  roomName?: string;
}

export default function RandomMatch({
  currentProfile,
  onEndMatch,
  directRoomName,
  onInCallChange,
}: RandomMatchProps) {
  const { isLightUi } = useUiMode();
  const roomOptions = React.useMemo(() => getOptimalLiveKitOptions(isLightUi), [isLightUi]);

  const [selectedTopic, setSelectedTopic] = useState("random");
  const [matchState, setMatchState] = useState<"idle" | "searching" | "connected">("idle");
  const [roomName, setRoomName] = useState<string>("");
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: string; text: string; time: string; isSelf: boolean }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [searchTimer, setSearchTimer] = useState<number>(0);
  const [isSwappedLayout, setIsSwappedLayout] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [queueCount, setQueueCount] = useState<number>(0);
  const [peerLeftNotice, setPeerLeftNotice] = useState<string>("");

  // Unique client ID per browser tab to allow testing across multiple tabs
  const clientIdRef = useRef<string>(
    typeof window !== "undefined"
      ? `client_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`
      : "client_ssr"
  );
  const myClientId = clientIdRef.current;

  // Refs for real-time coordinator
  const matchStateRef = useRef<"idle" | "searching" | "connected">("idle");
  const selectedTopicRef = useRef<string>("random");
  const myJoinedAtRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);
  const currentRoomNameRef = useRef<string>("");
  const currentPeerClientIdRef = useRef<string | null>(null);
  const recentlySkippedRef = useRef<Set<string>>(new Set());
  const searchingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync refs with state
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  useEffect(() => {
    selectedTopicRef.current = selectedTopic;
  }, [selectedTopic]);

  // Sync call state with parent to hide navigation bars
  useEffect(() => {
    const inCall = matchState === "connected" && Boolean(livekitToken);
    onInCallChange?.(inCall);
    return () => {
      onInCallChange?.(false);
    };
  }, [matchState, livekitToken, onInCallChange]);

  // Helper to connect to a LiveKit room
  const connectToRoom = useCallback(
    async (targetRoom: string) => {
      try {
        setErrorMsg("");
        setPeerLeftNotice("");
        if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
        currentRoomNameRef.current = targetRoom;
        setRoomName(targetRoom);

        // Keep identity unique per tab/session to avoid LiveKit duplicate eviction
        const sessionSuffix = myClientId.slice(-4);
        const identity = currentProfile?.id
          ? `${currentProfile.id}_${sessionSuffix}`
          : `student_${myClientId}`;
        const name = currentProfile?.full_name || "Campus Student";

        const { token, url } = await fetchLiveKitToken(targetRoom, identity, name);
        setLivekitToken(token);
        setLivekitUrl(url);
        setMatchState("connected");

        try {
          confetti({
            particleCount: 25,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Match connection error:", error);
        setErrorMsg(error.message || "Failed to connect to LiveKit video server");
        setMatchState("idle");
        isConnectingRef.current = false;
        if (channelRef.current) {
          try {
            channelRef.current.untrack();
          } catch {}
        }
      }
    },
    [currentProfile, myClientId]
  );

  // If a direct room was requested via an invite from lounge
  useEffect(() => {
    if (directRoomName) {
      connectToRoom(directRoomName);
    }
  }, [directRoomName, connectToRoom]);

  // Evaluate matchmaking queue deterministically
  const evaluateMatch = useCallback(() => {
    if (matchStateRef.current !== "searching") return;
    if (isConnectingRef.current) return;
    if (!channelRef.current) return;

    const presState = channelRef.current.presenceState();
    const searchers: MatchPresence[] = [];

    Object.values(presState).forEach((presList: any) => {
      presList.forEach((pres: any) => {
        if (pres && pres.clientId && pres.status === "searching") {
          searchers.push(pres);
        }
      });
    });

    setQueueCount(searchers.length);

    const myTopic = selectedTopicRef.current;
    const myJoinedAt = myJoinedAtRef.current;
    const waitSec = (Date.now() - myJoinedAt) / 1000;

    // Filter available candidates
    const eligiblePeers = searchers.filter((p) => {
      if (p.clientId === myClientId) return false;
      if (recentlySkippedRef.current.has(p.clientId)) return false;

      // Topic matching:
      // If either is "random", or topics match, or user has waited > 6s (expand search):
      return (
        myTopic === "random" ||
        p.topic === "random" ||
        p.topic === myTopic ||
        waitSec > 6
      );
    });

    if (eligiblePeers.length === 0) return;

    // Pick peer who waited longest
    eligiblePeers.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    const targetPeer = eligiblePeers[0];

    // Deterministic host election:
    // The user who joined earlier acts as Match Host. If tied, use string comparison of clientId.
    const peerJoinedAt = targetPeer.joinedAt || 0;
    const isHost =
      myJoinedAt < peerJoinedAt ||
      (myJoinedAt === peerJoinedAt && myClientId < targetPeer.clientId);

    if (isHost) {
      isConnectingRef.current = true;
      currentPeerClientIdRef.current = targetPeer.clientId;
      const matchRoom = `uiu_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      channelRef.current.send({
        type: "broadcast",
        event: "match-found",
        payload: {
          hostClientId: myClientId,
          peerClientId: targetPeer.clientId,
          roomName: matchRoom,
          topic: myTopic,
        },
      });

      // Mark status as matched so no other client attempts to pair
      channelRef.current.track({
        clientId: myClientId,
        status: "matched",
        roomName: matchRoom,
      });

      connectToRoom(matchRoom);
    }
  }, [myClientId, connectToRoom]);

  // Subscribe to Realtime Matchmaking Channel
  useEffect(() => {
    const channel = supabase.channel("campus-1on1-matchmaking", {
      config: {
        presence: { key: myClientId },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    // Listen for presence changes
    channel.on("presence", { event: "sync" }, () => {
      evaluateMatch();
    });

    // Listen for incoming match proposal
    channel.on("broadcast", { event: "match-found" }, async ({ payload }) => {
      if (matchStateRef.current !== "searching") return;
      if (payload.peerClientId !== myClientId) return;
      if (isConnectingRef.current) return;

      isConnectingRef.current = true;
      currentPeerClientIdRef.current = payload.hostClientId;

      channel.track({
        clientId: myClientId,
        status: "matched",
        roomName: payload.roomName,
      });

      connectToRoom(payload.roomName);
    });

    // Peer skipped notification
    channel.on("broadcast", { event: "peer-skipped" }, ({ payload }) => {
      if (payload.roomName === currentRoomNameRef.current) {
        setPeerLeftNotice("Your peer skipped to the next student 👋");
      }
    });

    // Peer ended call notification
    channel.on("broadcast", { event: "peer-ended" }, ({ payload }) => {
      if (payload.roomName === currentRoomNameRef.current) {
        setPeerLeftNotice("Your peer left the call 👋");
      }
    });

    // In-call text chat messages broadcast
    channel.on("broadcast", { event: "chat-msg" }, ({ payload }) => {
      if (payload.roomName === currentRoomNameRef.current) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: payload.sender,
            text: payload.text,
            time: payload.time,
            isSelf: false,
          },
        ]);
      }
    });

    channel.subscribe();

    return () => {
      try {
        channel.untrack();
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [myClientId, evaluateMatch, connectToRoom]);

  // Track user in matchmaking presence
  const trackSearching = async (topic: string) => {
    if (!channelRef.current) return;
    try {
      await channelRef.current.track({
        clientId: myClientId,
        userId: currentProfile?.id || `anon_${myClientId}`,
        userName: currentProfile?.full_name || "Campus Student",
        avatar: currentProfile?.avatar || "/images/avatar-male.png",
        department: currentProfile?.department || "CSE",
        topic,
        joinedAt: Date.now(),
        status: "searching",
      });
    } catch (err) {
      console.warn("Matchmaking track error:", err);
    }
  };

  // Start Matching
  const startFindingMatch = async () => {
    setErrorMsg("");
    setPeerLeftNotice("");
    setMatchState("searching");
    setSearchTimer(0);
    myJoinedAtRef.current = Date.now();
    isConnectingRef.current = false;

    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    searchingIntervalRef.current = setInterval(() => {
      setSearchTimer((prev) => {
        const next = prev + 1;
        // Periodic check to catch any queue events
        if (next % 2 === 0) {
          evaluateMatch();
        }
        return next;
      });
    }, 1000);

    await trackSearching(selectedTopic);
    evaluateMatch();
  };

  // Cancel Search
  const cancelSearch = () => {
    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    setMatchState("idle");
    setSearchTimer(0);
    isConnectingRef.current = false;
    if (channelRef.current) {
      try {
        channelRef.current.untrack();
      } catch {}
    }
  };

  // Skip / Next Match
  const skipToNextMatch = async () => {
    if (channelRef.current && currentRoomNameRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "peer-skipped",
        payload: {
          roomName: currentRoomNameRef.current,
          fromClientId: myClientId,
        },
      });
    }

    if (currentPeerClientIdRef.current) {
      const prevPeer = currentPeerClientIdRef.current;
      recentlySkippedRef.current.add(prevPeer);
      setTimeout(() => {
        recentlySkippedRef.current.delete(prevPeer);
      }, 20000);
    }

    currentPeerClientIdRef.current = null;
    currentRoomNameRef.current = "";
    setPeerLeftNotice("");
    setLivekitToken("");
    setChatMessages([]);
    isConnectingRef.current = false;
    setMatchState("searching");
    setSearchTimer(0);
    myJoinedAtRef.current = Date.now();

    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    searchingIntervalRef.current = setInterval(() => {
      setSearchTimer((prev) => {
        const next = prev + 1;
        if (next % 2 === 0) {
          evaluateMatch();
        }
        return next;
      });
    }, 1000);

    await trackSearching(selectedTopicRef.current);
    evaluateMatch();
  };

  // End Call / Exit
  const handleEndCall = () => {
    if (channelRef.current && currentRoomNameRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "peer-ended",
        payload: {
          roomName: currentRoomNameRef.current,
          fromClientId: myClientId,
        },
      });
    }

    if (searchingIntervalRef.current) clearInterval(searchingIntervalRef.current);
    currentPeerClientIdRef.current = null;
    currentRoomNameRef.current = "";
    setPeerLeftNotice("");
    setLivekitToken("");
    setChatMessages([]);
    isConnectingRef.current = false;
    setMatchState("idle");
    if (channelRef.current) {
      try {
        channelRef.current.untrack();
      } catch {}
    }
    onEndMatch();
  };

  // Handle in-call text chat submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sender = currentProfile?.full_name || "Campus Student";

    const newMsg = {
      sender: "You",
      text,
      time,
      isSelf: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    if (channelRef.current && currentRoomNameRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "chat-msg",
        payload: {
          roomName: currentRoomNameRef.current,
          sender,
          text,
          time,
        },
      });
    }
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
            <div className="absolute inset-0 rounded-full border border-orange-500/20 radar-wave-1" />
            <div className="absolute inset-0 rounded-full border border-orange-500/30 radar-wave-2" />
            <div className="absolute inset-0 rounded-full border border-orange-500/40 radar-wave-3" />

            <div className="relative w-24 h-24 rounded-full bg-zinc-900 border border-orange-500/50 shadow-xl shadow-orange-500/10 flex flex-col items-center justify-center p-2 z-10">
              <Search className="w-6 h-6 text-orange-400 animate-pulse mb-1" />
              <span className="text-[11px] font-semibold text-zinc-200">
                {searchTimer}s
              </span>
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {queueCount > 1
                  ? `${queueCount} students active in queue`
                  : "Searching campus network..."}
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              {queueCount > 1
                ? "Peer found! Connecting video stream..."
                : "Looking for another student..."}
            </h3>
            <p className="text-xs text-zinc-400">
              Selected mood:{" "}
              <span className="text-zinc-200 font-medium">
                {MATCH_TOPICS.find((t) => t.id === selectedTopic)?.label}
              </span>
            </p>
            {searchTimer > 5 && selectedTopic !== "random" && (
              <p className="text-[11px] text-orange-400/90 animate-pulse">
                Expanding search to all moods for faster matching...
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {selectedTopic !== "random" && (
              <button
                onClick={() => {
                  setSelectedTopic("random");
                  selectedTopicRef.current = "random";
                  trackSearching("random");
                }}
                className="px-4 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-xs font-semibold text-orange-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Match Any Mood
              </button>
            )}

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
          video={isLightUi ? { resolution: { width: 1280, height: 720, frameRate: 30 } } : true}
          audio={true}
          options={roomOptions}
          onError={(err) => setErrorMsg(err.message || "LiveKit connection error")}
          onMediaDeviceFailure={(failure) => {
            console.warn("Media device failure:", failure);
            setErrorMsg("Could not access camera or microphone. Please check browser permissions.");
          }}
          className="fixed inset-0 z-50 bg-black h-[100dvh] w-full overflow-hidden flex flex-col justify-between select-none"
        >
          <RoomAudioRenderer />
          <ConnectedMatchContent
            currentProfile={currentProfile}
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
            peerLeftNotice={peerLeftNotice}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}

// Subcomponent inside LiveKitRoom to access participant tracks
interface ConnectedMatchContentProps {
  currentProfile: UserProfile | null;
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
  peerLeftNotice?: string;
}

function ConnectedMatchContent({
  currentProfile,
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
  peerLeftNotice,
}: ConnectedMatchContentProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, cameraTrack } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);
  const [isCamToggling, setIsCamToggling] = useState(false);
  const [isMicToggling, setIsMicToggling] = useState(false);

  const remoteParticipant = participants.find((p) => !p.isLocal);
  const hasSeenPeerRef = useRef(false);

  useEffect(() => {
    if (remoteParticipant) {
      hasSeenPeerRef.current = true;
    }
  }, [remoteParticipant]);

  const isPeerDisconnected = Boolean(peerLeftNotice) || (hasSeenPeerRef.current && !remoteParticipant);

  const handleToggleCam = async () => {
    if (!room || !room.localParticipant || isCamToggling) return;
    setIsCamToggling(true);
    try {
      await room.localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (e) {
      console.error("Camera toggle error:", e);
    } finally {
      setIsCamToggling(false);
    }
  };

  const handleToggleMicrophone = async () => {
    if (!room || !room.localParticipant || isMicToggling) return;
    setIsMicToggling(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      console.error("Mic toggle error:", e);
    } finally {
      setIsMicToggling(false);
    }
  };

  const remoteTrack = tracks.find(
    (t) =>
      !t.participant.isLocal &&
      t.source === Track.Source.Camera &&
      isTrackReference(t) &&
      !t.publication?.isMuted
  );

  const localInTracks = tracks.find(
    (t) =>
      t.participant.isLocal &&
      t.source === Track.Source.Camera &&
      isTrackReference(t) &&
      !t.publication?.isMuted
  );

  const localTrackRef =
    isCameraEnabled && cameraTrack && !cameraTrack.isMuted
      ? { participant: localParticipant, source: Track.Source.Camera, publication: cameraTrack }
      : isCameraEnabled && localInTracks
      ? localInTracks
      : null;

  // On mobile (or swapped state), determine which feed is full-screen background and which is PIP:
  const backgroundTrack = isSwappedLayout ? localTrackRef : remoteTrack;
  const isBackgroundLocal = isSwappedLayout;
  const backgroundParticipant = isSwappedLayout ? localParticipant : remoteParticipant;

  const pipTrack = isSwappedLayout ? remoteTrack : localTrackRef;
  const isPipLocal = !isSwappedLayout;
  const pipParticipant = isSwappedLayout ? remoteParticipant : localParticipant;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-black select-none">
      {/* ======================================================== */}
      {/* 1. MOBILE NATIVE APP VIEW (WhatsApp / Google Meet Style) */}
      {/* ======================================================== */}
      <div className="md:hidden relative w-full h-full overflow-hidden flex flex-col justify-between">
        {/* Full-Screen Remote Background Stream */}
        <div className="absolute inset-0 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          {backgroundTrack && backgroundTrack.publication?.track ? (
            <VideoTrack
              trackRef={backgroundTrack}
              className={`w-full h-full object-cover ${isBackgroundLocal ? "-scale-x-100" : ""}`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="relative">
                <StudentAvatar
                  avatar={isBackgroundLocal ? currentProfile?.avatar : undefined}
                  name={backgroundParticipant?.name || backgroundParticipant?.identity || "Campus Stranger"}
                  size="xl"
                  showOnlineBadge={false}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {backgroundParticipant?.name || (isBackgroundLocal ? currentProfile?.full_name : "Campus Stranger")}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {!isBackgroundLocal ? "Live 1-on-1 Campus Match" : "Camera turned off"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Top Header Overlay: Gradient blur with Title, Back/Leave, Swap, and Chat */}
        <div className="absolute top-0 inset-x-0 z-30 pt-3 px-4 pb-8 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onEndCall}
              className="p-2 -ml-1 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"
              title="Leave / End Call"
            >
              <PhoneOff className="w-4 h-4 text-rose-400" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
                  {remoteParticipant?.name || "Campus Stranger"}
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <p className="text-[10px] text-zinc-300/80 truncate drop-shadow-sm flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                <span>UIU 1-on-1 Match</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleSwap}
              title="Flip / Swap Preview"
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-zinc-200 border border-white/10 backdrop-blur-md active:scale-95 transition-all"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleChat}
              title="Chat"
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-zinc-200 border border-white/10 backdrop-blur-md active:scale-95 transition-all relative"
            >
              <MessageSquare className="w-4 h-4" />
              {chatMessages.length > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Floating Local User Preview (PIP) in Corner */}
        <div
          onClick={onToggleSwap}
          title="Tap to switch camera preview"
          className="absolute top-20 right-3.5 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 bg-zinc-900 cursor-pointer active:scale-95 transition-all group"
        >
          {pipTrack && pipTrack.publication?.track ? (
            <VideoTrack
              trackRef={pipTrack}
              className={`w-full h-full object-cover ${isPipLocal ? "-scale-x-100" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-zinc-900">
              <StudentAvatar
                avatar={isPipLocal ? currentProfile?.avatar : undefined}
                name={pipParticipant?.name || "Peer"}
                size="sm"
                showOnlineBadge={false}
              />
              <span className="text-[9px] text-zinc-300 font-medium mt-1 truncate max-w-[80px]">
                {isPipLocal ? "You (Cam Off)" : "Cam Off"}
              </span>
            </div>
          )}

          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[8px] font-semibold text-zinc-200">
            <span>{isPipLocal ? "You" : "Peer"}</span>
            <FlipHorizontal className="w-2.5 h-2.5 text-zinc-400 group-hover:text-white" />
          </div>
        </div>

        {/* Essential Floating Call Controls at Bottom */}
        <div className="absolute bottom-6 inset-x-0 z-30 pb-safe px-4 flex items-center justify-center pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/65 border border-white/15 backdrop-blur-xl shadow-2xl">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMicrophone}
              disabled={isMicToggling}
              title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                !isMicrophoneEnabled
                  ? "bg-rose-500/25 border-rose-500 text-rose-400"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
            >
              {!isMicrophoneEnabled ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={handleToggleCam}
              disabled={isCamToggling}
              title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                !isCameraEnabled
                  ? "bg-rose-500/25 border-rose-500 text-rose-400"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
            >
              {!isCameraEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Next / Skip Match */}
            <button
              onClick={onSkip}
              title="Next Match"
              className="h-12 px-4 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
            >
              <SkipForward className="w-4 h-4 text-white" />
              <span className="hidden xs:inline">Next</span>
            </button>

            {/* Leave / End Call */}
            <button
              onClick={onEndCall}
              title="End Call"
              className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-90 transition-all"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP / TABLET SPLIT SCREEN VIEW                    */}
      {/* ======================================================== */}
      <div className="hidden md:flex flex-col justify-between w-full h-full p-3">
        {/* Split Video Container */}
        <div className="relative flex-1 grid grid-cols-2 gap-3 w-full h-[calc(100%-4.5rem)] overflow-hidden">
          {/* Feed A: Stranger / Remote Peer */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            {remoteTrack && remoteTrack.publication?.track ? (
              <VideoTrack
                trackRef={remoteTrack}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl">
                  {remoteParticipant ? "🎓" : "⏳"}
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  {remoteParticipant?.name || remoteParticipant?.identity || "Connecting Campus Stranger..."}
                </p>
                <p className="text-xs text-zinc-500">
                  {remoteParticipant ? "Live in 1-on-1 Room" : "Waiting for peer WebRTC stream..."}
                </p>
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-700/80 text-xs font-medium text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Stranger</span>
            </div>
          </div>

          {/* Feed B: Local Self Preview */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
            {localTrackRef ? (
              <VideoTrack
                trackRef={localTrackRef}
                className="w-full h-full object-cover rounded-2xl -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                <StudentAvatar
                  avatar={currentProfile?.avatar}
                  name={currentProfile?.full_name || "Me"}
                  size="xl"
                  showOnlineBadge={false}
                />
                <p className="text-sm font-semibold text-zinc-200">
                  {currentProfile?.full_name || "You (Local Preview)"}
                </p>
                <p className="text-xs text-zinc-500">
                  {!isCameraEnabled ? "Camera turned off" : "Camera starting..."}
                </p>
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-700/80 text-xs font-medium text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>You</span>
            </div>
          </div>
        </div>

        {/* Desktop Floating Control Dock */}
        <div className="h-16 flex items-center justify-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-xl shadow-2xl">
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <SkipForward className="w-4 h-4 text-white" />
              <span>Next Match</span>
            </button>

            <button
              onClick={handleToggleMicrophone}
              disabled={isMicToggling}
              title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
              className={`p-2.5 rounded-xl border transition-colors ${
                !isMicrophoneEnabled
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                  : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {!isMicrophoneEnabled ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleCam}
              disabled={isCamToggling}
              title={isCameraEnabled ? "Stop Camera" : "Start Camera"}
              className={`p-2.5 rounded-xl border transition-colors ${
                !isCameraEnabled
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                  : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {!isCameraEnabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleChat}
              className={`p-2.5 rounded-xl border transition-colors relative ${
                chatOpen
                  ? "bg-zinc-800 border-orange-500/50 text-orange-400"
                  : "bg-zinc-800/80 border-zinc-700/60 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {chatMessages.length > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={onEndCall}
              className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/40 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Disconnected / Peer Left Overlay */}
      {isPeerDisconnected && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
            <PhoneOff className="w-7 h-7 text-rose-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
            {peerLeftNotice || "Your match left the conversation"}
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mb-6">
            The student skipped or disconnected. Tap below to immediately match with someone else!
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              onClick={onSkip}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              <SkipForward className="w-4 h-4 text-white" />
              <span>Find Next Match</span>
            </button>
            <button
              onClick={onEndCall}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              Exit to Lounge
            </button>
          </div>
        </div>
      )}

      {/* In-Call Text Chat Drawer Overlay */}
      {chatOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 p-4 z-40 flex flex-col justify-between animate-in slide-in-from-right duration-200 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              Live In-Call Chat
            </span>
            <button
              onClick={onToggleChat}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Sparkles className="w-8 h-8 text-orange-400/60 mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Say hi to your campus match!</p>
                <p className="text-[10px] text-zinc-500 mt-1">Messages disappear when the call ends.</p>
              </div>
            ) : (
              chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.isSelf ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-xl ${
                      m.isSelf
                        ? "bg-orange-600 text-white font-medium"
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

          <form onSubmit={onSendMessage} className="flex items-center gap-2 pt-3 border-t border-zinc-800">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500/50"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
