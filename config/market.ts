/**
 * Market configuration — countries, currencies, conversion rates and the
 * per-country commercial settings that drive the checkout.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH FOR MONEY
 * ─────────────────────────────────────────────────────────────────────────────
 * `BASE_CURRENCY` is the currency in which ALL amounts are stored in the
 * database (product prices, order totals, shipping costs, discount amounts).
 * Nothing else in the codebase may assume a currency: every displayed amount
 * goes through `lib/currency.ts`, which converts from the base currency to the
 * visitor's currency using `EXCHANGE_RATES` below.
 *
 * Never write a conversion anywhere else. Never store a converted amount.
 *
 * ⚠️  TODO — DATA MIGRATION REQUIRED BEFORE GO-LIVE
 * The catalogue and the existing order rows were authored for the previous
 * Algerian store and are therefore almost certainly denominated in DZD, not in
 * the `BASE_CURRENCY` declared here. Re-base those amounts (or confirm the base
 * currency) before serving real customers, otherwise every converted price will
 * be off by the EUR/DZD rate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH FOR COMMERCIAL GEOGRAPHY
 * ─────────────────────────────────────────────────────────────────────────────
 * The visitor's country drives: currency, the region/province field, the
 * postal-code field, the shipping methods, the payment methods, the VAT
 * display and — through `checkoutMode` — whether checkout is possible at all.
 *
 * ADDING A NEW COUNTRY
 * 1. Add a `CURRENCIES` entry if its currency is not listed yet.
 * 2. Add an `EXCHANGE_RATES` entry (or set it via `NEXT_PUBLIC_EXCHANGE_RATES`).
 * 3. Add a `MARKETS` entry. Start with `checkoutMode: 'unavailable'` — that is
 *    the safe state: the storefront will show the visitor an honest notice
 *    instead of inventing a delivery fee.
 * 4. Flip it to `'carrier'` only once the shipping methods below correspond to
 *    a carrier integration the backend actually implements.
 *
 * DO NOT invent shipping fees, delivery windows, tax rates or return policies.
 * Anything the business has not published stays `null` / disabled here and is
 * configured in the administration instead.
 */

export type Locale = 'fr' | 'ar'

/**
 * The currency every amount in the database is expressed in.
 * Changing this constant changes the meaning of every stored price.
 */
export const BASE_CURRENCY = 'EUR'

export interface CurrencyDef {
  /** ISO 4217 code */
  code: string
  symbol: string
  label: Record<Locale, string>
  /** Fraction digits used when formatting */
  decimals: number
  /** BCP-47 locale used for `Intl.NumberFormat` grouping/separators */
  locale: string
}

export const CURRENCIES: Record<string, CurrencyDef> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: { fr: 'Euro', ar: 'يورو' },
    decimals: 2,
    locale: 'fr-FR',
  },
  DZD: {
    code: 'DZD',
    symbol: 'دج',
    label: { fr: 'Dinar algérien', ar: 'دينار جزائري' },
    decimals: 0,
    locale: 'fr-DZ',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: { fr: 'Dollar américain', ar: 'دولار أمريكي' },
    decimals: 2,
    locale: 'en-US',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    label: { fr: 'Livre sterling', ar: 'جنيه إسترليني' },
    decimals: 2,
    locale: 'en-GB',
  },
  MAD: {
    code: 'MAD',
    symbol: 'DH',
    label: { fr: 'Dirham marocain', ar: 'درهم مغربي' },
    decimals: 2,
    locale: 'fr-MA',
  },
  TND: {
    code: 'TND',
    symbol: 'DT',
    label: { fr: 'Dinar tunisien', ar: 'دينار تونسي' },
    decimals: 3,
    locale: 'fr-TN',
  },
}

/**
 * Exchange rates FROM the base currency TO each currency.
 * `EXCHANGE_RATES[X]` = how many units of X one unit of BASE_CURRENCY buys.
 *
 * ⚠️  PLACEHOLDER VALUES — these are not financial advice and are not live
 * market rates. They MUST be reviewed and kept up to date by the business.
 * Either edit the numbers here, or override them at deploy time with the
 * `NEXT_PUBLIC_EXCHANGE_RATES` environment variable (a JSON object), which lets
 * you refresh rates without a code change.
 */
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  EUR: 1,
  DZD: 145,
  USD: 1.08,
  GBP: 0.85,
  MAD: 10.8,
  TND: 3.4,
}

