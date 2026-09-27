"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  BASE_CURRENCY,
  COUNTRY_COOKIE,
  COUNTRY_OVERRIDE_KEY,
  SELECTABLE_MARKETS,
  getMarket,
  type MarketDef,
} from "@/config/market"
import { formatMoney, setActiveCurrency } from "@/lib/currency"

interface MarketContextType {
  /** Active market (country) — detected from the visitor, or manually chosen. */
  market: MarketDef
  /** Currency the active market is billed in. */
  currency: string
  /** Every market a visitor may switch to. */
  markets: MarketDef[]
  /** True when the visitor overrode the detected country themselves. */
  isManual: boolean
  /** Switch country. Persists the choice for subsequent visits. */
  setCountry: (countryCode: string) => void
  /** Clear a manual override and fall back to detection. */
  resetCountry: () => void
  /**
   * Format an amount held in the base currency for display in the active
   * market's currency. This is what pages should use.
   */
  formatMoney: (amountInBase: number, options?: { hideSymbol?: boolean; showCode?: boolean }) => string
}

const MarketContext = createContext<MarketContextType | undefined>(undefined)

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function MarketProvider({
  children,
  initialCountry,
}: {
  children: React.ReactNode
  /** Country detected server-side (proxy header) for the first render. */
  initialCountry?: string
}) {
  const [override, setOverride] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Pick up a previously chosen country on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COUNTRY_OVERRIDE_KEY)
      if (stored) setOverride(stored)
    } catch {
      /* localStorage unavailable (private mode) — detection still works */
    }
    setHydrated(true)
  }, [])

  // `hydrated` gates every client-only source (cookie, localStorage) so that the
  // first client render matches the server's, and React does not report a
  // hydration mismatch. Before hydration the fallback market is used on both.
  const detected = initialCountry || readCookie(COUNTRY_COOKIE) || undefined
  const effectiveCode = hydrated ? override || detected : initialCountry
  const market = useMemo(() => getMarket(effectiveCode), [effectiveCode])

  const setCountry = useCallback((countryCode: string) => {
    const code = countryCode.toUpperCase()
    setOverride(code)
    try {
      localStorage.setItem(COUNTRY_OVERRIDE_KEY, code)
    } catch {
      /* ignore */
    }
    // Keep the cookie in sync so the server renders the right market on reload.
    document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=31536000`
  }, [])

  const resetCountry = useCallback(() => {
    setOverride(null)
    try {
      localStorage.removeItem(COUNTRY_OVERRIDE_KEY)
    } catch {
      /* ignore */
    }
    document.cookie = `${COUNTRY_COOKIE}=; path=/; max-age=0`
  }, [])

  const currency = market.currency || BASE_CURRENCY

  // Publish the active currency for `formatPrice()` before children render, so
  // that non-hook call sites format in the right currency on the first paint.
  setActiveCurrency(currency, market.locale)

  const value: MarketContextType = {
    market,
    currency,
    markets: SELECTABLE_MARKETS,
    isManual: Boolean(hydrated && override),
    setCountry,
    resetCountry,
    formatMoney: (amountInBase, options) =>
      formatMoney(amountInBase, currency, market.locale, options),
  }

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (context === undefined) {
    throw new Error("useMarket must be used within a MarketProvider")
  }
  return context
}
