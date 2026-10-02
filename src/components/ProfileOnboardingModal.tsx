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
import StudentAvatar from "@/components/StudentAvatar";
import {
  X,
  Check,
  User,
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 p-6 shadow-2xl bg-zinc-950">
        {/* Close Button */}
        {currentProfile && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-orange-500/30 flex items-center justify-center text-zinc-100 shadow-sm shrink-0">
            <GraduationCap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 tracking-tight">
              {currentProfile ? "Edit UIU Student Profile" : "UIU Campus Hub Setup"}
            </h2>
            <p className="text-xs text-zinc-400">
              Customize your campus avatar, department, and live status
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => setAuthMode("instant")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              authMode === "instant"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm"
                : "text-zinc-400 hover:text-orange-400"
            }`}
          >
            Instant Student ID
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("email")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              authMode === "email"
                ? "bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm"
                : "text-zinc-400 hover:text-orange-400"
            }`}
          >
            Supabase Account
          </button>
        </div>

        {authMode === "email" ? (
          <div className="space-y-3.5 mb-5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                University Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {authError}
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleEmailAuth(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleEmailAuth(true)}
                className="flex-1 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
              >
                Create Account
              </button>
            </div>
            <p className="text-[10px] text-center text-zinc-500">
              Secured with Supabase Auth Cloud
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
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
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Full Student Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Department & Batch Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors"
              >
                {CAMPUS_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-zinc-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Batch / Year
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors"
              >
                {CAMPUS_BATCHES.map((b) => (
                  <option key={b} value={b} className="bg-zinc-900 text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Realtime Status Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Campus Real-Time Status
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

          {/* Short Bio */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Short Bio / Campus Interest
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you currently studying or interested in?"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
          </div>

          {/* Action Button: UIU Orange by default, turns dark gray on hover */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>{currentProfile ? "Save Profile Changes" : "Enter UIU Campus Lounge"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