function readEnvRates(): Record<string, number> {
  const raw = process.env.NEXT_PUBLIC_EXCHANGE_RATES
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const clean: Record<string, number> = {}
    for (const [code, value] of Object.entries(parsed)) {
      const rate = Number(value)
      if (Number.isFinite(rate) && rate > 0) clean[code] = rate
    }
    return clean
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[market] NEXT_PUBLIC_EXCHANGE_RATES is not valid JSON — using defaults')
    }
    return {}
  }
}

export const EXCHANGE_RATES: Record<string, number> = {
  ...DEFAULT_EXCHANGE_RATES,
  ...readEnvRates(),
}

/** Where the list of regions/provinces for a country comes from. */
export type RegionSource = 'fr-departments' | 'dz-wilayas' | 'none'

/**
 * Whether an order can actually be completed in a market.
 *
 * - `'carrier'`      the backend implements a live shipping quote for this
 *                    country, so the checkout can compute a real total.
 * - `'unavailable'`  no carrier is configured for this country yet. The
 *                    checkout refuses to place the order and tells the visitor
 *                    so, instead of inventing a delivery fee or silently
 *                    creating an order with zero shipping. This is the correct
 *                    state for a country whose delivery policy the business has
 *                    not yet published.
 */
export type CheckoutMode = 'carrier' | 'unavailable'

/** Phone validation rules for a market's address form. */
export interface PhoneRules {
  /**
   * Accepted formats, as regex sources tested against the input with spaces,
   * dashes and parentheses removed. The value is accepted if ANY pattern
   * matches.
   */
  patterns: string[]
  /** Placeholder shown inside the phone input. */
  placeholder: string
  /** Short example shown under the field. */
  hint: Record<Locale, string>
  /** Message shown when the value matches no pattern. */
  error: Record<Locale, string>
}

export interface MarketDef {
  /** ISO 3166-1 alpha-2 country code */
  code: string
  /**
   * Country name in English, used verbatim as the `country` field of the
   * order's shipping address. Kept separate from `name` (which is localized
   * for display) so the value persisted on orders is stable.
   */
  countryName: string
  name: Record<Locale, string>
  /** Currency this market is billed in */
  currency: string
  /** Locale used for number and date formatting in this market */
  locale: string
  /** Which region dataset the address form should offer */
  regionSource: RegionSource
  /** Label used for the region field in the address form */
  regionLabel: Record<Locale, string>
  /** Label used for the postal-code field */
  postalCodeLabel: Record<Locale, string>
  /**
   * Shipping method identifiers actually offered in this market.
   * These map to the shipping options returned by the backend for the country.
   */
  shippingMethods: string[]
  /**
   * Payment method identifiers offered in this market.
   * `cod` is the only method currently implemented by the backend.
   */
  paymentMethods: string[]
  /** Whether the checkout can complete, or must show an honest notice. */
  checkoutMode: CheckoutMode
  /** Phone validation for this market's address form. */
  phone: PhoneRules
  /**
   * Tax display configuration.
   *
   * Left `null` on purpose: the business has not published a VAT policy, and
   * the backend stores `tax_amount = 0`. Do NOT invent a rate — set it in the
   * administration once the applicable tax rules are confirmed.
   */
  vat: { enabled: boolean; rate: number | null }
}

