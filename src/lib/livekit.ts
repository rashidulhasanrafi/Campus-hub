export interface HangoutRoomConfig {
  id: string;
  name: string;
  topic: string;
  emoji: string;
  tag: string;
  maxParticipants: number;
  initialParticipants?: number;
  gradient: string;
  password?: string;
}

export const CAMPUS_HANGOUT_ROOMS: HangoutRoomConfig[] = [
  {
    id: "canteen-adda-1",
    name: "Canteen Adda 🍔",
    topic: "Chit-chat, food debate, campus gossip, and evening chill.",
    emoji: "🍕",
    tag: "Casual",
    maxParticipants: 8,
    gradient: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  },
  {
    id: "code-lab-sync",
    name: "Project & Code Jam 💻",
    topic: "Web dev, DSA debugging, hackathon brainstorming, Git help.",
    emoji: "⚡",
    tag: "Academic",
    maxParticipants: 8,
    gradient: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  },
  {
    id: "silent-study-library",
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
    name: "Acoustic & Music Jam 🎸",
    topic: "Bring your guitar or play your favorite indie campus tracks.",
    emoji: "🎵",
    tag: "Music",
    maxParticipants: 8,
    gradient: "from-purple-500/20 to-pink-500/10 border-purple-500/30",
  },
  {
    id: "gaming-lounge",
    name: "Campus Gaming Lounge 🎮",
    topic: "Valorant, FIFA, chess, or discussing upcoming esports tournaments.",
    emoji: "🕹️",
    tag: "Gaming",
    maxParticipants: 8,
    gradient: "from-rose-500/20 to-red-500/10 border-rose-500/30",
  },
  {
    id: "freshman-advising",
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
