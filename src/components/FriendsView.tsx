"use client";

import React, { useState } from "react";
import { UserProfile } from "@/lib/supabase";
import { Friend, FriendRequest } from "@/lib/friends";
import StudentAvatar from "@/components/StudentAvatar";
import {
  Users,
  UserCheck,
  UserPlus,
  Video,
  PhoneOff,
  Hand,
  Search,
  Check,
  X,
  Clock,
  Sparkles,
  BellOff,
  UserMinus,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import confetti from "canvas-confetti";

interface FriendsViewProps {
  currentProfile: UserProfile | null;
  friends: Friend[];
  friendRequests: FriendRequest[];
  onlineStudents: UserProfile[];
  onInviteToCall: (targetStudent: UserProfile) => void;
  onAcceptFriendRequest: (requestId: string) => void;
  onDeclineFriendRequest: (requestId: string) => void;
  onCancelFriendRequest: (requestId: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onNavigateToLounge?: () => void;
}

export default function FriendsView({
  currentProfile,
  friends,
  friendRequests,
  onlineStudents,
  onInviteToCall,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onCancelFriendRequest,
  onRemoveFriend,
  onNavigateToLounge,
}: FriendsViewProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);
  const [sayHiToast, setSayHiToast] = useState<{
    toName: string;
    avatar: string;
  } | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Split requests into Received (for me) and Sent (by me)
  const receivedRequests = friendRequests.filter(
    (r) => r.receiverId === currentProfile?.id && r.status === "pending"
  );
  const sentRequests = friendRequests.filter(
    (r) => r.senderId === currentProfile?.id && r.status === "pending"
  );

  // Helper to check if a student is online
  const isStudentOnline = (studentId: string): boolean => {
    return onlineStudents.some((s) => s.id === studentId);
  };

  // Get active online profile data if present
  const getOnlineProfile = (friend: Friend): UserProfile => {
    const live = onlineStudents.find((s) => s.id === friend.id);
    if (live) {
      return live;
    }
    return {
      id: friend.id,
      email: friend.email,
      full_name: friend.full_name,
      department: friend.department,
      batch: friend.batch,
      avatar: friend.avatar,
      status: friend.status || "Ready to chat 💬",
      bio: friend.bio,
      is_online: false,
      call_restricted: friend.call_restricted,
    };
  };

  // Filter friends by search and online filter
  const filteredFriends = friends.filter((f) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      f.full_name.toLowerCase().includes(query) ||
      f.department.toLowerCase().includes(query) ||
      (f.status && f.status.toLowerCase().includes(query));

    if (!matchesQuery) return false;
    if (filterOnlineOnly && !isStudentOnline(f.id)) return false;

    return true;
  });

  const onlineFriendsCount = friends.filter((f) => isStudentOnline(f.id)).length;

  const handleSayHi = (friend: Friend) => {
    try {
      confetti({
        particleCount: 26,
        spread: 45,
        origin: { y: 0.7 },
        colors: ["#f97316", "#ea580c", "#fbbf24"],
      });
    } catch {}

    setSayHiToast({
      toName: friend.full_name,
      avatar: friend.avatar,
    });

    setTimeout(() => {
      setSayHiToast(null);
    }, 3200);
  };

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
            You waved & said Hi to{" "}
            <span className="text-orange-400 font-semibold">{sayHiToast.toName}</span> 👋
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-zinc-900/60 border border-zinc-800/80 hover:border-orange-500/30 backdrop-blur-md shadow-sm transition-colors">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/25">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              UIU Verified Campus Network
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
              Campus Friends & 1-on-1 Direct Calls
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Connect with classmates, see who is online right now, and start instant 1-on-1 video calls directly with your friends.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong className="text-white font-semibold">{onlineFriendsCount}</strong> online
                now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2 Main Sub-Tabs: 1) Friends, 2) Friend Requests */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "friends"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Friends</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-orange-400 border border-orange-500/30">
              {friends.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
              activeTab === "requests"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Friend Requests</span>
            {receivedRequests.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-orange-600 text-white animate-pulse">
                {receivedRequests.length} New
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-700">
                {sentRequests.length + receivedRequests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "friends" && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setFilterOnlineOnly(!filterOnlineOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterOnlineOnly
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              Online Only ({onlineFriendsCount})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: MY FRIENDS */}
      {activeTab === "friends" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends by name or department..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>

            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={() => setFilterOnlineOnly(!filterOnlineOnly)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors border ${
                  filterOnlineOnly
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold"
                    : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                }`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                Online Only ({onlineFriendsCount})
              </button>
            </div>
          </div>

          {/* Friends Grid */}
          {filteredFriends.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFriends.map((friend) => {
                const online = isStudentOnline(friend.id);
                const onlineProfile = getOnlineProfile(friend);
                const isRestricted = Boolean(onlineProfile.call_restricted);

                return (
                  <div
                    key={friend.id}
                    className="group rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-orange-500/40 p-4 transition-colors duration-150 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <StudentAvatar
                          avatar={friend.avatar}
                          name={friend.full_name}
                          size="md"
                          isOnline={online}
                        />

                        {/* Online / Offline status badge */}
                        <div className="flex flex-col items-end gap-1">
                          {online ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              Offline
                            </span>
                          )}

                          {isRestricted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <BellOff className="w-2.5 h-2.5 text-rose-400" />
                              Calls Restricted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Student Info */}
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                        {friend.full_name}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {friend.department}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        {friend.batch}
                      </p>

                      {friend.status && (
                        <p className="text-xs text-zinc-300 mt-2 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 truncate">
                          {friend.status}
                        </p>
                      )}
                    </div>

                    {/* Quick Actions: Direct Call & Wave */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/70 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Direct Call Button: Active if online, disabled if offline or restricted */}
                        {online ? (
                          isRestricted ? (
                            <button
                              disabled
                              title="Friend has enabled Call Restriction (Do Not Disturb)."
                              className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900/90 border border-rose-500/30 text-rose-400/80 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80"
                            >
                              <BellOff className="w-3.5 h-3.5 text-rose-400" />
                              <span>Restricted</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onInviteToCall(onlineProfile)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                              title={`Direct Video Call with ${friend.full_name}`}
                            >
                              <Video className="w-3.5 h-3.5 text-white" />
                              <span>Call Friend</span>
                            </button>
                          )
                        ) : (
                          <button
                            disabled
                            title={`${friend.full_name} is currently offline. You can call when they come online.`}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
                          >
                            <PhoneOff className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Offline</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSayHi(friend)}
                          className="py-1.5 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-orange-400 hover:border-orange-500/50 text-xs font-medium transition-colors flex items-center justify-center border border-zinc-700/60 active:scale-95"
                          title={`Say Hi to ${friend.full_name}`}
                        >
                          <Hand className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove Friend Trigger */}
                        <button
                          onClick={() =>
                            setConfirmRemoveId(confirmRemoveId === friend.id ? null : friend.id)
                          }
                          className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 text-xs transition-colors"
                          title="Remove Friend"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Unfriend Confirmation */}
                      {confirmRemoveId === friend.id && (
                        <div className="p-2 rounded-lg bg-rose-950/25 border border-rose-500/30 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                          <span className="text-[11px] text-rose-300 font-medium truncate">
                            Remove from friends?
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                onRemoveFriend(friend.id);
                                setConfirmRemoveId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-14 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 shadow-sm">
                <Users className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-200">
                {searchQuery
                  ? `No friends found matching "${searchQuery}"`
                  : filterOnlineOnly
                  ? "None of your friends are online right now"
                  : "No Campus Friends Added Yet"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                {searchQuery || filterOnlineOnly
                  ? "Try adjusting your search query or reset the online filter."
                  : "Connect with classmates in the Lounge & Feed, send friend requests, and call them directly when online!"}
              </p>
              {onNavigateToLounge && (
                <button
                  onClick={onNavigateToLounge}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Discover Students in Lounge</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FRIEND REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* 1. Received Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-400" />
                  Received Friend Requests
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {receivedRequests.length}
                </span>
              </div>
            </div>

            {receivedRequests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {receivedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/40 p-4 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3 mb-2.5">
                        <StudentAvatar
                          avatar={req.senderAvatar}
                          name={req.senderName}
                          size="md"
                          isOnline={isStudentOnline(req.senderId)}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">
                            {req.senderName}
                          </h4>
                          <p className="text-xs text-zinc-400 truncate">{req.senderDepartment}</p>
                          <p className="text-[11px] text-zinc-500">{req.senderBatch}</p>
                        </div>
                      </div>

                      {req.senderBio && (
                        <p className="text-xs text-zinc-300 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60 line-clamp-2 mt-2">
                          &quot;{req.senderBio}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/70">
                      <button
                        onClick={() => onDeclineFriendRequest(req.id)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-rose-400 text-xs font-medium border border-zinc-700/60 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>

                      <button
                        onClick={() => {
                          onAcceptFriendRequest(req.id);
                          try {
                            confetti({
                              particleCount: 35,
                              spread: 50,
                              origin: { y: 0.6 },
                              colors: ["#f97316", "#10b981", "#3b82f6"],
                            });
                          } catch {}
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-900/20 border border-zinc-800/60 p-6 text-center">
                <UserCheck className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-400">
                  No incoming friend requests at the moment.
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  When classmates in Lounge or Feed send you a request, it will appear here.
                </p>
              </div>
            )}
          </div>

          {/* 2. Sent Requests (Pending Approval) */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Sent Requests (Pending Approval)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {sentRequests.length}
              </span>
            </div>

            {sentRequests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3 mb-2.5">
                      <StudentAvatar
                        avatar={req.receiverAvatar || "/images/avatar-male.png"}
                        name={req.receiverName || "Classmate"}
                        size="md"
                        isOnline={isStudentOnline(req.receiverId)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">
                            {req.receiverName || "UIU Classmate"}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            <Clock className="w-2.5 h-2.5" />
                            Pending
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {req.receiverDepartment || "UIU"}
                        </p>
                        <p className="text-[11px] text-zinc-500">{req.receiverBatch || ""}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-800/70 flex justify-end">
                      <button
                        onClick={() => onCancelFriendRequest(req.id)}
                        className="py-1 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel Request</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-900/20 border border-zinc-800/60 p-6 text-center">
                <Clock className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-400">No pending sent requests.</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Send requests to students in the Lounge or Feed to expand your campus network.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
