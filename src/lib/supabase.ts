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

export function clearLocalProfile(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (userId) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    }
    // Also scan and clear any lingering campus_hub_student_profile keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY)) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error("Failed to clear local profile:", err);
  }
}

/**
 * Single Source of Truth (public.profiles):
 * Always fetch the user's profile directly from Supabase public.profiles table.
 * NEVER overwrite an existing row in public.profiles with user_metadata or email.
 * Only insert default metadata if the user row does NOT exist at all in public.profiles.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  try {
    // 1. Primary Query: Fetch remote profile directly from public.profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      // Row exists in public.profiles — this is the Single Source of Truth!
      const profile: UserProfile = {
        id: data.id,
        email: data.email,
        student_id: data.student_id || (data.email ? data.email.split("@")[0] : undefined),
        full_name: data.full_name || (data.email ? data.email.split("@")[0] : "UIU Student"),
        department: data.department || UIU_PROGRAMS[0],
        batch: data.batch || CAMPUS_BATCHES[1],
        avatar: data.avatar || AVATAR_OPTIONS[0].emoji,
        status: data.status || "Ready to chat 💬",
        bio: data.bio ?? "",
        is_online: true,
        last_seen: data.last_seen || new Date().toISOString(),
        call_restricted: Boolean(data.call_restricted),
      };

      // Refresh local cache with the verified remote profile
      saveLocalProfile(profile);
      return profile;
    }

    // 2. If row DOES NOT exist in public.profiles at all, create default row from auth metadata
    if (!error && !data) {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (authUser && authUser.id === userId) {
        const meta = authUser.user_metadata || {};
        const newProfile: UserProfile = {
          id: userId,
          email: authUser.email,
          student_id: meta.student_id || (authUser.email ? authUser.email.split("@")[0] : ""),
          full_name: meta.full_name || (authUser.email ? authUser.email.split("@")[0] : "UIU Student"),
          department: meta.department || UIU_PROGRAMS[0],
          batch: meta.batch || CAMPUS_BATCHES[1],
          avatar: meta.avatar || AVATAR_OPTIONS[0].emoji,
          status: "Ready to chat 💬",
          bio: meta.bio || "",
          is_online: true,
          last_seen: new Date().toISOString(),
          call_restricted: false,
        };

        const insertPayload: any = {
          id: newProfile.id,
          email: newProfile.email,
          student_id: newProfile.student_id,
          full_name: newProfile.full_name,
          department: newProfile.department,
          batch: newProfile.batch,
          avatar: newProfile.avatar,
          status: newProfile.status,
          bio: newProfile.bio,
          is_online: true,
          last_seen: newProfile.last_seen,
          call_restricted: false,
        };

        const { error: insertErr } = await supabase.from("profiles").insert(insertPayload);
        if (insertErr) {
          // If optional columns fail on older schemas
          const retryPayload = { ...insertPayload };
          if (insertErr.message?.includes("student_id") || insertErr.code === "PGRST204") {
            delete retryPayload.student_id;
          }
          if (insertErr.message?.includes("call_restricted") || insertErr.code === "PGRST204") {
            delete retryPayload.call_restricted;
          }
          await supabase.from("profiles").insert(retryPayload);
        }

        saveLocalProfile(newProfile);
        return newProfile;
      }
    }
  } catch (err) {
    console.warn("fetchUserProfile error (checking fallback local):", err);
  }

  // Fallback to local storage only if offline/network error (never writes back to remote)
  const local = getLocalProfile(userId);
  if (local && local.full_name) {
    return local;
  }

  return null;
}

/**
 * Profile Edit Persistence:
 * 1. Immediate update in public.profiles table (.update({...}).eq('id', user.id))
 * 2. Simultaneous supabase.auth.updateUser({ data: { full_name, ... } }) so auth metadata & DB stay permanently in sync
 * 3. Immediate localStorage update
 * 4. Realtime broadcast to peers
 */
export async function updateUserProfile(
  profile: UserProfile
): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately update localStorage cache
  saveLocalProfile(profile);

  try {
    const payload: any = {
      full_name: profile.full_name,
      department: profile.department,
      batch: profile.batch,
      avatar: profile.avatar,
      status: profile.status,
      bio: profile.bio ?? "",
      student_id: profile.student_id,
      last_seen: new Date().toISOString(),
      call_restricted: Boolean(profile.call_restricted),
    };
    if (profile.email) {
      payload.email = profile.email;
    }

    // 2. Direct update on public.profiles for this user ID
    let { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (error) {
      const retryPayload = { ...payload };
      let shouldRetry = false;
      if (error.message?.includes("student_id") || error.code === "PGRST204") {
        delete retryPayload.student_id;
        shouldRetry = true;
      }
      if (error.message?.includes("call_restricted") || error.code === "PGRST204") {
        delete retryPayload.call_restricted;
        shouldRetry = true;
      }
      if (shouldRetry) {
        const retryRes = await supabase.from("profiles").update(retryPayload).eq("id", profile.id);
        error = retryRes.error;
      }
    }

    // If update affected 0 rows (row does not exist yet), upsert fallback
    if (error) {
      console.warn("Update profiles fallback to upsert:", error.message);
      await supabase.from("profiles").upsert(
        { id: profile.id, ...payload },
        { onConflict: "id" }
      );
    }

    // 3. Keep Supabase Auth user_metadata permanently in sync
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          student_id: profile.student_id,
          department: profile.department,
          batch: profile.batch,
          avatar: profile.avatar,
          bio: profile.bio,
        },
      });
    } catch (authErr) {
      console.warn("supabase.auth.updateUser note:", authErr);
    }

    // 4. Realtime Broadcast event to all active sessions / tabs
    try {
      const loungeChannel = supabase.channel("campus-lounge");
      loungeChannel.send({
        type: "broadcast",
        event: "profile-updated",
        payload: profile,
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    return { success: false, error: err?.message || "Failed to update profile" };
  }
}

/**
 * Backward compatibility alias for syncProfileWithSupabase
 */
export async function syncProfileWithSupabase(profile: UserProfile): Promise<void> {
  await updateUserProfile(profile);
}

export async function signOutCampusUser(userId?: string): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Sign out error:", err);
  }
  clearLocalProfile(userId);
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
