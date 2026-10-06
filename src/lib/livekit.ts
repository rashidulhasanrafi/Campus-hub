export interface HangoutRoomConfig {
  id: string;
  code: string;
  name: string;
  topic: string;
  emoji: string;
  tag: string;
  maxParticipants: number;
  initialParticipants?: number;
  gradient: string;
  password?: string;
  hostName?: string;
  hostId?: string;
  isCustom?: boolean;
}

export const CAMPUS_HANGOUT_ROOMS: HangoutRoomConfig[] = [
  {
    id: "canteen-adda-1",
    code: "UIU-101",
    name: "Canteen Adda 🍔",
    topic: "Chit-chat, food debate, campus gossip, and evening chill.",
    emoji: "🍕",
    tag: "Casual",
    maxParticipants: 8,
    gradient: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  },
  {
    id: "code-lab-sync",
    code: "UIU-102",
    name: "Project & Code Jam 💻",
    topic: "Web dev, DSA debugging, hackathon brainstorming, Git help.",
    emoji: "⚡",
    tag: "Academic",
    maxParticipants: 8,
    gradient: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  },
  {
    id: "silent-study-library",
    code: "UIU-103",
    name: "Library Silent Study 📚",
    topic: "Cam-on silent accountability study session. Pomodoro style.",
    emoji: "🤫",
    tag: "Focus",
    maxParticipants: 8,
    gradient: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
    password: "uiu",
  },
  {
    id: "music-acoustic-jam",
    code: "UIU-104",
    name: "Acoustic & Music Jam 🎸",
    topic: "Bring your guitar or play your favorite indie campus tracks.",
    emoji: "🎵",
    tag: "Music",
    maxParticipants: 8,
    gradient: "from-purple-500/20 to-pink-500/10 border-purple-500/30",
  },
  {
    id: "gaming-lounge",
    code: "UIU-105",
    name: "Campus Gaming Lounge 🎮",
    topic: "Valorant, FIFA, chess, or discussing upcoming esports tournaments.",
    emoji: "🕹️",
    tag: "Gaming",
    maxParticipants: 8,
    gradient: "from-rose-500/20 to-red-500/10 border-rose-500/30",
  },
  {
    id: "freshman-advising",
    code: "UIU-106",
    name: "Freshman Q&A & Mentorship 🎓",
    topic: "Seniors helping freshers navigate course registration and profs.",
    emoji: "💡",
    tag: "Mentorship",
    maxParticipants: 8,
    gradient: "from-violet-500/20 to-indigo-500/10 border-violet-500/30",
  },
];

export async function fetchLiveKitToken(
  room: string,
  identity: string,
  name: string
): Promise<{ token: string; url: string }> {
  try {
    const res = await fetch(
      `/api/livekit-token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(
        identity
      )}&name=${encodeURIComponent(name)}`
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status} failed to obtain LiveKit token`);
    }

    const data = await res.json();
    return {
      token: data.token,
      url: data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://campus-hub-50uslxwj.livekit.cloud",
    };
  } catch (err) {
    console.error("fetchLiveKitToken error:", err);
    throw err;
  }
}

import { RoomOptions, VideoPresets } from "livekit-client";

/**
 * Detect mobile / Android WebView / small-screen low-end device
 */
export function isMobileOrLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|wv/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUa || isSmallScreen;
}

/**
 * Returns dynamic RoomOptions for LiveKit WebRTC video calls.
 * When Light UI is active or running on a mobile device / Android WebView:
 * - Dynamic resolution strictly capped at max 720p (1280x720) and 30fps
 * - Dynamically adapts and pauses invisible streams (dynacast & adaptiveStream)
 * - VP8 codec with multi-layer simulcast (180p, 360p, 720p)
 * - Max bitrate capped to 1.2 Mbps to prevent phone overheating & thermal throttling
 * On PC with Heavy UI:
 * - Unrestricted max resolution (1080p)
 */
export function getOptimalLiveKitOptions(isLightUi: boolean): RoomOptions {
  const isMobile = isMobileOrLowEndDevice();
  const useLightweight = isLightUi || isMobile;

  if (useLightweight) {
    return {
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      videoCaptureDefaults: {
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
        facingMode: "user",
      },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [
          VideoPresets.h180,
          VideoPresets.h360,
          VideoPresets.h720,
        ],
        videoCodec: "vp8",
        videoEncoding: {
          maxBitrate: 1_200_000, // 1.2 Mbps cap protects against GPU/CPU thermal runaway
          maxFramerate: 30,
        },
      },
    };
  }

  // Full / Unrestricted for PC when Light UI is off
  return {
    adaptiveStream: true,
    dynacast: true,
    stopLocalTrackOnUnpublish: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h1080.resolution,
    },
    publishDefaults: {
      simulcast: true,
      videoCodec: "vp8",
    },
  };
}
