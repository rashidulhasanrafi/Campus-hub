import { supabase, UserProfile } from "./supabase";

export interface Friend {
  id: string; // student user id
  email?: string;
  full_name: string;
  department: string;
  batch: string;
  avatar: string;
  status?: string;
  bio?: string;
  call_restricted?: boolean;
  added_at: number;
}

export interface FriendRequest {
  id: string; // unique request identifier `${senderId}_${receiverId}`
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderDepartment: string;
  senderBatch: string;
  senderBio?: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatar?: string;
  receiverDepartment?: string;
  receiverBatch?: string;
  createdAt: number;
  status: "pending" | "accepted" | "declined";
}

const LOCAL_FRIENDS_PREFIX = "campus_hub_friends_";
const LOCAL_REQUESTS_PREFIX = "campus_hub_friend_requests_";

export function getLocalFriends(userId: string): Friend[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_FRIENDS_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as Friend[];
  } catch (err) {
    console.warn("Failed to get local friends:", err);
    return [];
  }
}

export function saveLocalFriends(userId: string, friends: Friend[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${LOCAL_FRIENDS_PREFIX}${userId}`, JSON.stringify(friends));
  } catch (err) {
    console.warn("Failed to save local friends:", err);
  }
}

export function getLocalFriendRequests(userId: string): FriendRequest[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_REQUESTS_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw) as FriendRequest[];
  } catch (err) {
    console.warn("Failed to get local friend requests:", err);
    return [];
  }
}

export function saveLocalFriendRequests(userId: string, requests: FriendRequest[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${LOCAL_REQUESTS_PREFIX}${userId}`, JSON.stringify(requests));
  } catch (err) {
    console.warn("Failed to save local friend requests:", err);
  }
}

/**
 * Fetch remote friendships from Supabase table if it exists.
 * Gracefully falls back to local storage if table doesn't exist or errors.
 */
export async function fetchRemoteFriendships(
  userId: string
): Promise<{ friends: Friend[]; requests: FriendRequest[] } | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error || !data) {
      return null;
    }

    const friends: Friend[] = [];
    const requests: FriendRequest[] = [];

    data.forEach((row: any) => {
      const isSender = row.sender_id === userId;
      if (row.status === "accepted") {
        if (isSender) {
          friends.push({
            id: row.receiver_id,
            full_name: row.receiver_name || "UIU Student",
            department: row.receiver_dept || "CSE",
            batch: row.receiver_batch || "2024",
            avatar: row.receiver_avatar || "/images/avatar-male.png",
            added_at: new Date(row.updated_at || row.created_at).getTime(),
          });
        } else {
          friends.push({
            id: row.sender_id,
            full_name: row.sender_name || "UIU Student",
            department: row.sender_dept || "CSE",
            batch: row.sender_batch || "2024",
            avatar: row.sender_avatar || "/images/avatar-male.png",
            added_at: new Date(row.updated_at || row.created_at).getTime(),
          });
        }
      } else if (row.status === "pending") {
        requests.push({
          id: row.id,
          senderId: row.sender_id,
          senderName: row.sender_name || "UIU Student",
          senderAvatar: row.sender_avatar || "/images/avatar-male.png",
          senderDepartment: row.sender_dept || "CSE",
          senderBatch: row.sender_batch || "2024",
          receiverId: row.receiver_id,
          receiverName: row.receiver_name || "UIU Student",
          receiverAvatar: row.receiver_avatar || "/images/avatar-male.png",
          receiverDepartment: row.receiver_dept || "CSE",
          receiverBatch: row.receiver_batch || "2024",
          createdAt: new Date(row.created_at).getTime(),
          status: "pending",
        });
      }
    });

    return { friends, requests };
  } catch (err) {
    console.warn("fetchRemoteFriendships error:", err);
    return null;
  }
}

/**
 * Persist or update friendship status in Supabase table (safe fallback)
 */
export async function syncFriendshipToSupabase(
  request: FriendRequest
): Promise<void> {
  try {
    await supabase.from("friendships").upsert(
      {
        id: request.id,
        sender_id: request.senderId,
        receiver_id: request.receiverId,
        sender_name: request.senderName,
        sender_avatar: request.senderAvatar,
        sender_dept: request.senderDepartment,
        sender_batch: request.senderBatch,
        receiver_name: request.receiverName || "",
        receiver_avatar: request.receiverAvatar || "",
        receiver_dept: request.receiverDepartment || "",
        receiver_batch: request.receiverBatch || "",
        status: request.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("syncFriendshipToSupabase note:", err);
  }
}

/**
 * Delete or reject friendship in Supabase table
 */
export async function deleteFriendshipFromSupabase(
  requestId: string
): Promise<void> {
  try {
    await supabase.from("friendships").delete().eq("id", requestId);
  } catch (err) {
    console.warn("deleteFriendshipFromSupabase note:", err);
  }
}
