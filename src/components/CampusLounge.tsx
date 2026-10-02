"use client";

import React, { useState, useEffect } from "react";
import {
  UserProfile,
  DirectCallInvite,
  ShoutoutPost,
  INITIAL_SHOUTOUTS,
  CAMPUS_STATUS_OPTIONS,
  supabase,
} from "@/lib/supabase";
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
  Flame,
  Coffee,
  BookOpen,
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
    // Fire festive micro-confetti
    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ["#6366f1", "#06b6d4", "#10b981", "#f59e0b"],
      });
    } catch {}

    setSayHiToast({
      toName: targetStudent.full_name,
      avatar: targetStudent.avatar,
    });

    // Broadcast across Supabase Realtime channel
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
    }, 3500);
  };

  const handlePostShoutout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost: ShoutoutPost = {
      id: `post-${Date.now()}`,
      userId: currentProfile?.id || "anon",
      userName: currentProfile?.full_name || "Campus Student",
      userDepartment: currentProfile?.department || "General",
      userAvatar: currentProfile?.avatar || "⚡",
      content: newPostContent.trim(),
      tag: newPostTag,
      likes: 1,
      timeAgo: "Just now",
    };

    setShoutouts([newPost, ...shoutouts]);
    setNewPostContent("");

    // Broadcast on Supabase channel
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 pb-28 md:pb-12 space-y-6">
      {/* Toast notification for 'Say Hi' */}
      {sayHiToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-dock border border-cyan-400/40 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-base">{sayHiToast.avatar}</span>
          <span>
            You waved & said Hi to <span className="text-cyan-400">{sayHiToast.toName}</span>! 👋
          </span>
        </div>
      )}

      {/* Hero Banner with Instant Match CTA */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/80 border border-indigo-500/20 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-12 w-40 h-40 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Campus Social Frequency
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Connect With Fellow Students in Real-Time
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Jump into an anonymous 1-on-1 video match or meet peers at the library, canteen, and project rooms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onOpen1on1Match}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-600/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
              1-on-1 Random Match
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Online Students vs Campus Bulletin */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "students"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            Online Students
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/30">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === "feed"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Campus Bulletin
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/30">
              {shoutouts.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "students" ? (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name, department, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["All", "Ready to chat", "Free for coffee", "Studying", "Exam prep"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === filter
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
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
                className="group relative rounded-2xl glass-panel p-4 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Avatar & Online Dot */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-md">
                        {student.avatar}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    </div>

                    {/* Status Badge */}
                    <div className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-indigo-950/70 border border-indigo-500/30 text-indigo-200 truncate max-w-[170px]">
                      {student.status}
                    </div>
                  </div>

                  {/* Student Details */}
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {student.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {student.department}
                  </p>
                  <p className="text-[10px] text-indigo-400/80 font-medium">
                    {student.batch}
                  </p>

                  {student.bio && (
                    <p className="text-[11px] text-slate-300 mt-2 line-clamp-2 italic bg-slate-900/40 p-2 rounded-xl border border-slate-800/40">
                      &quot;{student.bio}&quot;
                    </p>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleSayHi(student)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-slate-700/50"
                  >
                    <Hand className="w-3.5 h-3.5 text-amber-400" />
                    Say Hi
                  </button>

                  <button
                    onClick={() => onInviteToCall(student)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-90 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-indigo-600/25"
                  >
                    <Video className="w-3.5 h-3.5 text-cyan-200" />
                    Invite Call
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 rounded-3xl glass-panel border border-slate-800 p-8">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-semibold">
                No campus students found matching &quot;{searchQuery}&quot;
              </p>
              <p className="text-xs text-slate-500 mt-1">
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
            className="rounded-2xl glass-panel p-4 border border-indigo-500/20 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-lg shrink-0">
                {currentProfile?.avatar || "⚡"}
              </div>
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Drop a quick campus shoutout, study group request, or canteen meet invite..."
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Tag:</span>
                {["Study Jam", "Chit Chat", "Hackathon", "Canteen"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewPostTag(tag)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                      newPostTag === tag
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newPostContent.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
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
                className="rounded-2xl glass-panel p-4 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-base">
                      {post.userAvatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{post.userName}</span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {post.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{post.userDepartment}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{post.timeAgo}</span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed pl-10">
                  {post.content}
                </p>

                <div className="flex items-center justify-between pl-10 pt-1">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 hover:fill-rose-500" />
                    <span className="text-[11px] font-medium">{post.likes}</span>
                  </button>

                  <button
                    onClick={onOpen1on1Match}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
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
