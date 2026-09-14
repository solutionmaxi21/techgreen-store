"use client"

import { useTheme } from "next-themes"
import { useEffect, useState, useCallback } from "react"

/**
 * ThemeSwitcher — Animated sun↔moon toggle.
 * All hooks MUST be called before any conditional return.
 */
export function ThemeSwitcher() {
  // ── ALL HOOKS HERE — no exceptions ──
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const cycleTheme = useCallback(() => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }, [theme, setTheme])

  // ── CONDITIONAL RENDER — after ALL hooks ──
  if (!mounted) {
    return (
      <div
        className="relative h-8 w-14 rounded-full bg-header-foreground/10 animate-pulse"
        aria-hidden="true"
      />
    )
  }

  const isDark = theme === "dark"
  const isSystem = theme === "system"
  const effectiveIsDark = isSystem ? systemDark : isDark

  const label = isSystem
    ? "Thème système"
    : effectiveIsDark
      ? "Mode sombre"
      : "Mode clair"

  return (
    <button
      onClick={cycleTheme}
      aria-label={`${label}. Cliquer pour changer de thème.`}
      title={label}
      className="relative h-8 w-14 rounded-full cursor-pointer
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-header-foreground/50
                 transition-colors duration-200"
      style={{
        backgroundColor: effectiveIsDark
          ? "oklch(0.30 0.04 260 / 0.4)"
          : "oklch(0.90 0.08 80 / 0.6)",
      }}
    >
      {/* Thumb */}
      <div
        className="absolute top-0.5 h-7 w-7 rounded-full bg-card shadow-md
                   flex items-center justify-center
                   transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: effectiveIsDark ? "26px" : "4px" }}
      >
        {/* Sun */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{
            opacity: effectiveIsDark ? 0 : 1,
            transform: effectiveIsDark
              ? "scale(0.3) rotate(-90deg)"
              : "scale(1) rotate(0deg)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-500" aria-hidden="true">
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="12"
                y1="12"
                x2={String(12 + 9 * Math.cos((angle * Math.PI) / 180))}
                y2={String(12 + 9 * Math.sin((angle * Math.PI) / 180))}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        {/* Moon */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{
            opacity: effectiveIsDark ? 1 : 0,
            transform: effectiveIsDark
              ? "scale(1) rotate(0deg)"
              : "scale(0.3) rotate(90deg)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-200" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
            <circle cx="19" cy="5" r="1" fill="currentColor" opacity="0.8" />
            <circle cx="21" cy="10" r="0.6" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
      </div>
      {/* System indicator */}
      {isSystem && (
        <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-header-foreground/60" title="Thème système" />
      )}
    </button>
  )
}
