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
        // Smart default: If on mobile / Android WebView, default to light UI to prevent overheating
        const isMobile =
          typeof window !== "undefined" &&
          (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|wv/i.test(
            navigator.userAgent || ""
          ) ||
            window.innerWidth < 768);

        setUiModeState(isMobile ? "light" : "heavy");
      }
    } catch {
      setUiModeState("heavy");
    }
  }, []);

  // Sync data-ui-mode to document root so global lightweight CSS styles apply
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-ui-mode", uiMode);
      if (uiMode === "light") {
        document.documentElement.classList.add("light-ui-mode");
        document.documentElement.classList.remove("heavy-ui-mode");
      } else {
        document.documentElement.classList.add("heavy-ui-mode");
        document.documentElement.classList.remove("light-ui-mode");
      }
    }
  }, [uiMode]);

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