export const MARKETS: Record<string, MarketDef> = {
  FR: {
    code: 'FR',
    countryName: 'France',
    name: { fr: 'France', ar: 'فرنسا' },
    currency: 'EUR',
    locale: 'fr-FR',
    // No French region dataset is implemented. `regionSource: 'none'` makes the
    // address form fall back to a free-text region field. Implement
    // `'fr-departments'` in the address form before switching it on.
    regionSource: 'none',
    regionLabel: { fr: 'Région', ar: 'المنطقة' },
    postalCodeLabel: { fr: 'Code postal', ar: 'الرمز البريدي' },
    shippingMethods: [],
    paymentMethods: ['cod'],
    // ⚠️  DELIBERATELY BLOCKED. TechGreen has not published a delivery policy
    // for France, and no French carrier is integrated in the backend. Enabling
    // this requires: (a) a real carrier integration or a published fee grid,
    // and (b) filling `shippingMethods` above. Until then the checkout tells
    // the visitor to contact us rather than guessing a delivery cost.
    checkoutMode: 'unavailable',
    phone: {
      // Generic international format — not a French-specific policy, just a
      // sanity check that the value is plausibly a phone number.
      patterns: ['^\\+?[0-9][0-9\\s\\-().]{6,19}$'],
      placeholder: '+33 6 12 34 56 78',
      hint: {
        fr: 'Exemple : +33 6 12 34 56 78',
        ar: 'مثال: ‎+33 6 12 34 56 78',
      },
      error: {
        fr: 'Numéro de téléphone invalide. Indiquez un numéro joignable, avec son indicatif pays.',
        ar: 'رقم هاتف غير صالح. يرجى إدخال رقم يمكن الاتصال به مع رمز الدولة.',
      },
    },
    vat: { enabled: false, rate: null },
  },
  DZ: {
    code: 'DZ',
    countryName: 'Algeria',
    name: { fr: 'Algérie', ar: 'الجزائر' },
    currency: 'DZD',
    locale: 'fr-DZ',
    regionSource: 'dz-wilayas',
    regionLabel: { fr: 'Wilaya', ar: 'الولاية' },
    postalCodeLabel: { fr: 'Code postal', ar: 'الرمز البريدي' },
    shippingMethods: ['standard', 'pickup'],
    paymentMethods: ['cod'],
    // The only market with a live carrier integration (wilayas / communes /
    // stop-desks, quoted by the shipping API).
    checkoutMode: 'carrier',
    phone: {
      // 05XX / 06XX / 07XX, local or international form.
      patterns: [
        '^\\+213[567]\\d{8}$',
        '^00213[567]\\d{8}$',
        '^0[567]\\d{8}$',
      ],
      placeholder: '0555 12 34 56',
      hint: {
        fr: 'Exemple: 0555 12 34 56 ou +213 555 12 34 56',
        ar: 'مثال: 0555 12 34 56 أو ‎+213 555 12 34 56',
      },
      error: {
        fr: 'Numéro de téléphone algérien invalide (05XX, 06XX, 07XX)',
        ar: 'رقم هاتف جزائري غير صالح (05XX، 06XX، 07XX)',
      },
    },
    vat: { enabled: false, rate: null },
  },
}

/**
 * Market used when the visitor's country cannot be determined, or when it has
 * no `MARKETS` entry.
 *
 * Set to `DZ` on purpose: it is the only market whose checkout can actually
 * complete, and whose currency matches the amounts currently stored in the
 * database. Pointing the fallback at a market with `checkoutMode:
 * 'unavailable'` would send every undetected visitor to a checkout that cannot
 * take their order.
 *
 * Revisit this once the catalogue has been re-based to `BASE_CURRENCY` and a
 * second market is live.
 */
export const FALLBACK_MARKET = 'DZ'

/** Cookie the proxy sets from the request's country header. */
export const COUNTRY_COOKIE = 'TG_COUNTRY'

/** localStorage key holding a visitor's manual country override. */
export const COUNTRY_OVERRIDE_KEY = 'TG_COUNTRY_OVERRIDE'

/**
 * Order value (in `BASE_CURRENCY`) above which the Algerian carrier insures the
 * parcel. Only used on the `'carrier'` checkout path.
 *
 * ⚠️  This threshold was authored for the previous Algerian store, where prices
 * were denominated in DZD. It must be re-expressed in `BASE_CURRENCY` at the
 * same time as the price migration described at the top of this file. The
 * backend has its own copy of this number in `backend/routes/orders-v2.js`.
 */
export const CARRIER_INSURANCE_THRESHOLD_BASE = 50000

export function getMarket(countryCode: string | undefined | null): MarketDef {
  if (!countryCode) return MARKETS[FALLBACK_MARKET]
  return MARKETS[countryCode.toUpperCase()] ?? MARKETS[FALLBACK_MARKET]
}

export function getCurrencyDef(currencyCode: string | undefined | null): CurrencyDef {
  return CURRENCIES[(currencyCode ?? BASE_CURRENCY).toUpperCase()] ?? CURRENCIES[BASE_CURRENCY]
}

/** Countries a visitor may switch to manually. */
export const SELECTABLE_MARKETS: MarketDef[] = Object.values(MARKETS)

/**
 * Test a phone number against a market's rules.
 * Spaces, dashes and parentheses are stripped before matching, so users can
 * type the number however they are used to.
 */
export function isValidPhoneForMarket(phone: string, market: MarketDef): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return market.phone.patterns.some((pattern) => new RegExp(pattern).test(cleaned))
}
