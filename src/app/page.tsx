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
import AuthScreen from "@/components/AuthScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import CampusHeader from "@/components/CampusHeader";
import BottomNavigation, { NavTab } from "@/components/BottomNavigation";
import CampusLounge from "@/components/CampusLounge";
import RandomMatch from "@/components/RandomMatch";
import GroupHangout from "@/components/GroupHangout";
import ProfileView from "@/components/ProfileView";
import ProfileOnboardingModal from "@/components/ProfileOnboardingModal";
import IncomingCallModal from "@/components/IncomingCallModal";
import UiuBusTransition from "@/components/UiuBusTransition";
import { Sparkles, Radio } from "lucide-react";
import { useUiMode } from "@/context/UiModeContext";

export default function CampusHubHome() {
  const { isLightUi } = useUiMode();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showBusTransition, setShowBusTransition] = useState(false);

  // App navigation & state
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [currentTab, setCurrentTab] = useState<NavTab>("lounge");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState<DirectCallInvite | null>(null);
  const [directRoomToJoin, setDirectRoomToJoin] = useState<string | null>(null);
  const [selectedHangoutRoomId, setSelectedHangoutRoomId] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [authPreFill, setAuthPreFill] = useState("");
  const [isInCall, setIsInCall] = useState(false);

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
        setIncomingInvite(invite);
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
    setAuthLoading(true);
    await signOutCampusUser();
    setSession(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setAuthLoading(false);
  };

  // Send Direct Video Call Invite
  const handleInviteToCall = (targetStudent: UserProfile) => {
    if (!profile) return;

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

          <div className="relative z-10 flex flex-col flex-1 min-h-screen">
            {/* Global Campus Header with Active Status & Sign Out - Completely hidden during calls */}
            {!isInCall && (
              <CampusHeader
                profile={profile}
                onlineCount={students.length}
                onOpenProfileModal={() => setEditProfileOpen(true)}
                onStatusChange={handleStatusChange}
                onSignOut={handleSignOut}
                currentTab={currentTab}
                onTabChange={handleTabChange}
              />
            )}

            {/* Main Workspace View Router with Liquid Glass Switch Animation */}
            <main className="flex-1 flex flex-col w-full relative">
              <div
                key={currentTab}
                className={`flex-1 flex flex-col w-full ${!isLightUi ? "animate-liquid-glass" : ""}`}
              >
                {currentTab === "lounge" && (
                  <CampusLounge
                    currentProfile={profile}
                    students={students}
                    onInviteToCall={handleInviteToCall}
                    onOpen1on1Match={() => {
                      setDirectRoomToJoin(null);
                      setCurrentTab("match");
                    }}
                    onJoinHangout={(roomId) => {
                      setSelectedHangoutRoomId(roomId);
                      setCurrentTab("hangouts");
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

                {currentTab === "profile" && (
                  <ProfileView
                    profile={profile}
                    onOpenEditModal={() => setEditProfileOpen(true)}
                    onUpdateStatus={handleStatusChange}
                    onSignOut={handleSignOut}
                  />
                )}
              </div>
            </main>

            {/* Persistent Mobile Bottom Navigation Bar - Completely hidden during calls */}
            {!isInCall && (
              <BottomNavigation
                currentTab={currentTab}
                onTabChange={handleTabChange}
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
