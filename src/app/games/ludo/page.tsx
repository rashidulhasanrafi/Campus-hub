"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LudoGameView from "@/components/ludo/LudoGameView";
import { UserProfile, fetchUserProfile, supabase } from "@/lib/supabase";
import { RefreshCw } from "lucide-react";

function LudoPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomParam = searchParams.get("room");
  const modeParam = (searchParams.get("mode") as "random" | "custom") || null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (userId) {
          // Single Source of Truth: Always fetch from public.profiles table
          const prof = await fetchUserProfile(userId);
          if (prof) {
            setProfile(prof);
          }

          // Realtime Profile Sync: Subscribe to postgres_changes on public.profiles
          activeChannel = supabase
            .channel(`ludo-profile-sync-${userId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "profiles",
                filter: `id=eq.${userId}`,
              },
              (payload) => {
                const newRow = payload.new as any;
                if (newRow && newRow.id === userId && newRow.full_name) {
                  setProfile((prev) => ({
                    id: newRow.id,
                    email: newRow.email || prev?.email,
                    student_id: newRow.student_id || prev?.student_id,
                    full_name: newRow.full_name,
                    department: newRow.department || prev?.department || "Computer Science & Engineering (CSE)",
                    batch: newRow.batch || prev?.batch || "Batch '24 (Junior)",
                    avatar: newRow.avatar || prev?.avatar || "/images/avatar-male.png",
                    status: newRow.status || prev?.status || "Playing Ludo 🎲",
                    bio: newRow.bio ?? prev?.bio ?? "",
                    is_online: true,
                    last_seen: newRow.last_seen || new Date().toISOString(),
                    call_restricted: Boolean(newRow.call_restricted),
                  }));
                }
              }
            )
            .subscribe();
        }
      } catch (e) {
        console.warn("Could not load user profile for Ludo:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
        <span className="text-sm font-semibold">Connecting to Campus Ludo Arena...</span>
      </div>
    );
  }

  return (
    <LudoGameView
      currentProfile={profile}
      initialRoomCode={roomParam}
      initialMode={modeParam}
      onExitGame={() => router.push("/")}
    />
  );
}

export default function LudoPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
          Loading Ludo...
        </div>
      }
    >
      <LudoPageContent />
    </Suspense>
  );
}
