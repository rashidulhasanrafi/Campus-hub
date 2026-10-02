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
    id: "avatar-1",
    emoji: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    label: "Alex • CSE",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-2",
    emoji: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    label: "Maya • AI",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-3",
    emoji: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    label: "Liam • Eng",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-4",
    emoji: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    label: "Elena • Arch",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-5",
    emoji: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    label: "David • EEE",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-6",
    emoji: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    label: "Sara • Data",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-7",
    emoji: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    label: "Marcus • SWE",
    bg: "bg-zinc-800",
  },
  {
    id: "avatar-8",
    emoji: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    label: "Chloe • Bio",
    bg: "bg-zinc-800",
  },
];

export const INITIAL_SHOUTOUTS: ShoutoutPost[] = [
  {
    id: "post-1",
    userId: "campus-bot",
    userName: "Ayesha Noor",
    userDepartment: "Computer Science & Eng (CSE)",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
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
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
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
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
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
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    status: "Ready to chat 💬",
    bio: "Building mobile apps & playing chess between classes.",
    is_online: true,
  },
  {
    id: "student-priya",
    full_name: "Priya Sharma",
    department: "Data Science & AI (DSAI)",
    batch: "Batch '25 (Sophomore)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "Free for coffee ☕",
    bio: "Machine learning enthusiast & cafeteria regular.",
    is_online: true,
  },
  {
    id: "student-adnan",
    full_name: "Adnan Chowdhury",
    department: "Electrical & Electronics (EEE)",
    batch: "Batch '23 (Senior)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "Studying at Library 📚",
    bio: "Final year thesis grind. Ask me about microcontrollers.",
    is_online: true,
  },
  {
    id: "student-anika",
    full_name: "Anika Tabassum",
    department: "Architecture & Design (ARCH)",
    batch: "Batch '24 (Junior)",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "Exam prep grind 🔥",
    bio: "Studio all night, coffee all day ☕",
    is_online: true,
  },
  {
    id: "student-zayan",
    full_name: "Zayan Kabir",
    department: "Software Engineering (SWE)",
    batch: "Batch '26 (Freshman)",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
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
  email: "dev.preview@university.edu",
  full_name: "Test Student (Dev)",
  department: "Computer Science & Eng (CSE)",
  batch: "Batch '24 (Junior)",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  status: "Ready to chat 💬",
  bio: "Campus Hub Dev Preview • Testing real-time video, 1-on-1 match & hangout rooms.",
  is_online: true,
  last_seen: new Date().toISOString(),
};

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
