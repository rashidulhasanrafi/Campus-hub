import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ufddryfhzlnpqxekmbad.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_XiU2oSz-OIt3CXOqzZQimQ_17DbCDGt";

const globalForSupabase = globalThis as unknown as {
  supabaseClient?: SupabaseClient<any, "public", any>;
};

export const supabase: SupabaseClient<any, "public", any> =
  globalForSupabase.supabaseClient ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseClient = supabase;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  department: string;
  batch: string;
  avatar: string;
  status: string;
  bio?: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface DirectCallInvite {
  fromId: string;
  fromName: string;
  fromAvatar: string;
  fromDepartment: string;
  fromBatch: string;
  toId: string;
  roomName: string;
  timestamp: number;
}

export interface ShoutoutPost {
  id: string;
  userId: string;
  userName: string;
  userDepartment: string;
  userAvatar: string;
  content: string;
  tag: string;
  likes: number;
  timeAgo: string;
}

export const UIU_PROGRAMS = [
  "Computer Science & Engineering (CSE)",
  "Electrical & Electronic Engineering (EEE)",
  "Civil Engineering (CE)",
  "Data Science (DS)",
  "Business Administration (BBA)",
  "Accounting & Information Systems (AIS)",
  "Economics (ECO)",
  "Environment and Development Studies (EDS)",
  "Media Studies and Journalism (MSJ)",
  "English",
  "Pharmacy",
  "Biotechnology and Genetic Engineering (BGE)",
];

export const CAMPUS_DEPARTMENTS = [
  "Computer Science & Eng (CSE)",
  "Electrical & Electronics (EEE)",
  "Business & Economics (BBA)",
  "Software Engineering (SWE)",
  "Mechanical Engineering (ME)",
  "Data Science & AI (DSAI)",
  "Architecture & Design (ARCH)",
  "Biotechnology (BIOTECH)",
];

export const CAMPUS_BATCHES = [
  "Batch '23 (Senior)",
  "Batch '24 (Junior)",
  "Batch '25 (Sophomore)",
  "Batch '26 (Freshman)",
  "Batch '27 (Pre-College)",
  "Alumni & Postgrad",
];

export const CAMPUS_STATUS_OPTIONS = [
  { label: "Ready to chat 💬", color: "from-emerald-500 to-teal-500" },
  { label: "Free for coffee ☕", color: "from-amber-500 to-orange-500" },
  { label: "Studying at Library 📚", color: "from-blue-500 to-indigo-500" },
  { label: "Exam prep grind 🔥", color: "from-rose-500 to-pink-500" },
  { label: "Chilling at Canteen 🍕", color: "from-purple-500 to-violet-500" },
  { label: "Need project partner 💡", color: "from-cyan-500 to-blue-500" },
];

export const AVATAR_OPTIONS = [
  {
    id: "avatar-male",
    emoji: "/images/avatar-male.png",
    label: "Male Student",
    bg: "bg-blue-900/30",
  },
  {
    id: "avatar-female",
    emoji: "/images/avatar-female.png",
    label: "Female Student",
    bg: "bg-rose-900/30",
  },
];

export const INITIAL_SHOUTOUTS: ShoutoutPost[] = [
  {
    id: "post-1",
    userId: "campus-bot",
    userName: "Ayesha Noor",
    userDepartment: "Computer Science & Eng (CSE)",
    userAvatar: "/images/avatar-female.png",
    content: "Algorithms midterm study cram in Room 302! Join in if you're stuck on Dynamic Programming 🚀",
    tag: "Study Jam",
    likes: 14,
    timeAgo: "12m ago",
  },
  {
    id: "post-2",
    userId: "campus-bot-2",
    userName: "Tanvir Ahmed",
    userDepartment: "Business & Economics (BBA)",
    userAvatar: "/images/avatar-male.png",
    content: "Central cafeteria coffee is surprisingly good today. Who is around for a quick chat? ☕",
    tag: "Chit Chat",
    likes: 9,
    timeAgo: "25m ago",
  },
  {
    id: "post-3",
    userId: "campus-bot-3",
    userName: "Sarah Jenkins",
    userDepartment: "Data Science & AI (DSAI)",
    userAvatar: "/images/avatar-female.png",
    content: "Looking for 1 more teammate for the upcoming Inter-University Hackathon! Drop a DM or call me!",
    tag: "Hackathon",
    likes: 22,
    timeAgo: "45m ago",
  },
];

export const MOCK_STUDENTS: UserProfile[] = [
  {
    id: "student-farhan",
    full_name: "Farhan Rahman",
    department: "Computer Science & Eng (CSE)",
    batch: "Batch '24 (Junior)",
    avatar: "/images/avatar-male.png",
    status: "Ready to chat 💬",
    bio: "Building mobile apps & playing chess between classes.",
    is_online: true,
  },
  {
    id: "student-priya",
    full_name: "Priya Sharma",
    department: "Data Science & AI (DSAI)",
    batch: "Batch '25 (Sophomore)",
    avatar: "/images/avatar-female.png",
    status: "Free for coffee ☕",
    bio: "Machine learning enthusiast & cafeteria regular.",
    is_online: true,
  },
  {
    id: "student-adnan",
    full_name: "Adnan Chowdhury",
    department: "Electrical & Electronics (EEE)",
    batch: "Batch '23 (Senior)",
    avatar: "/images/avatar-male.png",
    status: "Studying at Library 📚",
    bio: "Final year thesis grind. Ask me about microcontrollers.",
    is_online: true,
  },
  {
    id: "student-anika",
    full_name: "Anika Tabassum",
    department: "Architecture & Design (ARCH)",
    batch: "Batch '24 (Junior)",
    avatar: "/images/avatar-female.png",
    status: "Exam prep grind 🔥",
    bio: "Studio all night, coffee all day ☕",
    is_online: true,
  },
  {
    id: "student-zayan",
    full_name: "Zayan Kabir",
    department: "Software Engineering (SWE)",
    batch: "Batch '26 (Freshman)",
    avatar: "/images/avatar-male.png",
    status: "Chilling at Canteen 🍕",
    bio: "First year surviving calculus & discovering university bands.",
    is_online: true,
  },
];

