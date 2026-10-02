"use client";

import React, { useState } from "react";
import {
  UserProfile,
  DirectCallInvite,
  ShoutoutPost,
  INITIAL_SHOUTOUTS,
  CAMPUS_STATUS_OPTIONS,
  supabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Search,
  MessageCircle,
  Video,
  Hand,
  Sparkles,
  Heart,
  Send,
  Users,
  Radio,
  Coffee,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";

interface CampusLoungeProps {
  currentProfile: UserProfile | null;
  students: UserProfile[];
  onInviteToCall: (targetStudent: UserProfile) => void;
  onOpen1on1Match: () => void;
  onJoinHangout: (roomId: string) => void;
}

export default function CampusLounge({
  currentProfile,
  students,
  onInviteToCall,
  onOpen1on1Match,
  onJoinHangout,
}: CampusLoungeProps) {
  const [activeTab, setActiveTab] = useState<"students" | "feed">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Shoutouts / Bulletin Feed
  const [shoutouts, setShoutouts] = useState<ShoutoutPost[]>(INITIAL_SHOUTOUTS);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTag, setNewPostTag] = useState("Study Jam");
  const [sayHiToast, setSayHiToast] = useState<{
    toName: string;
    avatar: string;
  } | null>(null);

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
        particleCount: 20,
        spread: 40,
        origin: { y: 0.7 },
        colors: ["#10b981", "#38bdf8", "#818cf8"],
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
          fromName: currentProfile?.full_name || "A Student",
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

    const newPost: ShoutoutPost = {
      id: `post-${Date.now()}`,
      userId: currentProfile?.id || "anon",
      userName: currentProfile?.full_name || "Campus Student",
      userDepartment: currentProfile?.department || "General",
      userAvatar:
        currentProfile?.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      content: newPostContent.trim(),
      tag: newPostTag,
      likes: 1,
      timeAgo: "Just now",
    };

    setShoutouts([newPost, ...shoutouts]);
    setNewPostContent("");

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "campus-shoutout",
        payload: newPost,
      });
    } catch {}
  };

  const handleLikePost = (postId: string) => {
    setShoutouts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 pb-28 md:pb-12 space-y-5">
      {/* Toast notification for 'Say Hi' */}
      {sayHiToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-medium text-zinc-100 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-150">
          <StudentAvatar
            avatar={sayHiToast.avatar}
            name={sayHiToast.toName}
            size="sm"
            showOnlineBadge={false}
          />
          <span>
            You waved & said Hi to <span className="text-zinc-100 font-semibold">{sayHiToast.toName}</span> 👋
          </span>
        </div>
      )}

      {/* Hero Banner with Instant Match CTA - Linear / Discord sleek lounge banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-xs font-medium border border-zinc-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Campus Social Frequency
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
              Connect With Fellow Students in Real-Time
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Jump into an anonymous 1-on-1 video match or meet peers at the library, canteen, and project rooms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={onOpen1on1Match}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
              1-on-1 Random Match
            </button>
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs: Online Students vs Campus Bulletin */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "students"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Online Students</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700/60">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "feed"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Campus Bulletin</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700/60">
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
                placeholder="Search students by name, department, or keyword..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["All", "Ready to chat", "Free for coffee", "Studying", "Exam prep"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedFilter === filter
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                        : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="group rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/90 p-4 transition-colors duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {/* High-Resolution Portrait Avatar with Live Green Dot */}
                    <StudentAvatar
                      avatar={student.avatar}
                      name={student.full_name}
                      size="md"
                      isOnline={student.is_online !== false}
                    />

                    {/* Status Badge */}
                    <div className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 truncate max-w-[170px]">
                      {student.status}
                    </div>
                  </div>

                  {/* Student Details */}
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
                    {student.full_name}
                  </h3>
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

                {/* Quick Action Buttons: Sleek Zinc Ghost Button for 'Say Hi', Solid Crisp Button for 'Invite Call' */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/70">
                  <button
                    onClick={() => handleSayHi(student)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-zinc-700/60 active:scale-95"
                  >
                    <Hand className="w-3.5 h-3.5 text-zinc-400" />
                    Say Hi
                  </button>

                  <button
                    onClick={() => onInviteToCall(student)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Video className="w-3.5 h-3.5 text-zinc-900" />
                    Invite Call
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 rounded-xl bg-zinc-900/30 border border-zinc-800/80 p-8">
              <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
              <p className="text-sm text-zinc-300 font-medium">
                No campus students found matching &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Try a different search keyword or status filter.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Campus Bulletin & Shoutouts Feed */
        <div className="space-y-4">
          {/* Create Shoutout Box */}
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
                  placeholder="Drop a quick campus shoutout, study group request, or canteen meet invite..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-medium">Tag:</span>
                {["Study Jam", "Chit Chat", "Hackathon", "Canteen"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewPostTag(tag)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                      newPostTag === tag
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </div>
          </form>

          {/* Shoutouts Feed List */}
          <div className="space-y-3">
            {shoutouts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StudentAvatar
                      avatar={post.userAvatar}
                      name={post.userName}
                      size="sm"
                      showOnlineBadge={false}
                    />
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                        <span>{post.userName}</span>
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {post.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">{post.userDepartment}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500">{post.timeAgo}</span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed pl-10">
                  {post.content}
                </p>

                <div className="flex items-center justify-between pl-10 pt-1">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 hover:fill-rose-500" />
                    <span className="text-[11px] font-medium">{post.likes}</span>
                  </button>

                  <button
                    onClick={onOpen1on1Match}
                    className="text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                  >
                    Connect Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
