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
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  User as UserIcon,
  Check,
  Radio,
  BookOpen,
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
          particleCount: 50,
          spread: 70,
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#0b0f19] text-white">
      {/* Background glow effects */}
      <div className="absolute top-10 left-10 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl glass-dock border border-slate-700/60 p-6 sm:p-8 bg-slate-950/90 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[2px] shadow-xl shadow-indigo-500/30 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
              🎓
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              FIRST-TIME SETUP
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Create Student Profile
            </h1>
            <p className="text-xs text-slate-400">
              Set up your campus identity for video matches & hangout rooms
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
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
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-indigo-600/30 border-cyan-400 ring-2 ring-cyan-400/30 scale-105"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-2xl mb-1">{item.emoji}</span>
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Student Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Department & Batch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {CAMPUS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Batch / Year
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {CAMPUS_BATCHES.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campus Real-Time Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Initial Campus Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPUS_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatus(opt.label)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs text-left border transition-all ${
                    status === opt.label
                      ? "bg-indigo-600/30 border-cyan-400 text-white font-medium"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {status === opt.label && (
                    <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Short Bio / Campus Interest
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you currently studying or interested in?"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !fullName.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? "Creating Profile..." : "Complete Setup & Enter Hub"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
