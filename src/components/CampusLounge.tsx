"use client";

import React, { useState, useEffect } from "react";
import {
  UserProfile,
  ShoutoutPost,
  PostComment,
  INITIAL_SHOUTOUTS,
  supabase,
} from "@/lib/supabase";
import { Friend } from "@/lib/friends";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Search,
  MessageCircle,
  MessageSquare,
  Video,
  Hand,
  Sparkles,
  Heart,
  Send,
  Users,
  Bell,
  BellOff,
  UserCheck,
  UserPlus,
  Clock,
  Check,
  Edit3,
  Trash2,
  X,
  Gamepad2,
} from "lucide-react";
import confetti from "canvas-confetti";

const FEED_STORAGE_KEY = "campus_hub_feed_posts_cache";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatPostTimeAgo(createdAt?: string): string {
  if (!createdAt) return "Recently";
  const diff = Date.now() - new Date(createdAt).getTime();
  if (isNaN(diff) || diff < 0) return "Just now";
  if (diff < 60000) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getCachedShoutouts(): ShoutoutPost[] {
  if (typeof window === "undefined") return INITIAL_SHOUTOUTS;
  try {
    const raw = localStorage.getItem(FEED_STORAGE_KEY);
    if (raw) {
      const parsed: ShoutoutPost[] = JSON.parse(raw);
      const oneWeekAgo = Date.now() - ONE_WEEK_MS;
      return parsed.filter((p) => {
        if (!p.created_at) return true;
        return new Date(p.created_at).getTime() >= oneWeekAgo;
      });
    }
  } catch {}
  return INITIAL_SHOUTOUTS;
}

function saveCachedShoutouts(posts: ShoutoutPost[]) {
  if (typeof window === "undefined") return;
  try {
    const oneWeekAgo = Date.now() - ONE_WEEK_MS;
    const valid = posts.filter((p) => {
      if (!p.created_at) return true;
      return new Date(p.created_at).getTime() >= oneWeekAgo;
    });
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(valid));
  } catch {}
}

interface CampusLoungeProps {
  currentProfile: UserProfile | null;
  students: UserProfile[];
  onInviteToCall: (targetStudent: UserProfile) => void;
  onOpen1on1Match: () => void;
  onJoinHangout: (roomId: string) => void;
  onToggleCallRestriction?: () => void;
  friends?: Friend[];
  sentRequestIds?: string[];
  receivedRequestIds?: string[];
  onSendFriendRequest?: (targetStudent: UserProfile) => void;
  onAcceptFriendRequest?: (studentId: string) => void;
}

