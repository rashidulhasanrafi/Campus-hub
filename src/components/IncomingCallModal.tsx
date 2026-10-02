"use client";

import React from "react";
import { DirectCallInvite } from "@/lib/supabase";
import { PhoneCall, PhoneOff, Video, Sparkles } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm rounded-3xl glass-dock border border-indigo-500/40 p-6 shadow-2xl bg-slate-950/95 text-center overflow-hidden">
        {/* Animated background glow ring */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-600/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-rose-600/30 rounded-full blur-2xl pointer-events-none" />

        {/* Pulsing Avatar */}
        <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[3px] shadow-xl">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl">
              {invite.fromAvatar}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30">
          <Video className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Incoming Campus Video Call
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">
          {invite.fromName}
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          {invite.fromDepartment} • {invite.fromBatch}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onDecline(invite)}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            Decline
          </button>

          <button
            onClick={() => onAccept(invite)}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95 animate-pulse"
          >
            <PhoneCall className="w-4 h-4" />
            Accept Call
          </button>
        </div>
      </div>
    </div>
  );
}
