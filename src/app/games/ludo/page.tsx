"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LudoGameView from "@/components/ludo/LudoGameView";
import { UserProfile, ensureUserProfile, supabase } from "@/lib/supabase";
import { RefreshCw } from "lucide-react";

function LudoPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomParam = searchParams.get("room");
  const modeParam = (searchParams.get("mode") as "random" | "custom") || null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // Single Source of Truth: Always load directly from public.profiles table
          const prof = await ensureUserProfile(data.session.user);
          if (prof) {
            setProfile(prof);
          }
        }
      } catch (e) {
        console.warn("Could not load user profile for Ludo:", e);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
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
