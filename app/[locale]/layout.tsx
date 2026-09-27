import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { Inter, Cairo } from "next/font/google"
import "../globals.css"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { WishlistProvider } from "@/lib/wishlist-context"
import { LanguageProvider } from "@/lib/language-context"
import { MarketProvider } from "@/lib/market-context"
import { Toaster } from "@/components/ui/sonner"
import { OfflineInitializer } from "@/components/offline-initializer"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { ThemeProvider } from "@/components/theme-provider"

// Import the wrapper we just created
import { GoogleProvider } from "@/components/google-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" })

type Locale = 'fr' | 'ar'

const locales: Locale[] = ['fr', 'ar']

/**
 * Next.js types the `[locale]` segment as `string`, so a layout declaring
 * `Promise<{ locale: Locale }>` is rejected by the generated route validator
 * (a narrower parameter than the one Next supplies). We therefore accept
 * `string` and narrow here — which also guards against a URL such as /de.
 */
function toLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : 'fr'
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: localeParam } = await params

  const titles = {
    fr: "TechGreen — Reconditionnement informatique & téléphonie à Lyon",
    ar: "TechGreen — تجديد معدات الحواسيب والهواتف في ليون"
  }

  const descriptions = {
    fr: "Rachat, réparation et reconditionnement de matériel informatique et de téléphones mobiles pour les entreprises. Une seconde vie éco-responsable pour votre parc IT.",
    ar: "شراء وإصلاح وتجديد معدات الحواسيب والهواتف المحمولة للشركات. حياة ثانية صديقة للبيئة لمعداتكم."
  }

  const locale = toLocale(localeParam)

  return {
    title: titles[locale],
    description: descriptions[locale],
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      ],
      shortcut: "/favicon.ico",
      // Opaque 180x180 — iOS renders transparency in a touch icon as black.
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    alternates: {
      languages: {
        'fr': '/fr',
        'ar': '/ar',
      },
    },
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a7a3a",
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale: localeParam } = await params
  const locale = toLocale(localeParam)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="alternate" hrefLang="fr" href={`/fr`} />
        <link rel="alternate" hrefLang="ar" href={`/ar`} />
        <link rel="alternate" hrefLang="x-default" href={`/fr`} />
        <Script
          src="/sw-register.js"
          strategy="afterInteractive"
          async
        />
      </head>
      <body className={`font-sans antialiased ${inter.variable} ${cairo.variable}`}>
        <GoogleProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider initialLocale={locale}>
              <MarketProvider>
                <AuthProvider>
                  <WishlistProvider>
                    <CartProvider>
                      <OfflineInitializer />
                      {children}
                      <Toaster position="top-right" />
                      <SyncStatusIndicator />
                    </CartProvider>
                  </WishlistProvider>
                </AuthProvider>
              </MarketProvider>
            </LanguageProvider>
          </ThemeProvider>
        </GoogleProvider>
      </body>
    </html>
  )
}