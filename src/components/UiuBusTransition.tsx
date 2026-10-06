"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UiuBusTransitionProps {
  onComplete: () => void;
}

export default function UiuBusTransition({ onComplete }: UiuBusTransitionProps) {
  // Timeline Stages:
  // 1: "bus" (Bus driving from right to left with orange energy wave) -> 0s to 3.0s (3s pass)
  // 2: "welcome" (Screen is full orange; "Welcome to UIU Campus Hub" typography appears and displays for 2.0s) -> 3.0s to 5.0s
  // 3: "frosted" (Smooth dissolve into real dashboard UI within 2s) -> 4.6s to 5.0s
  const [stage, setStage] = useState<"bus" | "welcome" | "frosted">("bus");

  useEffect(() => {
    // Stage 1: Bus driving across the screen takes 3.0 seconds
    const tWelcome = setTimeout(() => {
      setStage("welcome");
    }, 3000);

    // Stage 2: Orange page with "Welcome to UIU Campus Hub" displays for 2.0 seconds
    // At 4.6s, smoothly starts dissolving so that exactly at 5.0s total the UI arrives
    const tFrosted = setTimeout(() => {
      setStage("frosted");
    }, 4600);

    // Within 2 seconds of orange page, real UI is fully active (at 5.0s)
    const tComplete = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearTimeout(tWelcome);
      clearTimeout(tFrosted);
      clearTimeout(tComplete);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden">
      {/* 1. INITIAL TRIGGER: Background muted into charcoal / dark grayscale */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{
          opacity: stage === "frosted" ? 0 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 bg-[#07090f]/85 backdrop-grayscale backdrop-contrast-125 z-0"
      />

      {/* 2. STAGE 1: MOVING ASSEMBLY (BUS AT FRONT + DYNAMIC ORANGE WAKE ERUPTING FROM REAR BUMPER) */}
      {/* Drives across the screen for 3.0 seconds */}
      <motion.div
        initial={{ x: "100vw" }}
        animate={{
          x: "calc(-1 * (min(860px, 94vw) + 340px))",
        }}
        transition={{
          duration: 3.0,
          ease: [0.25, 0.1, 0.25, 1], // Smooth, natural automotive momentum
        }}
        className="absolute inset-y-0 left-0 flex flex-row pointer-events-none will-change-transform z-20"
        style={{ width: "calc(100vw + min(860px, 94vw) + 340px + 160vw)" }}
      >
        {/* ITEM 1: THE UIU BUS CHASSIS (FRONT OF THE ASSEMBLY) */}
        <div
          className="relative h-full flex flex-col justify-end pb-10 sm:pb-16 md:pb-20 shrink-0 pointer-events-none"
          style={{ width: "min(860px, 94vw)" }}
        >
          {/* Driving Suspension Tilt & Vibration on the Chassis */}
          <motion.div
            animate={{
              y: [0, -3.8, 1.8, -2.8, 1.2, -3.2, 0],
              rotate: [0, -0.65, 0.55, -0.45, 0.65, 0],
            }}
            transition={{
              duration: 0.32,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative w-full"
          >
            {/* Asphalt Contact Shadow under Tires */}
            <div className="absolute -bottom-4 left-6 right-6 h-6 bg-black/85 rounded-full blur-md filter pointer-events-none" />

            {/* The UIU Bus Body */}
            <img
              src="/images/uiu-bus.png"
              alt="UIU Bus"
              className="w-full h-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.95)] filter contrast-105"
            />

            {/* Headlight beam on road (Bus faces left) */}
            <div className="absolute -left-28 bottom-2 w-44 h-16 bg-gradient-to-l from-amber-200/50 via-yellow-100/20 to-transparent blur-xl transform -skew-x-12 pointer-events-none" />

            {/* Rear Wheel Dust Puffs (Rear wheel is at ~72% from left, ~28% from right) */}
            <div className="absolute right-[27%] -bottom-1 pointer-events-none">
              <span className="dust-puff dust-puff-1" />
              <span className="dust-puff dust-puff-2" />
              <span className="dust-puff dust-puff-3" />
            </div>

            {/* Front Wheel Dust Puffs (Front steering wheel is at ~18% from left) */}
            <div className="absolute left-[18%] -bottom-1 pointer-events-none">
              <span className="dust-puff dust-puff-front" />
            </div>

            {/* CORE ERUPTION EMITTER: Point of origin where orange energy erupts from rear bumper */}
            <div className="absolute right-0 top-1/3 bottom-2 w-44 pointer-events-none transform translate-x-1/2">
              {/* Intense pulsating radiant core */}
              <div className="w-full h-full rounded-full bg-gradient-radial from-amber-200 via-orange-500 to-transparent blur-lg opacity-95 animate-pulse" />
              
              {/* Billowing Orange Energy Plumes expanding backwards */}
              <span className="orange-surge-puff orange-surge-1 -top-4 right-0" />
              <span className="orange-surge-puff orange-surge-2 top-10 right-4" />
              <span className="orange-surge-puff orange-surge-3 top-24 right-2" />
            </div>
          </motion.div>
        </div>

        {/* ITEM 2: DYNAMIC ERUPTING ORANGE WAKE & FULL SCREEN PAGE */}
        <motion.div
          animate={{
            opacity: stage === "frosted" ? 0 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative h-full flex flex-row shrink-0 overflow-visible"
          style={{
            marginLeft: "-1.5%", // Flush against rear bumper with zero gap
          }}
        >
          {/* A. ORGANIC CURVED LEADING WAVE (Erupts from bus rear at Y~72% and fans up to top of screen) */}
          <div className="relative h-full w-[260px] sm:w-[300px] md:w-[340px] shrink-0 pointer-events-none">
            <svg
              className="w-full h-full pointer-events-none"
              viewBox="0 0 320 1000"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="uiu-orange-wave" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F26522" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="uiu-orange-wave-subtle" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff9a48" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#F26522" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Preceding ethereal aura plume (fans out ahead) */}
              <path
                d="M 320,0 L 200,0 C 130,230 70,480 0,720 C 0,840 25,950 45,1000 L 320,1000 Z"
                fill="url(#uiu-orange-wave-subtle)"
                transform="translate(-32, 0)"
              />

              {/* Main solid vibrant orange wave erupting from bus rear bumper (0, 720) */}
              <path
                d="M 320,0 L 230,0 C 150,250 85,500 0,720 C 0,850 20,950 40,1000 L 320,1000 Z"
                fill="url(#uiu-orange-wave)"
              />

              {/* Radiant glowing rim along the expanding wave curve */}
              <path
                d="M 230,0 C 150,250 85,500 0,720 C 0,850 20,950 40,1000"
                stroke="#ffdd99"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.9"
                filter="drop-shadow(0 0 10px #ff7a38)"
              />
            </svg>
          </div>

          {/* B. SOLID EXPANDING VIBRANT UIU ORANGE FULL-SCREEN SHEET */}
          <div
            className="h-full shrink-0 bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#F26522] relative overflow-hidden"
            style={{
              width: "max(160vw, 2400px)",
              marginLeft: "-1px", // Seamlessly joins SVG wave
            }}
          >
            {/* Ambient Lighting Gradient on Orange Surface */}
            <div className="w-full h-full bg-gradient-to-b from-white/10 via-transparent to-black/25 pointer-events-none" />
          </div>
        </motion.div>
      </motion.div>

      {/* 3. STAGE 2: BOLD MODERN WELCOME TYPOGRAPHY (APPEARS SWIFTLY, DISPLAYS OVER FULL ORANGE SCREEN FOR 2 SECS) */}
      <AnimatePresence>
        {stage === "welcome" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-4"
          >
            {/* Ambient Radiant Center Glow */}
            <div className="absolute w-[480px] h-[480px] rounded-full bg-white/20 blur-3xl pointer-events-none -z-10 animate-pulse" />

            {/* UIU Campus Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 border border-white/30 text-white text-xs sm:text-sm font-bold tracking-widest uppercase mb-4 shadow-xl backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-pulse" />
              UIU CAMPUS NETWORK
            </div>

            {/* Main Welcome Heading */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              Welcome to{" "}
              <span className="text-amber-200 drop-shadow-[0_0_25px_rgba(255,255,255,0.7)]">
                UIU Campus Hub
              </span>
            </h1>

            {/* University Tag */}
            <p className="mt-3 text-sm sm:text-base md:text-lg font-semibold text-white/95 tracking-[0.25em] uppercase drop-shadow-md">
              United International University
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. STAGE 3: FROSTED TRANSLUCENT GLASS REVEAL INTO REAL APP DASHBOARD */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{
          opacity: stage === "frosted" ? 0 : 1,
        }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`absolute inset-0 z-30 transition-all pointer-events-none ${
          stage === "frosted"
            ? "backdrop-blur-md bg-slate-950/40"
            : "bg-transparent"
        }`}
      />
    </div>
  );
}
