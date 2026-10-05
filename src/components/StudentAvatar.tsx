"use client";

import React, { useState } from "react";

interface StudentAvatarProps {
  avatar?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showOnlineBadge?: boolean;
  className?: string;
  isOnline?: boolean;
}

export default function StudentAvatar({
  avatar,
  name = "Student",
  size = "md",
  showOnlineBadge = true,
  className = "",
  isOnline = true,
}: StudentAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-2xl",
  };

  const badgeSizeClasses = {
    sm: "w-2.5 h-2.5 border-[1.5px]",
    md: "w-3 h-3 border-2",
    lg: "w-3.5 h-3.5 border-2",
    xl: "w-4 h-4 border-[2.5px]",
  };

  // Check if student is female based on name, gender hint, or avatar
  const isFemaleStudent = (n: string = "", av: string = "") => {
    const text = `${n} ${av}`.toLowerCase();
    return (
      text.includes("female") ||
      text.includes("girl") ||
      text.includes("woman") ||
      text.includes("priya") ||
      text.includes("anika") ||
      text.includes("sara") ||
      text.includes("sarah") ||
      text.includes("ayesha") ||
      text.includes("nusrat") ||
      text.includes("maya") ||
      text.includes("elena") ||
      text.includes("chloe") ||
      text.includes("fatima") ||
      text.includes("aisha") ||
      text.includes("sharma") ||
      text.includes("tabassum") ||
      text.includes("jahan") ||
      text.includes("tasnim") ||
      text.includes("mim") ||
      text.includes("sadia") ||
      text.includes("sumaiya") ||
      text.includes("afia") ||
      text.includes("farhana") ||
      text.includes("tanzina") ||
      text.includes("jannat") ||
      text.includes("fariha") ||
      text.includes("samia") ||
      text.includes("noshin") ||
      text.includes("nowshin") ||
      text.includes("lamia")
    );
  };

  // Determine avatar image source
  const resolvedAvatar = (() => {
    if (avatar && (avatar.includes("avatar-female") || avatar.includes("avatar-male"))) {
      return avatar;
    }
    // If it's a legacy unsplash url, empty, or custom
    if (!avatar || avatar.includes("unsplash.com") || !avatar.startsWith("/")) {
      return isFemaleStudent(name, avatar || "")
        ? "/images/avatar-female.png"
        : "/images/avatar-male.png";
    }
    return avatar;
  })();

  return (
    <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/60 flex items-center justify-center select-none shadow-sm">
        {!imageError ? (
          <img
            src={resolvedAvatar}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <img
            src={isFemaleStudent(name, avatar || "") ? "/images/avatar-female.png" : "/images/avatar-male.png"}
            alt={name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {showOnlineBadge && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-zinc-950 shadow-sm ${
            badgeSizeClasses[size]
          } ${isOnline ? "bg-emerald-500" : "bg-zinc-500"}`}
          title={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
