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
  student_id?: string;
  full_name: string;
  department: string;
  batch: string;
  avatar: string;
  status: string;
  bio?: string;
  is_online?: boolean;
  last_seen?: string;
  call_restricted?: boolean;
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

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  timeAgo?: string;
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
  isRestricted?: boolean;
  comments?: PostComment[];
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

export const INITIAL_SHOUTOUTS: ShoutoutPost[] = [];

export const MOCK_STUDENTS: UserProfile[] = [];

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
  student_id: "011211024",
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
  return false;
}

export function setDevPreview(_active: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEV_SESSION_KEY);
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // Single Source of Truth: Always query public.profiles directly from Supabase
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data && data.full_name) {
      const local = getLocalProfile(userId);
      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        student_id: data.student_id || local?.student_id || (data.email ? data.email.split("@")[0] : undefined),
        full_name: data.full_name,
        department: data.department || "Computer Science & Engineering (CSE)",
        batch: data.batch || "Batch '24 (Junior)",
        avatar: data.avatar || "/images/avatar-male.png",
        status: data.status || "Ready to chat 💬",
        bio: data.bio ?? "",
        is_online: true,
        last_seen: data.last_seen || new Date().toISOString(),
        call_restricted: Boolean(data.call_restricted ?? local?.call_restricted),
      };
      saveLocalProfile(profile);
      return profile;
    }
  } catch (err) {
    console.warn("fetchUserProfile error (checking fallback local):", err);
  }

  // Fallback to local storage only if offline / network error
  const local = getLocalProfile(userId);
  if (local && local.full_name) {
    return local;
  }

  return null;
}

/**
 * Ensures user profile exists in public.profiles.
 * NEVER overwrites an existing row in public.profiles with user_metadata or email!
 * Only inserts default metadata if the user row does NOT exist at all in public.profiles.
 */
export async function ensureUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<UserProfile | null> {
  if (!user || !user.id) return null;

  try {
    // 1. Single Source of Truth: Always fetch from public.profiles first
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data && data.full_name) {
      // Existing row found: use it directly. NEVER overwrite with stale user_metadata or email!
      const profile: UserProfile = {
        id: data.id,
        email: data.email || user.email,
        student_id: data.student_id || (data.email ? data.email.split("@")[0] : undefined),
        full_name: data.full_name,
        department: data.department || "Computer Science & Engineering (CSE)",
        batch: data.batch || "Batch '24 (Junior)",
        avatar: data.avatar || "/images/avatar-male.png",
        status: data.status || "Ready to chat 💬",
        bio: data.bio ?? "",
        is_online: true,
        last_seen: new Date().toISOString(),
        call_restricted: Boolean(data.call_restricted),
      };

      saveLocalProfile(profile);

      // Keep auth metadata in sync with profiles table if it drifted
      const metaFullName = (user.user_metadata?.full_name as string) || "";
      if (metaFullName !== data.full_name) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: data.full_name,
              department: data.department,
              batch: data.batch,
              avatar: data.avatar,
              student_id: data.student_id,
            },
          });
        } catch {}
      }

      return profile;
    }

    // 2. ONLY if row does not exist at all in public.profiles:
    if (!data) {
      const meta = user.user_metadata || {};
      const emailPrefix = user.email ? user.email.split("@")[0] : "";
      const initialName = (meta.full_name as string) || emailPrefix || "UIU Student";
      const initialDept = (meta.department as string) || "Computer Science & Engineering (CSE)";
      const initialBatch = (meta.batch as string) || "Batch '24 (Junior)";
      const initialAvatar =
        (meta.avatar as string) ||
        (meta.gender === "female" ? "/images/avatar-female.png" : "/images/avatar-male.png");

      const defaultProfile: UserProfile = {
        id: user.id,
        email: user.email,
        student_id: (meta.student_id as string) || emailPrefix,
        full_name: initialName,
        department: initialDept,
        batch: initialBatch,
        avatar: initialAvatar,
        status: "Ready to chat 💬",
        bio: (meta.bio as string) || "",
        is_online: true,
        last_seen: new Date().toISOString(),
        call_restricted: false,
      };

      const insertPayload: Record<string, unknown> = {
        id: defaultProfile.id,
        email: defaultProfile.email,
        full_name: defaultProfile.full_name,
        department: defaultProfile.department,
        batch: defaultProfile.batch,
        avatar: defaultProfile.avatar,
        status: defaultProfile.status,
        bio: defaultProfile.bio,
        is_online: true,
        last_seen: defaultProfile.last_seen,
        call_restricted: false,
      };
      if (defaultProfile.student_id) {
        insertPayload.student_id = defaultProfile.student_id;
      }

      const { error: insertErr } = await supabase.from("profiles").insert(insertPayload);
      if (insertErr) {
        if (insertErr.message?.includes("student_id") || insertErr.message?.includes("call_restricted")) {
          delete insertPayload.student_id;
          delete insertPayload.call_restricted;
          await supabase.from("profiles").insert(insertPayload);
        } else {
          console.warn("[Campus Hub] Insert default profile note:", insertErr.message);
        }
      }

      saveLocalProfile(defaultProfile);
      return defaultProfile;
    }
  } catch (err) {
    console.error("[Campus Hub] ensureUserProfile error:", err);
  }

  // Fallback to local storage
  const local = getLocalProfile(user.id);
  if (local && local.full_name) {
    return local;
  }

  return null;
}

