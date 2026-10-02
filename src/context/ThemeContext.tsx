"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "campus_hub_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  const applyThemeToDOM = (mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      body.classList.add("dark");
      body.classList.remove("light");
      body.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      body.classList.add("light");
      body.classList.remove("dark");
      body.setAttribute("data-theme", "light");
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
        applyThemeToDOM(stored);
      } else {
        // Default to dark mode (Linear / Discord aesthetic)
        setThemeState("dark");
        applyThemeToDOM("dark");
      }
    } catch {
      setThemeState("dark");
      applyThemeToDOM("dark");
    }
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyThemeToDOM(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  };

  const toggleTheme = () => {
    const nextMode = theme === "dark" ? "light" : "dark";
    setTheme(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
