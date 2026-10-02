"use client";

import React from "react";
import { DirectCallInvite } from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import { PhoneCall, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  invite: DirectCallInvite | null;
  onAccept: (invite: DirectCallInvite) => void;
  onDecline: (invite: DirectCallInvite) => void;
}

export default function IncomingCallModal({
  invite,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-center overflow-hidden">
        {/* Caller Avatar */}
        <div className="relative mx-auto mb-4 flex justify-center">
          <StudentAvatar
            size="xl"
            avatar={invite.fromAvatar}
            name={invite.fromName}
            isOnline={true}
          />
        </div>

        {/* Status indicator badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Video className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
          <span>Incoming Video Call</span>
        </div>

        <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
          {invite.fromName}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 mb-6">
          {invite.fromDepartment} • {invite.fromBatch}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onDecline(invite)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-rose-400 font-medium text-xs transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            <PhoneOff className="w-4 h-4 text-zinc-400" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => onAccept(invite)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <PhoneCall className="w-4 h-4 text-zinc-950" />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
