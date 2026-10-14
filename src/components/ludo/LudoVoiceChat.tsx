"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Participant,
  RemoteParticipant,
  Track,
  RemoteTrackPublication,
} from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";
import { Mic, MicOff, Volume2, VolumeX, Radio, AlertCircle } from "lucide-react";

interface LudoVoiceChatProps {
  roomId: string;
  userId: string;
  userName: string;
  onSpeakersChanged: (speakingUserIds: Set<string>) => void;
  mutedSpeakers: Record<string, boolean>; // userId -> isMuted
  onToggleSpeakerMute: (userId: string) => void;
}

export default function LudoVoiceChat({
  roomId,
  userId,
  userName,
  onSpeakersChanged,
  mutedSpeakers,
  onToggleSpeakerMute,
}: LudoVoiceChatProps) {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Connect to LiveKit Audio Room
  useEffect(() => {
    let isMounted = true;
    // Match exact LiveKit voice room name used by Native Android app
    const audioRoomName = `ludo_voice_${roomId}`;

    async function initAudioRoom() {
      try {
        setConnecting(true);
        setErrorMsg(null);

        // 1. Fetch token for audio-only room
        const { token, url } = await fetchLiveKitToken(
          audioRoomName,
          userId,
          userName
        );

        if (!isMounted) return;

        // 2. Instantiate LiveKit Room
        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        roomRef.current = room;

        // 3. Setup event listeners
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          if (!isMounted) return;
          const activeIds = new Set<string>();
          speakers.forEach((s) => {
            if (s.identity) activeIds.add(s.identity);
          });
          onSpeakersChanged(activeIds);
        });

        // Attach remote audio tracks
        room.on(
          RoomEvent.TrackSubscribed,
          (
            track: Track,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach() as HTMLAudioElement;
              el.autoplay = true;
              audioElementsRef.current.set(participant.identity, el);

              // Apply mute if previously muted
              if (mutedSpeakers[participant.identity]) {
                el.muted = true;
              }
            }
          }
        );

        // Detach on unsubscribe
        room.on(
          RoomEvent.TrackUnsubscribed,
          (track: Track, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            track.detach();
            audioElementsRef.current.delete(participant.identity);
          }
        );

        room.on(RoomEvent.Disconnected, () => {
          if (isMounted) setIsConnected(false);
        });

        // 4. Connect to LiveKit Room
        await room.connect(url, token);

        if (!isMounted) {
          room.disconnect();
          return;
        }

        // 5. Publish microphone only (audio: true, video: false)
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMicMuted(false);
        } catch (micErr) {
          console.warn("Could not enable microphone automatically:", micErr);
          setIsMicMuted(true);
        }

        setIsConnected(true);
        setConnecting(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const errObj = err as Error;
        console.warn("LiveKit Audio room connection failed:", errObj);
        setErrorMsg("Voice room offline. Playing in silent mode.");
        setConnecting(false);
      }
    }

    initAudioRoom();

    return () => {
      isMounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      audioElementsRef.current.forEach((el) => {
        el.pause();
        el.srcObject = null;
        el.remove();
      });
      audioElementsRef.current.clear();
    };
  }, [roomId, userId, userName, onSpeakersChanged]);

  // Update volume/mute of remote audio elements when mutedSpeakers changes
  useEffect(() => {
    audioElementsRef.current.forEach((el, participantId) => {
      const isMuted = Boolean(mutedSpeakers[participantId]);
      el.muted = isMuted;
    });
  }, [mutedSpeakers]);

  // Toggle user's master microphone
  const handleToggleMic = async () => {
    if (!roomRef.current || !isConnected) return;
    try {
      const nextMuted = !isMicMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMicMuted(nextMuted);
    } catch (e) {
      console.error("Failed to toggle microphone:", e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Master Mic Toggle Button */}
      <button
        type="button"
        onClick={handleToggleMic}
        disabled={connecting}
        title={isMicMuted ? "Unmute My Microphone" : "Mute My Microphone"}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer border ${
          isMicMuted
            ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/20"
        }`}
      >
        {isMicMuted ? (
          <>
            <MicOff className="w-4 h-4 text-rose-400" />
            <span>Mic Off</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Mic Live</span>
          </>
        )}
      </button>

      {/* Voice Status Pill */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
        <Radio
          className={`w-3.5 h-3.5 ${
            isConnected
              ? "text-emerald-400 animate-pulse"
              : connecting
              ? "text-amber-400 animate-spin"
              : "text-zinc-500"
          }`}
        />
        <span>{isConnected ? "Voice Live" : connecting ? "Connecting Voice..." : "Voice Offline"}</span>
      </div>
    </div>
  );
}