// Profile storage & Supabase synchronization
const LOCAL_STORAGE_KEY = "campus_hub_student_profile";

export function getLocalProfile(userId?: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    if (userId) {
      const userRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
      if (userRaw) return JSON.parse(userRaw) as UserProfile;
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (userId && parsed.id !== userId) return null;
    // Upgrade legacy unsplash or missing avatar to user-provided male/female avatars
    if (!parsed.avatar || parsed.avatar.includes("unsplash.com")) {
      const isF = (parsed.full_name || "").toLowerCase().includes("priya") ||
        (parsed.full_name || "").toLowerCase().includes("anika") ||
        (parsed.full_name || "").toLowerCase().includes("sara") ||
        (parsed.full_name || "").toLowerCase().includes("female");
      parsed.avatar = isF ? "/images/avatar-female.png" : "/images/avatar-male.png";
    }
    return parsed;
  } catch (err) {
    console.error("Failed to read local profile:", err);
    return null;
  }
}

export function saveLocalProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    if (profile.id) {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${profile.id}`, JSON.stringify(profile));
    }
  } catch (err) {
    console.error("Failed to save local profile:", err);
  }
}

export const DEV_SESSION_KEY = "campus_hub_dev_preview_session";

export const DEV_MOCK_PROFILE: UserProfile = {
  id: "dev-preview-user",
  email: "student@bscse.uiu.ac.bd",
  full_name: "Test Student (UIU)",
  department: "Computer Science & Eng (CSE)",
  batch: "Batch '24 (Junior)",
  avatar: "/images/avatar-male.png",
  status: "Ready to chat 💬",
  bio: "UIU Campus Hub • Testing real-time video, 1-on-1 match & hangout rooms.",
  is_online: true,
  last_seen: new Date().toISOString(),
};

/**
 * Detect campus theme based on student email domain or active session.
 * Defaults to 'uiu' for UIU domain, guest preview, or fallback.
 */
export function detectCampusTheme(email?: string): string {
  if (!email) return "uiu";
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith("uiu.ac.bd") || normalized.includes("@uiu.ac.bd") || normalized.includes(".uiu.ac.bd")) {
    return "uiu";
  }
  return "uiu"; // Active campus fallback
}

export function isDevPreviewActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_SESSION_KEY) === "true";
}

export function setDevPreview(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    localStorage.setItem(DEV_SESSION_KEY, "true");
    saveLocalProfile(DEV_MOCK_PROFILE);
  } else {
    localStorage.removeItem(DEV_SESSION_KEY);
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // If dev preview user
  if (userId === DEV_MOCK_PROFILE.id || isDevPreviewActive()) {
    const localDev = getLocalProfile(DEV_MOCK_PROFILE.id);
    return localDev || DEV_MOCK_PROFILE;
  }

  // First check if Supabase has it stored in remote profiles table
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data && data.full_name) {
      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        department: data.department,
        batch: data.batch,
        avatar: data.avatar,
        status: data.status || "Ready to chat 💬",
        bio: data.bio || "Campus Hub student",
        is_online: true,
        last_seen: data.last_seen,
      };
      saveLocalProfile(profile);
      return profile;
    }
  } catch (err) {
    console.warn("fetchUserProfile error (checking fallback local):", err);
  }

  // Fallback to local storage for this specific authenticated user
  const local = getLocalProfile(userId);
  if (local && local.full_name) {
    return local;
  }

  return null;
}

export async function syncProfileWithSupabase(profile: UserProfile): Promise<void> {
  saveLocalProfile(profile);
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        department: profile.department,
        batch: profile.batch,
        avatar: profile.avatar,
        status: profile.status,
        bio: profile.bio || "Campus Hub Student",
        is_online: true,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("Supabase profiles table sync note:", error.message);
    }
  } catch (err) {
    console.warn("Supabase profiles sync error (fallback active):", err);
  }
}

export async function signOutCampusUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Sign out error:", err);
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export async function fetchRemoteProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("last_seen", { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      return MOCK_STUDENTS;
    }

    return data.map((d) => ({
      id: d.id,
      email: d.email,
      full_name: d.full_name,
      department: d.department,
      batch: d.batch,
      avatar: d.avatar,
      status: d.status,
      bio: d.bio,
      is_online: d.is_online ?? true,
      last_seen: d.last_seen,
    }));
  } catch (err) {
    console.warn("Error fetching remote profiles, using campus pool:", err);
    return MOCK_STUDENTS;
  }
}
