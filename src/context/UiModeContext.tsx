"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type UiMode = "heavy" | "light";

interface UiModeContextType {
  uiMode: UiMode;
  isLightUi: boolean;
  toggleUiMode: () => void;
  setUiMode: (mode: UiMode) => void;
}

const UI_MODE_STORAGE_KEY = "campus_hub_ui_mode";

const UiModeContext = createContext<UiModeContextType>({
  uiMode: "heavy",
  isLightUi: false,
  toggleUiMode: () => {},
  setUiMode: () => {},
});

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [uiMode, setUiModeState] = useState<UiMode>("heavy");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(UI_MODE_STORAGE_KEY) as UiMode | null;
      if (stored === "light" || stored === "heavy") {
        setUiModeState(stored);
      } else {
        // Default to heavy mode so the illustrated custom icons are displayed
        setUiModeState("heavy");
      }
    } catch {
      setUiModeState("heavy");
    }
  }, []);

  const setUiMode = (mode: UiMode) => {
    setUiModeState(mode);
    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
    } catch {}
  };

  const toggleUiMode = () => {
    const nextMode = uiMode === "heavy" ? "light" : "heavy";
    setUiMode(nextMode);
  };

  return (
    <UiModeContext.Provider
      value={{
        uiMode,
        isLightUi: uiMode === "light",
        toggleUiMode,
        setUiMode,
      }}
    >
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode() {
  return useContext(UiModeContext);
}
