"use client";

import React, { useState } from "react";
import {
  UserProfile,
  CAMPUS_DEPARTMENTS,
  CAMPUS_BATCHES,
  CAMPUS_STATUS_OPTIONS,
  AVATAR_OPTIONS,
  syncProfileWithSupabase,
  supabase,
} from "@/lib/supabase";
import {
  X,
  Sparkles,
  Check,
  User,
  GraduationCap,
  BookOpen,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ProfileOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
}

export default function ProfileOnboardingModal({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}: ProfileOnboardingModalProps) {
  const [fullName, setFullName] = useState(
    currentProfile?.full_name || "Alex Chen"
  );
  const [department, setDepartment] = useState(
    currentProfile?.department || CAMPUS_DEPARTMENTS[0]
  );
  const [batch, setBatch] = useState(
    currentProfile?.batch || CAMPUS_BATCHES[1]
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentProfile?.avatar || AVATAR_OPTIONS[0].emoji
  );
  const [status, setStatus] = useState(
    currentProfile?.status || CAMPUS_STATUS_OPTIONS[0].label
  );
  const [bio, setBio] = useState(
    currentProfile?.bio || "Exploring campus, building projects, and connecting!"
  );

  // Optional Supabase Email Auth toggle
  const [authMode, setAuthMode] = useState<"instant" | "email">("instant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const id = currentProfile?.id || `student_${Date.now().toString(36)}`;
    const newProfile: UserProfile = {
      id,
      full_name: fullName.trim(),
      department,
      batch,
      avatar: selectedAvatar,
      status,
      bio: bio.trim(),
      is_online: true,
      last_seen: new Date().toISOString(),
    };

    onSaveProfile(newProfile);
    await syncProfileWithSupabase(newProfile);
    onClose();
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      setAuthError("Please fill in email and password");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const id = data.user.id;
          const newProfile: UserProfile = {
            id,
            full_name: fullName.trim() || email.split("@")[0],
            department,
            batch,
            avatar: selectedAvatar,
            status,
            bio: bio.trim(),
            is_online: true,
          };
          onSaveProfile(newProfile);
          await syncProfileWithSupabase(newProfile);
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const id = data.user.id;
          const newProfile: UserProfile = {
            id,
            full_name: fullName.trim() || email.split("@")[0],
            department,
            batch,
            avatar: selectedAvatar,
            status,
            bio: bio.trim(),
            is_online: true,
          };
          onSaveProfile(newProfile);
          await syncProfileWithSupabase(newProfile);
          onClose();
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAuthError(error.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl glass-dock border border-slate-700/70 p-6 shadow-2xl bg-slate-950/95">
        {/* Close Button */}
        {currentProfile && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              🎓
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {currentProfile ? "Edit Student Profile" : "Campus Hub Onboarding"}
            </h2>
            <p className="text-xs text-slate-400">
              Customize your campus avatar, department, and live status
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setAuthMode("instant")}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              authMode === "instant"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Instant Student ID
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("email")}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              authMode === "email"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Supabase Account
          </button>
        </div>

        {authMode === "email" ? (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                University Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {authError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleEmailAuth(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleEmailAuth(true)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Create Account
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-500">
              Secured with Supabase Auth Cloud
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Choose Campus Avatar
            </label>
            <div className="grid grid-cols-4 gap-2.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Full Student Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Department & Batch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {CAMPUS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Batch / Year
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {CAMPUS_BATCHES.map((b) => (
                  <option key={b} value={b} className="bg-slate-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Realtime Status Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Campus Real-Time Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CAMPUS_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatus(opt.label)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs text-left border transition-all ${
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

          {/* Short Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Short Bio / Campus Interest
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you currently studying or interested in?"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>{currentProfile ? "Save Profile Changes" : "Enter Campus Lounge"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
