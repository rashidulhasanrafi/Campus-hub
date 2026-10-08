"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import {
  UserProfile,
  DirectCallInvite,
  fetchUserProfile,
  saveLocalProfile,
  fetchRemoteProfiles,
  syncProfileWithSupabase,
  signOutCampusUser,
  supabase,
  detectCampusTheme,
} from "@/lib/supabase";
import {
  Friend,
  FriendRequest,
  getLocalFriends,
  saveLocalFriends,
  getLocalFriendRequests,
  saveLocalFriendRequests,
  fetchRemoteFriendships,
  syncFriendshipToSupabase,
  deleteFriendshipFromSupabase,
} from "@/lib/friends";
import AuthScreen from "@/components/AuthScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import CampusHeader from "@/components/CampusHeader";
import BottomNavigation, { NavTab } from "@/components/BottomNavigation";
import CampusLounge from "@/components/CampusLounge";
import RandomMatch from "@/components/RandomMatch";
import GroupHangout from "@/components/GroupHangout";
import FriendsView from "@/components/FriendsView";
import ProfileView from "@/components/ProfileView";
import ProfileOnboardingModal from "@/components/ProfileOnboardingModal";
import IncomingCallModal from "@/components/IncomingCallModal";
import UiuBusTransition from "@/components/UiuBusTransition";
import { Sparkles, Radio } from "lucide-react";
import { useUiMode } from "@/context/UiModeContext";
import { CREATOR_INFO, getWhatsAppFeedbackUrl } from "@/config/creator";

