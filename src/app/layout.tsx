import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@livekit/components-styles";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/context/ThemeContext";
import { UiModeProvider } from "@/context/UiModeContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export const metadata: Metadata = {
  title: "UIU Campus Hub | United International University",
  description:
    "Connect with UIU peers instantly: 1-on-1 random video matchmaking, multi-peer hangout study rooms, and live online lounge.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UIU Hub",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-campus="uiu"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("campus_hub_theme_mode");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)||!t;if(d){document.documentElement.classList.add("dark");document.documentElement.classList.remove("light");document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");document.documentElement.setAttribute("data-theme","light");}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        data-campus="uiu"
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#090a0f] text-zinc-100 select-none transition-colors duration-200"
      >
        <ThemeProvider>
          <UiModeProvider>{children}</UiModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