/**
 * Updates profile immediately in public.profiles table AND syncs auth metadata.
 * Also immediately updates localStorage cache so both PC and mobile stay permanently in sync.
 */
export async function updateUserProfile(profile: UserProfile): Promise<{ error: unknown }> {
  // 1. Immediately update localStorage cache
  saveLocalProfile(profile);

  // 2. Immediate direct Supabase update on public.profiles table
  const updatePayload: Record<string, unknown> = {
    full_name: profile.full_name.trim(),
    department: profile.department,
    batch: profile.batch,
    avatar: profile.avatar,
    status: profile.status,
    bio: profile.bio ?? "",
    call_restricted: Boolean(profile.call_restricted),
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (profile.student_id) {
    updatePayload.student_id = profile.student_id.trim();
  }
  if (profile.email) {
    updatePayload.email = profile.email;
  }

  let { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", profile.id);

  // Gracefully handle column mismatch if student_id or call_restricted not yet added
  if (error && (error.message?.includes("student_id") || error.code === "PGRST204")) {
    delete updatePayload.student_id;
    const retryRes = await supabase.from("profiles").update(updatePayload).eq("id", profile.id);
    error = retryRes.error;
  }
  if (error && (error.message?.includes("call_restricted") || error.code === "PGRST204")) {
    delete updatePayload.call_restricted;
    const retryRes = await supabase.from("profiles").update(updatePayload).eq("id", profile.id);
    error = retryRes.error;
  }

  // If the profile row did not exist, insert it now
  if (!error) {
    const { data: existingRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profile.id)
      .maybeSingle();

    if (!existingRow) {
      const insertPayload = { id: profile.id, ...updatePayload };
      await supabase.from("profiles").insert(insertPayload);
    }
  }

  // 3. Keep Supabase Auth metadata permanently in sync
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: profile.full_name.trim(),
        department: profile.department,
        batch: profile.batch,
        avatar: profile.avatar,
        student_id: profile.student_id,
        bio: profile.bio,
      },
    });
  } catch (authErr) {
    console.warn("[Campus Hub] auth.updateUser sync note:", authErr);
  }

  return { error };
}

export async function syncProfileWithSupabase(profile: UserProfile): Promise<void> {
  await updateUserProfile(profile);
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
      return [];
    }

    return data.map((d) => ({
      id: d.id,
      email: d.email,
      student_id: d.student_id,
      full_name: d.full_name,
      department: d.department,
      batch: d.batch,
      avatar: d.avatar,
      status: d.status,
      bio: d.bio,
      is_online: d.is_online ?? true,
      last_seen: d.last_seen,
      call_restricted: Boolean(d.call_restricted),
    }));
  } catch (err) {
    console.warn("Error fetching remote profiles:", err);
    return [];
  }
}