export default function CampusHubHome() {
  const { isLightUi } = useUiMode();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Check if recovering an active video call after a page refresh
  const [activeCallRecovered] = useState<{
    type: "match" | "hangout";
    roomName?: string;
    roomId?: string;
    hangoutRoom?: any;
    timestamp?: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = sessionStorage.getItem("campus_active_call");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - (parsed.timestamp || 0) < 5 * 60 * 1000) {
          return parsed;
        } else {
          sessionStorage.removeItem("campus_active_call");
        }
      }
    } catch {}
    return null;
  });

  // Bus animation: Plays on every normal app launch/refresh before entering the app.
  // Skipped ONLY if user refreshed while actively in a video call (to instantly reconnect).
  const [showBusTransition, setShowBusTransition] = useState(() => {
    if (activeCallRecovered) return false;
    return true;
  });

  // App navigation & state - restore tab and room immediately on refresh
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (activeCallRecovered?.type === "match") return "match";
    if (activeCallRecovered?.type === "hangout") return "hangouts";
    return "lounge";
  });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<DirectCallInvite | null>(null);
  const [directRoomToJoin, setDirectRoomToJoin] = useState<string | null>(() => {
    if (activeCallRecovered?.type === "match") return activeCallRecovered.roomName || null;
    return null;
  });
  const [selectedHangoutRoomId, setSelectedHangoutRoomId] = useState<string | null>(() => {
    if (activeCallRecovered?.type === "hangout") return activeCallRecovered.roomId || activeCallRecovered.roomName || null;
    return null;
  });
  const [authNotice, setAuthNotice] = useState("");
  const [authPreFill, setAuthPreFill] = useState("");
  const [isInCall, setIsInCall] = useState(() => Boolean(activeCallRecovered));

  // Load local and remote friendships for active student
  useEffect(() => {
    if (!profile) {
      setFriends([]);
      setFriendRequests([]);
      return;
    }

    const localF = getLocalFriends(profile.id);
    const localR = getLocalFriendRequests(profile.id);
    setFriends(localF);
    setFriendRequests(localR);

    fetchRemoteFriendships(profile.id).then((remote) => {
      if (remote) {
        setFriends((prev) => {
          const map = new Map<string, Friend>();
          prev.forEach((f) => map.set(f.id, f));
          remote.friends.forEach((f) => map.set(f.id, f));
          const merged = Array.from(map.values());
          saveLocalFriends(profile.id, merged);
          return merged;
        });

        setFriendRequests((prev) => {
          const map = new Map<string, FriendRequest>();
          prev.forEach((r) => map.set(r.id, r));
          remote.requests.forEach((r) => map.set(r.id, r));
          const merged = Array.from(map.values());
          saveLocalFriendRequests(profile.id, merged);
          return merged;
        });
      }
    });
  }, [profile]);

  // Apply campus theme attribute on document root (defaults to UIU)
  useEffect(() => {
    const campus = detectCampusTheme(profile?.email || session?.user?.email);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-campus", campus);
      document.body.setAttribute("data-campus", campus);
    }
  }, [profile, session]);

  // Check auth session & load user profile
  const checkAuthAndProfile = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("campus_hub_dev_preview_session");
      }

      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession && currentSession.user) {
        const existingProfile = await fetchUserProfile(currentSession.user.id);
        if (existingProfile && existingProfile.full_name) {
          setProfile(existingProfile);
          setNeedsOnboarding(false);
          await syncProfileWithSupabase(existingProfile);
        } else {
          setProfile(null);
          setNeedsOnboarding(true);
        }
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }
    } catch (err) {
      console.error("Auth check error:", err);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndProfile();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession && newSession.user) {
        const userProfile = await fetchUserProfile(newSession.user.id);
        if (userProfile && userProfile.full_name) {
          setProfile(userProfile);
          setNeedsOnboarding(false);
        } else {
          setProfile(null);
          setNeedsOnboarding(true);
        }
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuthAndProfile]);

  // Once authenticated with an active profile, connect to Realtime Lounge
  useEffect(() => {
    if (!profile) return;

    fetchRemoteProfiles().then((list) => {
      if (list && list.length > 0) {
        setStudents(list);
      }
    });

    const channel = supabase.channel("campus-lounge", {
      config: {
        broadcast: { self: false },
        presence: { key: profile.id },
      },
    });

    channel.on("broadcast", { event: "call-invite" }, (payload) => {
      const invite = payload.payload as DirectCallInvite;
      if (invite.toId === profile.id) {
        if (profile.call_restricted) {
          console.log("[Campus Hub] Call invite discarded because Call Restriction is ON.");
          return;
        }
        setIncomingInvite(invite);
      }
    });

    channel.on("broadcast", { event: "friend-request" }, (payload) => {
      const req = payload.payload as FriendRequest;
      if (req && req.receiverId === profile.id) {
        setFriendRequests((prev) => {
          if (prev.some((r) => r.id === req.id)) return prev;
          const updated = [req, ...prev];
          saveLocalFriendRequests(profile.id, updated);
          return updated;
        });
      }
    });

    channel.on("broadcast", { event: "friend-accept" }, (payload) => {
      const { requestId, senderId, receiverId, receiverProfile } = payload.payload || {};
      if (senderId === profile.id) {
        const newFriend: Friend = {
          id: receiverId,
          full_name: receiverProfile?.full_name || "UIU Classmate",
          department: receiverProfile?.department || "CSE",
          batch: receiverProfile?.batch || "2024",
          avatar: receiverProfile?.avatar || "/images/avatar-male.png",
          status: receiverProfile?.status || "Ready to chat 💬",
          bio: receiverProfile?.bio,
          call_restricted: Boolean(receiverProfile?.call_restricted),
          added_at: Date.now(),
        };

        setFriends((prev) => {
          if (prev.some((f) => f.id === receiverId)) return prev;
          const updated = [newFriend, ...prev];
          saveLocalFriends(profile.id, updated);
          return updated;
        });

        setFriendRequests((prev) => {
          const updated = prev.filter(
            (r) => r.id !== requestId && r.receiverId !== receiverId
          );
          saveLocalFriendRequests(profile.id, updated);
          return updated;
        });
      }
    });

    channel.on("broadcast", { event: "friend-decline" }, (payload) => {
      const { requestId, senderId } = payload.payload || {};
      if (senderId === profile.id) {
        setFriendRequests((prev) => {
          const updated = prev.filter((r) => r.id !== requestId);
          saveLocalFriendRequests(profile.id, updated);
          return updated;
        });
      }
    });

    channel.on("broadcast", { event: "friend-remove" }, (payload) => {
      const { senderId, receiverId } = payload.payload || {};
      if (senderId === profile.id || receiverId === profile.id) {
        const targetId = senderId === profile.id ? receiverId : senderId;
        setFriends((prev) => {
          const updated = prev.filter((f) => f.id !== targetId);
          saveLocalFriends(profile.id, updated);
          return updated;
        });
      }
    });

    channel.on("broadcast", { event: "profile-updated" }, (payload) => {
      const updated = payload.payload as UserProfile;
      if (updated && updated.id) {
        setStudents((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
        );
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineUsers: UserProfile[] = [];
      Object.keys(state).forEach((k) => {
        const pres = state[k][0] as any;
        if (pres && pres.id) {
          onlineUsers.push(pres);
        }
      });
      setStudents(onlineUsers);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && profile) {
        await channel.track(profile);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Handler when first-time onboarding finishes
  const handleProfileCreated = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setNeedsOnboarding(false);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem("campus_active_call");
    } catch {}
    setAuthLoading(true);
    await signOutCampusUser();
    setSession(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setAuthLoading(false);
  };

  // Prevent accidental page refresh while in an active video call
  useEffect(() => {
    if (!isInCall) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isInCall]);

  // Toggle Call Restriction (Do Not Disturb) for current student
  const handleToggleCallRestriction = async () => {
    if (!profile) return;
    const newRestricted = !profile.call_restricted;
    const updated: UserProfile = { ...profile, call_restricted: newRestricted };
    setProfile(updated);
    saveLocalProfile(updated);

    try {
      await syncProfileWithSupabase(updated);
    } catch (e) {
      console.warn("Could not sync call_restricted to remote db:", e);
    }

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "profile-updated",
        payload: updated,
      });
      channel.track(updated);
    } catch {}
  };

  // Send Direct Video Call Invite
  const handleInviteToCall = (targetStudent: UserProfile) => {
    if (!profile) return;

    if (targetStudent.call_restricted) {
      alert(
        `${targetStudent.full_name} has turned ON Call Restriction (Do Not Disturb). Direct calls to this student are currently restricted.`
      );
      return;
    }

    const roomName = `direct_call_${[profile.id, targetStudent.id].sort().join("_")}`;
    const invite: DirectCallInvite = {
      fromId: profile.id,
      fromName: profile.full_name,
      fromAvatar: profile.avatar,
      fromDepartment: profile.department,
      fromBatch: profile.batch,
      toId: targetStudent.id,
      roomName,
      timestamp: Date.now(),
    };

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "call-invite",
        payload: invite,
      });
    } catch {}

    setDirectRoomToJoin(roomName);
    setCurrentTab("match");
  };

  // Accept Direct Video Call Invite
  const handleAcceptInvite = (invite: DirectCallInvite) => {
    setIncomingInvite(null);
    setDirectRoomToJoin(invite.roomName);
    setCurrentTab("match");
  };

  const handleDeclineInvite = () => {
    setIncomingInvite(null);
  };

  // Friend Request & Friendship Handlers
  const handleSendFriendRequest = (targetStudent: UserProfile) => {
    if (!profile) return;
    if (friends.some((f) => f.id === targetStudent.id)) return;

    const requestId = `${profile.id}_${targetStudent.id}`;
    const newReq: FriendRequest = {
      id: requestId,
      senderId: profile.id,
      senderName: profile.full_name,
      senderAvatar: profile.avatar,
      senderDepartment: profile.department,
      senderBatch: profile.batch,
      senderBio: profile.bio || profile.status,
      receiverId: targetStudent.id,
      receiverName: targetStudent.full_name,
      receiverAvatar: targetStudent.avatar,
      receiverDepartment: targetStudent.department,
      receiverBatch: targetStudent.batch,
      createdAt: Date.now(),
      status: "pending",
    };

    setFriendRequests((prev) => {
      const updated = [newReq, ...prev.filter((r) => r.id !== requestId)];
      saveLocalFriendRequests(profile.id, updated);
      return updated;
    });

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "friend-request",
        payload: newReq,
      });
    } catch {}

    syncFriendshipToSupabase(newReq);
  };

  const handleAcceptFriendRequest = (requestId: string) => {
    if (!profile) return;
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;

    const newFriend: Friend = {
      id: req.senderId,
      full_name: req.senderName,
      department: req.senderDepartment,
      batch: req.senderBatch,
      avatar: req.senderAvatar,
      bio: req.senderBio,
      status: "Ready to chat 💬",
      added_at: Date.now(),
    };

    setFriends((prev) => {
      if (prev.some((f) => f.id === req.senderId)) return prev;
      const updated = [newFriend, ...prev];
      saveLocalFriends(profile.id, updated);
      return updated;
    });

    setFriendRequests((prev) => {
      const updated = prev.filter((r) => r.id !== requestId);
      saveLocalFriendRequests(profile.id, updated);
      return updated;
    });

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "friend-accept",
        payload: {
          requestId: req.id,
          senderId: req.senderId,
          receiverId: profile.id,
          receiverProfile: profile,
        },
      });
    } catch {}

    syncFriendshipToSupabase({ ...req, status: "accepted" });
  };

  const handleDeclineFriendRequest = (requestId: string) => {
    if (!profile) return;
    const req = friendRequests.find((r) => r.id === requestId);
    setFriendRequests((prev) => {
      const updated = prev.filter((r) => r.id !== requestId);
      saveLocalFriendRequests(profile.id, updated);
      return updated;
    });

    if (req) {
      try {
        const channel = supabase.channel("campus-lounge");
        channel.send({
          type: "broadcast",
          event: "friend-decline",
          payload: {
            requestId: req.id,
            senderId: req.senderId,
            receiverId: profile.id,
          },
        });
      } catch {}
    }

    deleteFriendshipFromSupabase(requestId);
  };

  const handleCancelFriendRequest = (requestId: string) => {
    if (!profile) return;
    setFriendRequests((prev) => {
      const updated = prev.filter((r) => r.id !== requestId);
      saveLocalFriendRequests(profile.id, updated);
      return updated;
    });
    deleteFriendshipFromSupabase(requestId);
  };

  const handleRemoveFriend = (friendId: string) => {
    if (!profile) return;
    setFriends((prev) => {
      const updated = prev.filter((f) => f.id !== friendId);
      saveLocalFriends(profile.id, updated);
      return updated;
    });

    try {
      const channel = supabase.channel("campus-lounge");
      channel.send({
        type: "broadcast",
        event: "friend-remove",
        payload: {
          senderId: profile.id,
          receiverId: friendId,
        },
      });
    } catch {}

    deleteFriendshipFromSupabase(`${profile.id}_${friendId}`);
    deleteFriendshipFromSupabase(`${friendId}_${profile.id}`);
  };

  // Status Change handler
  const handleStatusChange = (newStatus: string) => {
    if (!profile) return;
    const updated = { ...profile, status: newStatus };
    setProfile(updated);
    saveLocalProfile(updated);
    syncProfileWithSupabase(updated);
  };

  // Tab change handler (always scrolls to top, critical for mobile webviews)
  const handleTabChange = (tab: NavTab) => {
    if (tab !== "match") setDirectRoomToJoin(null);
    setCurrentTab(tab);
    setIsInCall(false);
    try {
      sessionStorage.removeItem("campus_active_call");
    } catch {}
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  // 1. Initial Auth Loading Splash
  if (authLoading && !showBusTransition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090a0f] text-zinc-100">
        <div className="relative flex items-center justify-center w-14 h-14 mb-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-zinc-300 animate-pulse" />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Verifying Campus Access...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 2. Unauthenticated: Show Mobile-First Gmail OTP Auth Screen */}
      {!session || !session.user ? (
        <AuthScreen
          initialInfo={authNotice}
          initialLoginInput={authPreFill}
          onAuthSuccess={() => {
            setAuthNotice("");
            setAuthPreFill("");
            checkAuthAndProfile();
          }}
          onStartBusTransition={() => setShowBusTransition(true)}
          onCancelBusTransition={() => setShowBusTransition(false)}
          isBusTransitionActive={showBusTransition}
        />
      ) : needsOnboarding ? (
        /* 3. Authenticated but Needs Onboarding: Show Student Profile Setup */
        <OnboardingScreen
          user={session.user}
          onProfileCreated={handleProfileCreated}
        />
      ) : (
        /* 4. Authenticated & Profile Ready: Render Campus Hub Application */
        <div className="relative min-h-screen flex flex-col bg-[#090a0f] text-zinc-100 selection:bg-orange-600 selection:text-white overflow-x-hidden">
          {/* Background Subtle Watermark: Campus Hub Emblem centered with 5% opacity - Hidden in Light UI to eliminate GPU compositing overhead & overheating */}
          {!isLightUi && (
            <div
              aria-hidden="true"
              className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
            >
              <img
                src="/images/campus-hub-emblem-tight.png"
                alt=""
                className="uiu-watermark w-[720px] sm:w-[920px] md:w-[1080px] max-w-none opacity-[0.05] filter contrast-125 object-contain"
              />
            </div>
          )}

          <div className={`relative z-10 flex flex-col flex-1 ${isInCall ? "fixed inset-0 z-50 h-screen h-[100dvh] w-screen overflow-hidden p-0 m-0" : "min-h-screen"}`}>
            {/* Global Campus Header with Active Status & Sign Out - Completely hidden during calls */}
            {!isInCall && (
              <CampusHeader
                profile={profile}
                onlineCount={students.length}
                onOpenProfileModal={() => setEditProfileOpen(true)}
                onStatusChange={handleStatusChange}
                onToggleCallRestriction={handleToggleCallRestriction}
                onSignOut={handleSignOut}
                currentTab={currentTab}
                onTabChange={handleTabChange}
                pendingRequestsCount={
                  friendRequests.filter(
                    (r) => r.receiverId === profile?.id && r.status === "pending"
                  ).length
                }
              />
            )}

            {/* Main Workspace View Router with Liquid Glass Switch Animation */}
            <main className={`flex-1 flex flex-col w-full relative ${isInCall ? "fixed inset-0 z-50 h-screen h-[100dvh] w-screen overflow-hidden p-0 m-0" : ""}`}>
              <div
                key={currentTab}
                className={`flex-1 flex flex-col w-full ${!isLightUi && !isInCall ? "animate-liquid-glass" : ""} ${isInCall ? "h-screen h-[100dvh] w-screen overflow-hidden" : ""}`}
              >
                {currentTab === "lounge" && (
                  <CampusLounge
                    currentProfile={profile}
                    students={students}
                    onInviteToCall={handleInviteToCall}
                    onToggleCallRestriction={handleToggleCallRestriction}
                    onOpen1on1Match={() => {
                      setDirectRoomToJoin(null);
                      setCurrentTab("match");
                    }}
                    onJoinHangout={(roomId) => {
                      setSelectedHangoutRoomId(roomId);
                      setCurrentTab("hangouts");
                    }}
                    friends={friends}
                    sentRequestIds={friendRequests
                      .filter((r) => r.senderId === profile?.id && r.status === "pending")
                      .map((r) => r.receiverId)}
                    receivedRequestIds={friendRequests
                      .filter((r) => r.receiverId === profile?.id && r.status === "pending")
                      .map((r) => r.senderId)}
                    onSendFriendRequest={handleSendFriendRequest}
                    onAcceptFriendRequest={(senderId) => {
                      const req = friendRequests.find(
                        (r) => r.senderId === senderId && r.receiverId === profile?.id
                      );
                      if (req) handleAcceptFriendRequest(req.id);
                    }}
                  />
                )}

                {currentTab === "match" && (
                  <RandomMatch
                    currentProfile={profile}
                    onEndMatch={() => {
                      setDirectRoomToJoin(null);
                      setIsInCall(false);
                      setCurrentTab("lounge");
                    }}
                    directRoomName={directRoomToJoin}
                    onInCallChange={setIsInCall}
                  />
                )}

                {currentTab === "hangouts" && (
                  <GroupHangout
                    currentProfile={profile}
                    initialRoomId={selectedHangoutRoomId}
                    onInCallChange={setIsInCall}
                  />
                )}

                {currentTab === "friends" && (
                  <FriendsView
                    currentProfile={profile}
                    friends={friends}
                    friendRequests={friendRequests}
                    onlineStudents={students}
                    onInviteToCall={handleInviteToCall}
                    onAcceptFriendRequest={handleAcceptFriendRequest}
                    onDeclineFriendRequest={handleDeclineFriendRequest}
                    onCancelFriendRequest={handleCancelFriendRequest}
                    onRemoveFriend={handleRemoveFriend}
                    onNavigateToLounge={() => handleTabChange("lounge")}
                  />
                )}

                {currentTab === "profile" && (
                  <ProfileView
                    profile={profile}
                    onOpenEditModal={() => setEditProfileOpen(true)}
                    onUpdateStatus={handleStatusChange}
                    onToggleCallRestriction={handleToggleCallRestriction}
                    onSignOut={handleSignOut}
                  />
                )}
              </div>
            </main>

            {/* App Footer with subtle creator credit */}
            {!isInCall && (
              <footer className="w-full text-center py-3 px-4 pb-24 md:pb-5 text-[10px] text-zinc-500 border-t border-zinc-900/60 mt-auto">
                <p>
                  UIU Campus Hub • Developed by{" "}
                  <span className="text-orange-400 font-medium">{CREATOR_INFO.name}</span> ({CREATOR_INFO.department}, UIU Student)
                </p>
              </footer>
            )}

            {/* Desktop / PC Mode Floating WhatsApp Feedback Button */}
            {!isInCall && (
              <aside className="hidden md:block fixed bottom-5 right-5 z-40">
                <a
                  href={getWhatsAppFeedbackUrl("general")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-emerald-500/40 hover:border-emerald-500/70 text-emerald-400 hover:text-emerald-300 text-xs font-semibold shadow-xl shadow-black/50 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                  title="Send Feedback or Report Bug on WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Feedback</span>
                </a>
              </aside>
            )}

            {/* Persistent Mobile Bottom Navigation Bar - Completely hidden during calls */}
            {!isInCall && (
              <BottomNavigation
                currentTab={currentTab}
                onTabChange={handleTabChange}
                pendingRequestsCount={
                  friendRequests.filter(
                    (r) => r.receiverId === profile?.id && r.status === "pending"
                  ).length
                }
              />
            )}

            {/* Student Profile Edit Modal */}
            <ProfileOnboardingModal
              isOpen={editProfileOpen}
              onClose={() => setEditProfileOpen(false)}
              currentProfile={profile}
              onSaveProfile={(updated) => {
                setProfile(updated);
                saveLocalProfile(updated);
                syncProfileWithSupabase(updated);
              }}
              onRequireRelogin={async () => {
                const userIdentifier = profile?.email || profile?.id || "";
                setAuthPreFill(userIdentifier);
                setAuthNotice("Profile updated successfully! For security, please log in with your password again.");
                setEditProfileOpen(false);
                await handleSignOut();
              }}
            />

            {/* Incoming Video Call Modal */}
            <IncomingCallModal
              invite={incomingInvite}
              onAccept={handleAcceptInvite}
              onDecline={handleDeclineInvite}
            />
          </div>
        </div>
      )}

      {/* Global UIU Bus Cinematic Transition Overlay */}
      {showBusTransition && (
        <UiuBusTransition onComplete={() => setShowBusTransition(false)} />
      )}
    </>
  );
}
