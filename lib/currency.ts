/**
 * Currency conversion and formatting.
 *
 * ALL amounts coming out of the database are in `BASE_CURRENCY`
 * (see `config/market.ts`). Everything the user sees goes through this module.
 * This is the only place in the codebase where a conversion happens.
 */

import {
  BASE_CURRENCY,
  EXCHANGE_RATES,
  getCurrencyDef,
  type CurrencyDef,
} from '@/config/market'

/**
 * Convert an amount expressed in the base currency into `targetCurrency`.
 *
 * Amounts are NEVER stored converted — convert only for display, or when
 * handing a figure to a payment/logistics provider that expects a specific
 * currency (and record the currency alongside it when you do).
 */
export function convertFromBase(amountInBase: number, targetCurrency: string): number {
  if (!Number.isFinite(amountInBase)) return 0
  const code = (targetCurrency || BASE_CURRENCY).toUpperCase()
  if (code === BASE_CURRENCY) return amountInBase
  const rate = EXCHANGE_RATES[code]
  // Unknown currency: return the base amount untouched rather than a wrong number.
  if (!Number.isFinite(rate) || rate <= 0) return amountInBase
  return amountInBase * rate
}

export interface FormatMoneyOptions {
  /** Format without the currency symbol (e.g. for compact stat tiles). */
  hideSymbol?: boolean
  /** Show the ISO code instead of the symbol (e.g. "1 234 DZD"). */
  showCode?: boolean
  /** Minimum fraction digits; defaults to the currency's own setting. */
  minimumFractionDigits?: number
  /** Maximum fraction digits; defaults to the currency's own setting. */
  maximumFractionDigits?: number
}

/**
 * Format an amount held in the base currency for display in `currencyCode`.
 *
 * @param amountInBase amount as stored in the database (in BASE_CURRENCY)
 * @param currencyCode currency to display, e.g. the active market's currency
 * @param locale       BCP-47 locale for separators; falls back to the currency's
 */
export function formatMoney(
  amountInBase: number,
  currencyCode: string,
  locale?: string,
  options: FormatMoneyOptions = {},
): string {
  const def: CurrencyDef = getCurrencyDef(currencyCode)
  const converted = convertFromBase(amountInBase, def.code)

  const formatted = new Intl.NumberFormat(locale || def.locale, {
    style: 'decimal',
    minimumFractionDigits: options.minimumFractionDigits ?? def.decimals,
    maximumFractionDigits: options.maximumFractionDigits ?? def.decimals,
  }).format(converted)

  if (options.hideSymbol) return formatted
  if (options.showCode) return `${formatted} ${def.code}`
  return `${formatted} ${def.symbol}`
}

/** Localised name of a currency, for the country/currency switcher. */
export function getCurrencyLabel(currencyCode: string, locale: 'fr' | 'ar' = 'fr'): string {
  return getCurrencyDef(currencyCode).label[locale]
}

/* ---------------------------------------------------------------------------
 * Active display currency
 *
 * `formatPrice()` (lib/utils.ts) is called from ~40 places, most of them deep
 * inside presentational components with no access to React context. Rather than
 * thread the currency through every one of them, `MarketProvider` publishes the
 * active currency here, and `formatPrice` reads it. There is still exactly ONE
 * conversion implementation (`convertFromBase`) and exactly one place that
 * decides which currency is active.
 *
 * This is module-level state, so it must only ever be written by the single
 * `MarketProvider` instance at the root of the app.
 * ------------------------------------------------------------------------- */

let activeCurrencyCode: string = BASE_CURRENCY
let activeFormatLocale: string | undefined

/** Called by `MarketProvider` whenever the active market changes. */
export function setActiveCurrency(currencyCode: string, locale?: string): void {
  activeCurrencyCode = (currencyCode || BASE_CURRENCY).toUpperCase()
  activeFormatLocale = locale
}

/** The currency every `formatPrice()` call currently renders in. */
export function getActiveCurrency(): string {
  return activeCurrencyCode
}

/** Currency-aware formatting for call sites that cannot use `useMarket()`. */
export function formatActivePrice(amountInBase: number): string {
  return formatMoney(amountInBase, activeCurrencyCode, activeFormatLocale)
}
