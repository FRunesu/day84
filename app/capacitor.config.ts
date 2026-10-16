/**
 * Day84 — Capacitor Configuration
 * ------------------------------------------------------------------
 * webDir points at the Vite build output. After `npm run build`,
 * run `npx cap sync` to copy that output into the native ios/
 * and android/ projects.
 *
 * Deliberately NOT configured here: any Service Worker / PWA
 * plugin. The web build registers sw.js itself (see App.svelte),
 * gated on NOT running inside a native Capacitor shell — see the
 * isNativeBuild check there. Nothing native-specific is needed in
 * this config file to enforce that; it's handled in app code.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.day84.app",
  appName: "Day84",
  webDir: "dist",
  backgroundColor: "#0d1117",
  ios: {
    contentInset: "automatic",
  },
  android: {
    backgroundColor: "#0d1117",
  },
};

export default config;