export default function CampusLounge({
  currentProfile,
  students,
  onInviteToCall,
  onOpen1on1Match,
  onJoinHangout,
  onToggleCallRestriction,
  friends = [],
  sentRequestIds = [],
  receivedRequestIds = [],
  onSendFriendRequest,
  onAcceptFriendRequest,
}: CampusLoungeProps) {
  const [activeTab, setActiveTab] = useState<"students" | "feed">("students");
  const [feedFilter, setFeedFilter] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Shoutouts / Feed state
  const [shoutouts, setShoutouts] = useState<ShoutoutPost[]>(getCachedShoutouts);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTag, setNewPostTag] = useState("Study Jam");
  const [sayHiToast, setSayHiToast] = useState<{
    toName: string;
    avatar: string;
  } | null>(null);

  // Comments and Editing state
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTag, setEditTag] = useState("Study Jam");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load real shoutouts from Supabase on mount (Max 1 week old, authoritative sync)
  useEffect(() => {
    let isMounted = true;

    const loadShoutouts = async () => {
      try {
        const oneWeekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();
        const { data, error } = await supabase
          .from("shoutouts")
          .select("*")
          .gte("created_at", oneWeekAgo)
          .order("created_at", { ascending: false })
          .limit(60);

        if (!error && data && isMounted) {
          // Authoritative list from database filtered to max 1 week old
          const remotePosts: ShoutoutPost[] = data
            .filter((d: any) => {
              if (!d.created_at) return true;
              return new Date(d.created_at).getTime() >= Date.now() - ONE_WEEK_MS;
            })
            .map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              userName: d.user_name,
              userDepartment: d.user_department || "UIU",
              userAvatar: d.user_avatar || "/images/avatar-male.png",
              content: d.content,
              tag: d.category || "Study Jam",
              likes: d.likes_count || 0,
              created_at: d.created_at,
              timeAgo: formatPostTimeAgo(d.created_at),
              comments: [],
            }));

          setShoutouts(remotePosts);
          saveCachedShoutouts(remotePosts);
        }
      } catch (err) {
        console.warn("Failed to load shoutouts:", err);
      }
    };

    loadShoutouts();

    // Auto-refresh when tab gains focus or window is visible again to ensure deleted posts disappear immediately
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadShoutouts();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", loadShoutouts);

    const channel = supabase.channel("campus-lounge-bulletin");

    // Broadcast listeners (instant multi-client push)
    channel.on("broadcast", { event: "campus-shoutout" }, (payload) => {
      const data = payload?.payload || payload;
      const incoming = data as ShoutoutPost;
      if (!incoming || !incoming.id) return;
      setShoutouts((prev) => {
        if (prev.some((p) => p.id === incoming.id)) return prev;
        const next = [incoming, ...prev];
        saveCachedShoutouts(next);
        return next;
      });
    });

    channel.on("broadcast", { event: "campus-shoutout-delete" }, (payload) => {
      const data = payload?.payload || payload;
      const postId = data?.postId;
      if (postId) {
        setShoutouts((prev) => {
          const next = prev.filter((p) => p.id !== postId);
          saveCachedShoutouts(next);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "campus-shoutout-edit" }, (payload) => {
      const data = payload?.payload || payload;
      if (data?.postId) {
        setShoutouts((prev) => {
          const next = prev.map((p) =>
            p.id === data.postId
              ? { ...p, content: data.content, tag: data.tag || p.tag }
              : p
          );
          saveCachedShoutouts(next);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "campus-shoutout-comment" }, (payload) => {
      const data = payload?.payload || payload;
      if (data?.postId && data?.comment) {
        setShoutouts((prev) => {
          const next = prev.map((p) => {
            if (p.id !== data.postId) return p;
            const comments = p.comments || [];
            if (comments.some((c) => c.id === data.comment.id)) return p;
            return { ...p, comments: [...comments, data.comment] };
          });
          saveCachedShoutouts(next);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "campus-shoutout-delete-comment" }, (payload) => {
      const data = payload?.payload || payload;
      if (data?.postId && data?.commentId) {
        setShoutouts((prev) => {
          const next = prev.map((p) => {
            if (p.id !== data.postId) return p;
            return {
              ...p,
              comments: (p.comments || []).filter((c) => c.id !== data.commentId),
            };
          });
          saveCachedShoutouts(next);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "campus-shoutout-like" }, (payload) => {
      const data = payload?.payload || payload;
      if (data?.postId) {
        setShoutouts((prev) => {
          const next = prev.map((p) =>
            p.id === data.postId ? { ...p, likes: p.likes + 1 } : p
          );
          saveCachedShoutouts(next);
          return next;
        });
      }
    });

    // Supabase Postgres DB Changes: guarantees deleted posts and new posts sync even if broadcast was missed
    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "shoutouts" },
      (payload) => {
        const deletedId = (payload.old as any)?.id;
        if (deletedId) {
          setShoutouts((prev) => {
            const next = prev.filter((p) => p.id !== deletedId);
            saveCachedShoutouts(next);
            return next;
          });
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "shoutouts" },
      (payload) => {
        const d = payload.new as any;
        if (d && d.id) {
          setShoutouts((prev) => {
            if (prev.some((p) => p.id === d.id)) return prev;
            const newPost: ShoutoutPost = {
              id: d.id,
              userId: d.user_id,
              userName: d.user_name,
              userDepartment: d.user_department || "UIU",
              userAvatar: d.user_avatar || "/images/avatar-male.png",
              content: d.content,
              tag: d.category || "Study Jam",
              likes: d.likes_count || 0,
              created_at: d.created_at,
              timeAgo: formatPostTimeAgo(d.created_at),
              comments: [],
            };
            const next = [newPost, ...prev];
            saveCachedShoutouts(next);
            return next;
          });
        }
      }
    );

    channel.subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadShoutouts);
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) => {
    // don't show self if present
    if (currentProfile && s.id === currentProfile.id) return false;

    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === "All") return true;
    return s.status.toLowerCase().includes(selectedFilter.toLowerCase());
  });

  const handleSayHi = (targetStudent: UserProfile) => {
    try {
      confetti({
        particleCount: 24,
        spread: 45,
        origin: { y: 0.7 },
        colors: ["#f97316", "#ea580c", "#fbbf24"],
      });
    } catch {}

    setSayHiToast({
      toName: targetStudent.full_name,
      avatar: targetStudent.avatar,
    });

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "say-hi",
        payload: {
          fromName: currentProfile?.full_name || "A UIU Student",
          toName: targetStudent.full_name,
        },
      });
    } catch {}

    setTimeout(() => {
      setSayHiToast(null);
    }, 3200);
  };

  const handlePostShoutout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const nowIso = new Date().toISOString();
    const newPost: ShoutoutPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentProfile?.id || "anon",
      userName: currentProfile?.full_name || "UIU Student",
      userDepartment: currentProfile?.department || "CSE",
      userAvatar:
        currentProfile?.avatar || "/images/avatar-male.png",
      content: newPostContent.trim(),
      tag: newPostTag,
      likes: 0,
      created_at: nowIso,
      timeAgo: "Just now",
      isRestricted: currentProfile?.call_restricted,
      comments: [],
    };

    const updated = [newPost, ...shoutouts];
    setShoutouts(updated);
    saveCachedShoutouts(updated);
    setNewPostContent("");

    try {
      supabase
        .from("shoutouts")
        .insert({
          id: newPost.id,
          user_id: newPost.userId,
          user_name: newPost.userName,
          user_department: newPost.userDepartment,
          user_avatar: newPost.userAvatar,
          content: newPost.content,
          category: newPost.tag,
          likes_count: 0,
          created_at: nowIso,
        })
        .then(() => {});

      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout",
        payload: newPost,
      });
    } catch {}
  };

  const handleLikePost = (postId: string) => {
    const updated = shoutouts.map((p) =>
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    );
    setShoutouts(updated);
    saveCachedShoutouts(updated);

    try {
      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout-like",
        payload: { postId },
      });
    } catch {}
  };

  // Comments handlers
  const handleToggleComments = (postId: string) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleAddComment = (postId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const commentText = (commentInputs[postId] || "").trim();
    if (!commentText) return;

    const newComment: PostComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      postId,
      userId: currentProfile?.id || "anon",
      userName: currentProfile?.full_name || "UIU Student",
      userAvatar: currentProfile?.avatar || "/images/avatar-male.png",
      content: commentText,
      createdAt: new Date().toISOString(),
      timeAgo: "Just now",
    };

    const updated = shoutouts.map((p) =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), newComment] }
        : p
    );

    setShoutouts(updated);
    saveCachedShoutouts(updated);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setOpenComments((prev) => ({ ...prev, [postId]: true }));

    try {
      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout-comment",
        payload: { postId, comment: newComment },
      });
    } catch {}
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    const updated = shoutouts.map((p) =>
      p.id === postId
        ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) }
        : p
    );
    setShoutouts(updated);
    saveCachedShoutouts(updated);

    try {
      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout-delete-comment",
        payload: { postId, commentId },
      });
    } catch {}
  };

  // Edit post handlers
  const handleStartEdit = (post: ShoutoutPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditTag(post.tag || "Study Jam");
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  const handleSaveEdit = (postId: string) => {
    if (!editContent.trim()) return;

    const updated = shoutouts.map((p) =>
      p.id === postId
        ? { ...p, content: editContent.trim(), tag: editTag }
        : p
    );

    setShoutouts(updated);
    saveCachedShoutouts(updated);
    setEditingPostId(null);

    try {
      supabase
        .from("shoutouts")
        .update({ content: editContent.trim(), category: editTag })
        .eq("id", postId)
        .then(() => {});

      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout-edit",
        payload: { postId, content: editContent.trim(), tag: editTag },
      });
    } catch {}
  };

  // Delete post handler
  const handleDeletePost = (postId: string) => {
    const updated = shoutouts.filter((p) => p.id !== postId);
    setShoutouts(updated);
    saveCachedShoutouts(updated);
    setDeleteConfirmId(null);

    try {
      supabase
        .from("shoutouts")
        .delete()
        .eq("id", postId)
        .then(() => {});

      const channel = supabase.channel("campus-lounge-bulletin");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout-delete",
        payload: { postId },
      });
    } catch {}
  };

  // 1-Week Filtered posts for Feed (Auto-expire posts older than 7 days)
  const validShoutouts = shoutouts.filter((p) => {
    if (p.created_at) {
      const postTime = new Date(p.created_at).getTime();
      if (!isNaN(postTime) && postTime < Date.now() - ONE_WEEK_MS) return false;
    } else if (p.timestamp && Date.now() - p.timestamp > ONE_WEEK_MS) {
      return false;
    }
    return true;
  });

  const myPostsCount = validShoutouts.filter((p) => p.userId === currentProfile?.id).length;
  const displayedPosts = validShoutouts.filter((p) => {
    if (feedFilter === "mine") {
      return p.userId === currentProfile?.id;
    }
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
      {/* Toast notification for 'Say Hi' */}
      {sayHiToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-orange-500/50 text-xs font-medium text-zinc-100 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-150">
          <StudentAvatar
            avatar={sayHiToast.avatar}
            name={sayHiToast.toName}
            size="sm"
            showOnlineBadge={false}
          />
          <span>
            You waved & said Hi to <span className="text-orange-400 font-semibold">{sayHiToast.toName}</span> 👋
          </span>
        </div>
      )}

      {/* Hero Banner with Instant Match CTA - UIU Theme */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 hover:border-orange-500/30 backdrop-blur-md shadow-sm transition-colors">
        {/* Subtle orange accent glow at top corner */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              UIU Campus Social Lounge
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
              Connect With Fellow Students in Real-Time
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Jump into an anonymous 1-on-1 video match or meet peers at the library, canteen, and project rooms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            {/* Primary Orange Button: Turns dark gray on hover like official UIU portal */}
            <button
              onClick={onOpen1on1Match}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              1-on-1 Random Match
            </button>

            {/* 4-Player Ludo Cross-Platform Game Arena Link */}
            <a
              href="/games/ludo"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-orange-500/40"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-white" />
              Play Ludo Arena (4-Player)
            </a>
          </div>
        </div>
      </div>

      {/* Call Restriction & Disturbance Prevention Toggle Bar (PC & Mobile) */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border backdrop-blur-md transition-all ${
          currentProfile?.call_restricted
            ? "bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/30"
            : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              currentProfile?.call_restricted
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            {currentProfile?.call_restricted ? (
              <BellOff className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <Bell className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-zinc-100">
                Call Restriction (Do Not Disturb)
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  currentProfile?.call_restricted
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {currentProfile?.call_restricted ? "RESTRICTION ON" : "RESTRICTION OFF"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {currentProfile?.call_restricted
                ? "Nobody can disturb you with call requests. Your ID shows 'Calls Restricted' in Lounge & Feed."
                : "Turn ON to block repeated incoming call requests from disturbing you."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onToggleCallRestriction && (
            <button
              onClick={onToggleCallRestriction}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                currentProfile?.call_restricted
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
              }`}
            >
              {currentProfile?.call_restricted ? (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Disable Restriction</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Turn ON Restriction</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control Tabs (Options turn Orange on hover) */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "students"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm"
                : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Online Students</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-orange-400 border border-orange-500/30">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "feed"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm"
                : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Feed</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-orange-400 border border-orange-500/30">
              {shoutouts.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "students" ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UIU students by name, department, or keyword..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>

            {/* Quick Filter Pills (Options turn Orange on hover; Active turns gray on hover) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["All", "Ready to chat", "Free for coffee", "Studying", "Exam prep"].map(
                (filter) => {
                  const isSelected = selectedFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? "bg-orange-600 hover:bg-zinc-800 text-white border border-orange-600 shadow-sm"
                          : "bg-zinc-900/80 text-zinc-400 hover:text-orange-400 hover:border-orange-500/50 border border-zinc-800/80"
                      }`}
                    >
                      {filter}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="group rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-orange-500/40 p-4 transition-colors duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* High-Resolution Portrait Avatar with Live Status Dot */}
                    <StudentAvatar
                      avatar={student.avatar}
                      name={student.full_name}
                      size="md"
                      isOnline={student.is_online !== false}
                    />

                    {/* Status & Restriction Badges */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 group-hover:border-orange-500/30 truncate max-w-[170px]">
                        {student.status}
                      </div>
                      {student.call_restricted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <BellOff className="w-2.5 h-2.5 text-rose-400" />
                          <span>Calls Restricted</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                      {student.full_name}
                    </h3>
                    {student.call_restricted && (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/25">
                        Restricted
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {student.department}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                    {student.batch}
                  </p>

                  {student.bio && (
                    <p className="text-xs text-zinc-300 mt-2.5 line-clamp-2 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
                      &quot;{student.bio}&quot;
                    </p>
                  )}
                </div>

                {/* Friend Status / Add Friend Action */}
                {(() => {
                  const isFriend = friends.some((f) => f.id === student.id);
                  const isPendingSent = sentRequestIds.includes(student.id);
                  const isPendingReceived = receivedRequestIds.includes(student.id);

                  return (
                    <div className="mt-3">
                      {isFriend ? (
                        <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 select-none">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Friends</span>
                        </div>
                      ) : isPendingSent ? (
                        <div className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5 select-none">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Friend Request Sent</span>
                        </div>
                      ) : isPendingReceived ? (
                        <button
                          type="button"
                          onClick={() => onAcceptFriendRequest && onAcceptFriendRequest(student.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Friend Request</span>
                        </button>
                      ) : (
                        onSendFriendRequest && (
                          <button
                            type="button"
                            onClick={() => onSendFriendRequest(student)}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-orange-400 hover:border-orange-500/50 border border-zinc-750 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Friend</span>
                          </button>
                        )
                      )}
                    </div>
                  );
                })()}

                {/* Quick Action Button: 'Invite Call' or 'Restricted' */}
                <div className="mt-3 pt-3 border-t border-zinc-800/70">
                  {student.call_restricted ? (
                    <button
                      disabled
                      title={`${student.full_name} has enabled call restriction to avoid disturbance.`}
                      className="w-full py-1.5 px-3 rounded-lg bg-zinc-900/90 border border-rose-500/30 text-rose-400/80 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                    >
                      <BellOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Restricted</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onInviteToCall(student)}
                      className="w-full py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 text-white" />
                      Invite Call
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 rounded-xl bg-zinc-900/30 border border-zinc-800/80 p-8">
              <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
              <p className="text-sm text-zinc-300 font-medium">
                {searchQuery
                  ? `No UIU students found matching "${searchQuery}"`
                  : "No other UIU students online right now"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {searchQuery
                  ? "Try a different search keyword or status filter."
                  : "Active classmates will appear here when they connect to Campus Hub."}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Campus Social Feed */
        <div className="space-y-4">
          {/* 1-Week Auto Vanish Policy Notice */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-200 text-xs shadow-sm">
            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="flex-1 leading-snug">
              <span className="font-bold text-orange-300">Feed Notice: </span>
              Lounge feed-এর সকল পোস্ট ১ সপ্তাহের (৭ দিন) মধ্যে স্বয়ংক্রিয়ভাবে মুছে যাবে (All lounge posts automatically vanish after 1 week to keep feeds active & clean).
            </div>
          </div>

          {/* Create Post Box */}
          <form
            onSubmit={handlePostShoutout}
            className="rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <StudentAvatar
                avatar={currentProfile?.avatar}
                name={currentProfile?.full_name || "Me"}
                size="sm"
                showOnlineBadge={false}
              />
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Drop a quick UIU campus shoutout, study group request, or canteen meet invite..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-400 font-medium">Tag:</span>
                {["Study Jam", "Chit Chat", "Hackathon", "Canteen", "Questions"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewPostTag(tag)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                      newPostTag === tag
                        ? "bg-orange-600 hover:bg-zinc-800 text-white border border-orange-600"
                        : "bg-zinc-900 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 border border-zinc-800"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Primary Orange Post Button (turns dark gray on hover) */}
              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                Post
              </button>
            </div>
          </form>

          {/* Feed Filter: All Feed vs Your Posts */}
          <div className="flex items-center justify-between gap-3 pt-1 pb-1 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  feedFilter === "all"
                    ? "bg-orange-600 hover:bg-zinc-800 text-white shadow-sm font-semibold"
                    : "bg-zinc-900/90 text-zinc-400 hover:text-orange-400 border border-zinc-800"
                }`}
              >
                All Feed ({validShoutouts.length})
              </button>

              <button
                type="button"
                onClick={() => setFeedFilter("mine")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  feedFilter === "mine"
                    ? "bg-orange-600 hover:bg-zinc-800 text-white shadow-sm font-semibold"
                    : "bg-zinc-900/90 text-zinc-400 hover:text-orange-400 border border-zinc-800"
                }`}
              >
                <span>Your Posts</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    feedFilter === "mine"
                      ? "bg-zinc-900/80 text-orange-400 border border-orange-500/40"
                      : "bg-zinc-800 text-orange-400 border border-zinc-700"
                  }`}
                >
                  {myPostsCount}
                </span>
              </button>
            </div>

            {feedFilter === "mine" && (
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                Filtering: Only showing posts you created
              </span>
            )}
          </div>

          {/* Shoutouts Feed List */}
          <div className="space-y-3">
            {displayedPosts.map((post) => {
              const authorStudent = students.find((s) => s.id === post.userId);
              const isOwnPost = post.userId === currentProfile?.id;
              const isAuthorRestricted = Boolean(
                authorStudent?.call_restricted ??
                  (isOwnPost ? currentProfile?.call_restricted : post.isRestricted)
              );
              const postComments = post.comments || [];
              const isCommentsOpen = Boolean(openComments[post.id]);
              const isEditing = editingPostId === post.id;
              const isDeleting = deleteConfirmId === post.id;

              return (
                <div
                  key={post.id}
                  className={`rounded-xl bg-zinc-900/40 border transition-colors p-4 space-y-3 ${
                    isOwnPost
                      ? "border-orange-500/30 hover:border-orange-500/60"
                      : "border-zinc-800/80 hover:border-orange-500/40"
                  }`}
                >
                  {/* Post Author Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <StudentAvatar
                        avatar={post.userAvatar}
                        name={post.userName}
                        size="sm"
                        showOnlineBadge={false}
                      />
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2 flex-wrap">
                          <span className="hover:text-orange-400 transition-colors">
                            {post.userName}
                          </span>
                          {isOwnPost && (
                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                              Your Post
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-zinc-800 text-orange-400 border border-orange-500/30">
                            {post.tag}
                          </span>
                          {isAuthorRestricted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <BellOff className="w-2.5 h-2.5 text-rose-400" />
                              Calls Restricted
                            </span>
                          )}
                          {!isOwnPost && (
                            <>
                              {friends.some((f) => f.id === post.userId) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  Friend
                                </span>
                              ) : sentRequestIds.includes(post.userId) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-2.5 h-2.5" />
                                  Requested
                                </span>
                              ) : receivedRequestIds.includes(post.userId) ? (
                                <button
                                  type="button"
                                  onClick={() => onAcceptFriendRequest && onAcceptFriendRequest(post.userId)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  Accept Request
                                </button>
                              ) : (
                                onSendFriendRequest && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const existing = students.find((s) => s.id === post.userId);
                                      const target: UserProfile = existing || {
                                        id: post.userId,
                                        full_name: post.userName,
                                        department: post.userDepartment,
                                        avatar: post.userAvatar,
                                        batch: "UIU Student",
                                        status: "Ready to chat 💬",
                                      };
                                      onSendFriendRequest(target);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-zinc-800 hover:bg-orange-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-orange-500 transition-colors cursor-pointer"
                                  >
                                    <UserPlus className="w-2.5 h-2.5" />
                                    Add Friend
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {post.userDepartment}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{post.timeAgo}</span>

                      {/* Edit & Delete actions for user's own post */}
                      {isOwnPost && (
                        <div className="flex items-center gap-1 pl-1 border-l border-zinc-800">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(post)}
                            title="Edit this post"
                            className="p-1 rounded text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(post.id)}
                            title="Delete this post"
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Confirmation Alert Banner */}
                  {isDeleting && (
                    <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
                      <span className="text-rose-300 font-medium">
                        Delete this post? This cannot be undone.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="px-2.5 py-1 rounded-md text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer text-[11px] font-semibold"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Post Content / Inline Edit Form */}
                  {isEditing ? (
                    <div className="space-y-2.5 p-3 rounded-lg bg-zinc-950/80 border border-orange-500/40">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 resize-none"
                      />
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-zinc-400 font-medium">Tag:</span>
                          {["Study Jam", "Chit Chat", "Hackathon", "Canteen", "Questions"].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEditTag(t)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                editTag === t
                                  ? "bg-orange-600 text-white font-semibold"
                                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(post.id)}
                            className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-800 transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-300 leading-relaxed pl-1 sm:pl-10">
                      {post.content}
                    </p>
                  )}

                  {/* Post Footer Action Bar: Like & Comment (Connect Now is removed!) */}
                  <div className="flex items-center justify-between pl-1 sm:pl-10 pt-2 border-t border-zinc-800/70">
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer group"
                      >
                        <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20 group-hover:fill-orange-500 transition-all" />
                        <span className="text-[11px] font-medium">{post.likes}</span>
                      </button>

                      {/* Comment toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                          isCommentsOpen
                            ? "text-orange-400 font-semibold"
                            : "text-zinc-400 hover:text-orange-400"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px]">
                          {postComments.length > 0
                            ? `${postComments.length} Comments`
                            : "Comment"}
                        </span>
                      </button>
                    </div>

                    {isAuthorRestricted && (
                      <span className="text-[10px] font-semibold text-rose-400/90 flex items-center gap-1 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/40">
                        <BellOff className="w-2.5 h-2.5 text-rose-400" />
                        Calls Restricted (DND)
                      </span>
                    )}
                  </div>

                  {/* Comments Section */}
                  {isCommentsOpen && (
                    <div className="pl-1 sm:pl-10 pt-2.5 space-y-2.5 border-t border-zinc-800/60 mt-1">
                      {/* Comments List */}
                      {postComments.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {postComments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start justify-between gap-2.5 p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/70"
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <StudentAvatar
                                  avatar={comment.userAvatar}
                                  name={comment.userName}
                                  size="sm"
                                  showOnlineBadge={false}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-semibold text-zinc-200">
                                      {comment.userName}
                                    </span>
                                    {comment.userId === currentProfile?.id && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-orange-500/15 text-orange-400 font-semibold border border-orange-500/30">
                                        You
                                      </span>
                                    )}
                                    <span className="text-[10px] text-zinc-500">
                                      {comment.timeAgo || "Just now"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-300 mt-0.5 break-words">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>

                              {comment.userId === currentProfile?.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  title="Delete your comment"
                                  className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic py-1">
                          No comments yet. Be the first to share your thoughts!
                        </p>
                      )}

                      {/* Add Comment Input Form */}
                      <form
                        onSubmit={(e) => handleAddComment(post.id, e)}
                        className="flex items-center gap-2 pt-1"
                      >
                        <StudentAvatar
                          avatar={currentProfile?.avatar}
                          name={currentProfile?.full_name || "Me"}
                          size="sm"
                          showOnlineBadge={false}
                        />
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors pr-16"
                          />
                          <button
                            type="submit"
                            disabled={!(commentInputs[post.id] || "").trim()}
                            className="absolute right-1 top-1 bottom-1 px-2.5 rounded-md bg-orange-600 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Send</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}

            {displayedPosts.length === 0 && (
              <div className="text-center py-12 rounded-xl bg-zinc-900/30 border border-zinc-800/80 p-8">
                <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                <p className="text-sm text-zinc-300 font-medium">
                  {feedFilter === "mine"
                    ? "You haven't posted anything in the Feed yet"
                    : "No campus posts in Feed yet"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  {feedFilter === "mine"
                    ? "Post a study jam, question, or hangout invite in the form above to see your posts listed under 'Your Posts'!"
                    : "Be the first UIU student to post a study jam or chat update above!"}
                </p>
                {feedFilter === "mine" && (
                  <button
                    type="button"
                    onClick={() => setFeedFilter("all")}
                    className="mt-3.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-orange-600 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    View All Feed Posts
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
