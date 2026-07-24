"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminPanel from "@/components/AdminPanel";
import HomepageContent from "@/components/HomepageContent";
import { DEFAULT_SETTINGS, getFontOption, type ProfileSettings } from "@/lib/types";

// CloudBackground uses three.js + WebGL — must be client-only and
// deferred to avoid SSR / hydration issues.
const CloudBackground = dynamic(() => import("@/components/CloudBackground"), {
  ssr: false,
});

export default function Home() {
  const [settings, setSettings] = useState<ProfileSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Fetch settings on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled && j?.settings) {
          setSettings(j.settings);
          if (typeof document !== "undefined" && j.settings.pageTitle) {
            document.title = j.settings.pageTitle;
          }
        }
      } catch {
        // ignore — fall back to defaults
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep document title in sync.
  useEffect(() => {
    if (settings.pageTitle) document.title = settings.pageTitle;
  }, [settings.pageTitle]);

  // Load web font stylesheet when a web-font family is selected.
  // We track loaded URLs to avoid injecting duplicates, and we inject
  // <link rel="stylesheet"> tags into <head> (the browser dedupes by href
  // automatically, so this is safe across re-renders).
  useEffect(() => {
    const font = getFontOption(settings.fontFamilyId);
    if (!font.webFontUrl) return;
    if (typeof document === "undefined") return;
    const id = `webfont-${font.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = font.webFontUrl;
    document.head.appendChild(link);
  }, [settings.fontFamilyId]);

  const handleSettingsChange = useCallback((s: ProfileSettings) => {
    setSettings(s);
  }, []);

  // Resolve the current font's CSS family for the main container.
  const fontOption = getFontOption(settings.fontFamilyId);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: "transparent",
        fontFamily: fontOption.cssFamily,
      }}
    >
      {/* 1:1 cloud + sky background */}
      <CloudBackground
        skyThemeId={settings.skyThemeId}
        useCustomSky={settings.useCustomSky}
        customSky={settings.customSky}
        cloudDensity={settings.cloudDensity}
        cloudSpeed={settings.cloudSpeed}
      />

      {/* Visible homepage content (avatar / signature / links / footer) */}
      <HomepageContent settings={settings} />

      {/* Admin panel (gear icon top-left, click to open) */}
      <AdminPanel settings={settings} onSettingsChange={handleSettingsChange} />

      {/* Subtle loading veil before first settings fetch completes */}
      {!loaded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30,72,119,0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 14,
            opacity: 0,
            pointerEvents: "none",
            transition: "opacity .4s",
          }}
        />
      )}
    </main>
  );
}
