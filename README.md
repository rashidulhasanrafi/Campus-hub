# 🎓 Campus Hub - Real-Time Video & Social Network

A modern, full-stack campus social hub and real-time video chat application built with **React / Next.js App Router**, **Tailwind CSS**, **Lucide Icons**, **Supabase**, and **LiveKit Cloud**.

Designed mobile-first with safe-area insets, fluid responsive glassmorphism, and structured for seamless export to **Android APK (via Capacitor & Android Studio)** and **iOS (via Xcode)**.

---

## 🌟 Key Features & Modules

### 1. 🔐 LiveKit Token Generator Backend
* Secure API route at `/api/livekit-token` using the official `livekit-server-sdk`.
* Issues signed WebRTC Access Tokens with `roomJoin`, `canPublish`, `canSubscribe`, and `canPublishData` permissions.
* Configured with your LiveKit Cloud credentials:
  * Server: `wss://campus-hub-50uslxwj.livekit.cloud`
  * API Key: `API8FvQaSdBe4Pp`

### 2. ⚡ Supabase Campus Auth & Realtime Lounge
* **Realtime Presence**: Students on campus appear live in the online lounge roster across multiple browser tabs and devices.
* **Live Status Updater**: Quick status badges (`Ready to chat 💬`, `Free for coffee ☕`, `Studying at Library 📚`, `Exam prep grind 🔥`, `Chilling at Canteen 🍕`).
* **Student Onboarding**: Full Name, Department (CSE, EEE, BBA, SWE, ME, DSAI, etc.), Batch / Graduation Year, and vibrant university avatars.
* **Direct Wave & Call Invites**: "Say Hi 👋" high-fives and direct 1-on-1 video call invitations with incoming ring modals.
* **Campus Bulletin**: Real-time shoutouts and study session announcements with like reactions.

### 3. 🎲 Module 2: 1-on-1 Random Video Match (Omegle Style)
* Dynamic 1-on-1 peer matching powered by `@livekit/components-react`.
* **Split-screen layout**: Stranger preview on top / side and local self-preview with camera flip toggle.
* **Floating responsive dock**:
  * `Next / Skip`: Instantly rotates to the next campus match.
  * `Toggle Mic`: Mute / unmute microphone.
  * `Toggle Camera`: Enable / disable video track.
  * `In-Call Chat`: Real-time text messaging alongside live video.
  * `End Call`: Gracefully leaves the matchmaking room.
* **Topic Filters**: Campus Life & Chill, Coding & Projects, Exam Stress, Indie Music, Random.

### 4. 👥 Module 3: Campus Group Hangouts (Up to 8 Participants)
* Themed rooms: *Canteen Adda 🍔*, *Project & Code Jam 💻*, *Library Silent Study 📚*, *Acoustic Jam 🎸*, *Gaming Lounge 🎮*.
* **Dynamic 2x4 responsive video grid** adapting automatically to 1–8 live video feeds.
* **Active Speaker Highlighting**: Pulsing emerald ring and audio visualizer around the active speaker.
* **In-Room Media Dock**: Mic, Camera, Screen Share, Floating Emoji Reactions (🎉, 🔥, 👏, ☕, ❤️), and participant drawer.

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js 18+ (tested on Node v26)
* npm 9+

### 2. Environment Variables
The repository comes pre-configured with `.env.local` and `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ufddryfhzlnpqxekmbad.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XiU2oSz-OIt3CXOqzZQimQ_17DbCDGt

LIVEKIT_URL=wss://campus-hub-50uslxwj.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://campus-hub-50uslxwj.livekit.cloud
LIVEKIT_API_KEY=API8FvQaSdBe4Pp
LIVEKIT_API_SECRET=dsvrfH1KfzTb2c6ffCfsNBtseD91CtJJDC3pVZCQM76C
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
npm run build
npm run start
```

---

## 📱 Native Export to Android APK & iOS (Capacitor)

The codebase includes `capacitor.config.ts` pre-configured with App ID `com.campushub.app`.

### Export to Android APK (via Android Studio)
1. Build the production web bundle:
   ```bash
   npm run build
   ```
2. Add the Android platform (first time only):
   ```bash
   npx cap add android
   ```
3. Sync web assets:
   ```bash
   npx cap sync
   ```
4. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
5. In Android Studio:
   * Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   * Or run directly on your connected physical Android phone / emulator.

> **Camera & Mic Permissions**: Ensure `android/app/src/main/AndroidManifest.xml` includes:
> ```xml
> <uses-permission android:name="android.permission.CAMERA" />
> <uses-permission android:name="android.permission.RECORD_AUDIO" />
> <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
> ```

### Export to iOS (via Xcode)
1. Add the iOS platform (on macOS):
   ```bash
   npx cap add ios
   npx cap sync
   ```
2. Open in Xcode:
   ```bash
   npx cap open ios
   ```
3. In Xcode, ensure `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` are present in `Info.plist`.

---

## 🗄️ Optional Supabase PostgreSQL Schema
If you want persistent cloud storage for profiles, shoutouts, and custom rooms, run the SQL script located in `supabase/schema.sql` inside your [Supabase SQL Editor](https://app.supabase.com).

---

## 🛠️ Tech Stack
* **Framework**: Next.js 16 (App Router, Turbopack, React 19)
* **Realtime Video**: LiveKit Cloud (`livekit-client`, `@livekit/components-react`, `livekit-server-sdk`)
* **Database & Presence**: Supabase (`@supabase/supabase-js`)
* **Styling**: Tailwind CSS v4, Glassmorphism, Safe-Area insets
* **Icons & Animation**: Lucide Icons, Canvas Confetti
* **Mobile Runtime**: CapacitorJS (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)
