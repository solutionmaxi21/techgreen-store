"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

interface ThemeLogoProps {
  lightSrc?: string
  darkSrc?: string
  alt?: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/**
 * Theme-aware logo component.
 * Switches between light/dark logo based on current theme.
 * Falls back to lightSrc if no darkSrc provided.
 */
export function ThemeLogo({
  lightSrc = "/logo-light.jpg",
  darkSrc = "/logo-dark.png",
  alt = "Tech Green Logo",
  width = 140,
  height = 45,
  className = "h-10 w-auto object-contain",
  priority = false,
}: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // During SSR / before mount, show light version to avoid hydration mismatch
  const src = mounted && resolvedTheme === "dark" ? darkSrc : lightSrc

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}

/**
 * Always-dark logo variant for use on dark backgrounds (header, footer).
 * No theme switching needed — the background is always dark.
 */
export function DarkBgLogo({
  src = "/logo-dark.png",
  alt = "Tech Green Logo",
  width = 140,
  height = 45,
  className = "h-10 w-auto object-contain",
  priority = false,
}: {
  src?: string
  alt?: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}
