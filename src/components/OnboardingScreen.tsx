"use client";

import React, { useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  UserProfile,
  CAMPUS_DEPARTMENTS,
  CAMPUS_BATCHES,
  CAMPUS_STATUS_OPTIONS,
  AVATAR_OPTIONS,
  syncProfileWithSupabase,
} from "@/lib/supabase";
import StudentAvatar from "@/components/StudentAvatar";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  User as UserIcon,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";

interface OnboardingScreenProps {
  user: User;
  onProfileCreated: (profile: UserProfile) => void;
}

export default function OnboardingScreen({
  user,
  onProfileCreated,
}: OnboardingScreenProps) {
  const initialName = user.email
    ? user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Campus Student";

  const [fullName, setFullName] = useState(initialName);
  const [department, setDepartment] = useState(CAMPUS_DEPARTMENTS[0]);
  const [batch, setBatch] = useState(CAMPUS_BATCHES[1]);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].emoji);
  const [status, setStatus] = useState(CAMPUS_STATUS_OPTIONS[0].label);
  const [bio, setBio] = useState("Excited to connect with campus peers & collaborate on projects!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full student name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const newProfile: UserProfile = {
      id: user.id,
      email: user.email || undefined,
      full_name: fullName.trim(),
      department,
      batch,
      avatar: selectedAvatar,
      status,
      bio: bio.trim(),
      is_online: true,
      last_seen: new Date().toISOString(),
    };

    try {
      await syncProfileWithSupabase(newProfile);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
      onProfileCreated(newProfile);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error saving onboarding profile:", error);
      setErrorMsg(error.message || "Failed to save profile. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#090a0f] text-white">
      {/* Background Subtle Watermark */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
      >
        <img
          src="/images/campus-hub-emblem-tight.png"
          alt=""
          className="w-[580px] sm:w-[760px] max-w-none opacity-[0.05] filter contrast-125 object-contain"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800/80 p-6 sm:p-8 bg-zinc-900/60 backdrop-blur-xl shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-orange-500/40 p-1 flex items-center justify-center text-zinc-100 shadow-sm shrink-0">
            <img
              src="/images/campus-hub-icon.png"
              alt="Campus Hub Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 mb-0.5">
              <Sparkles className="w-3 h-3 text-orange-400" />
              UIU FIRST-TIME SETUP
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Create Student Profile
            </h1>
            <p className="text-xs text-zinc-400">
              Set up your UIU campus identity for video matches & hangout rooms
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Choose Campus Avatar
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((item) => {
                const isSelected = selectedAvatar === item.emoji;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAvatar(item.emoji)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors ${
                      isSelected
                        ? "bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <StudentAvatar
                      avatar={item.emoji}
                      name={item.label}
                      size="sm"
                      showOnlineBadge={false}
                    />
                    <span className="text-[10px] text-zinc-400 truncate w-full text-center mt-1">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Student Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Department & Batch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors"
              >
                {CAMPUS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-zinc-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Batch / Year
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors"
              >
                {CAMPUS_BATCHES.map((b) => (
                  <option key={b} value={b} className="bg-zinc-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campus Real-Time Status */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Initial Campus Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPUS_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatus(opt.label)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs text-left border transition-colors ${
                    status === opt.label
                      ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {status === opt.label && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Short Bio / Campus Interest
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you currently studying or interested in?"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !fullName.trim()}
            className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? "Creating Profile..." : "Complete Setup & Enter Hub"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
