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

  const isUrl =
    avatar &&
    (avatar.startsWith("http://") ||
      avatar.startsWith("https://") ||
      avatar.startsWith("/"));

  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700/60 flex items-center justify-center select-none shadow-sm">
        {isUrl && !imageError ? (
          <img
            src={avatar}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-semibold text-zinc-200">
            {avatar && avatar.length <= 4 && !avatar.startsWith("http")
              ? avatar
              : getInitials(name)}
          </span>
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
