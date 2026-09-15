# 🔍 AUDIT COMPLET — STORE TECH-GREEN

## A. ARCHITECTURE ACTUELLE

### Frontend (Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui)
```
app/
├── layout.tsx                          # Root layout (passthrough)
├── globals.css                         # Design tokens (oklch), Quill CSS, animations
├── error.tsx                           # Global error boundary
├── offline/page.tsx                    # PWA offline fallback
├── api/contact/route.ts                # Contact form API route
├── api/revalidate/route.ts             # ISR revalidation
└── [locale]/                           # FR/AR i18n routing
    ├── layout.tsx                      # Main layout (providers, fonts, metadata)
    ├── page.tsx + page-client.tsx      # Homepage (duplicate!)
    ├── store/page.tsx + loading.tsx    # Product catalog (loading = empty)
    ├── product/[slug]/page.tsx         # Product detail page
    ├── cart/page.tsx                   # Shopping cart
    ├── checkout/page.tsx               # Checkout flow
    ├── login/page.tsx                  # Login
    ├── signup/page.tsx                 # Registration
    ├── account/page.tsx                # User account
    ├── orders/page.tsx                 # Order history
    ├── orders/[id]/page.tsx            # Order detail
    ├── favorites/page.tsx              # Wishlist
    ├── collections/page.tsx            # Collections listing
    ├── collections/[slug]/page.tsx     # Collection detail
    ├── deals/page.tsx                  # Promotions/deals
    ├── about/page.tsx                  # About page
    ├── contact/page.tsx                # Contact page
    ├── faq/page.tsx                    # FAQ
    ├── shipping/page.tsx               # Shipping info
    ├── returns/page.tsx                # Returns policy
    ├── warranty/page.tsx               # Warranty info
    ├── privacy/page.tsx                # Privacy policy
    ├── terms/page.tsx                  # Terms of service
    ├── notifications/page.tsx          # User notifications
    ├── forgot-password/page.tsx        # Password reset request
    ├── reset-password/page.tsx         # Password reset form
    ├── verify-email/page.tsx           # Email verification
    └── not-found.tsx                   # 404 page

components/
├── header.tsx                          # Main header (top bar + search + nav)
├── footer.tsx                          # Footer (links + contact)
├── hero-section.tsx                    # Hero carousel/slideshow
├── hero-slide.tsx                      # Individual hero slide
├── product-card.tsx                    # Product card (grid item)
├── category-card.tsx                   # Category card
├── collection-card.tsx                 # Collection card
├── collections-section.tsx             # Homepage collections grid
├── review-form.tsx                     # Review submission form
├── order-tracking.tsx                  # Order tracking widget
├── localized-link.tsx                  # i18n-aware link
├── theme-provider.tsx                  # Dark mode provider
├── google-provider.tsx                 # Google OAuth provider
├── offline-initializer.tsx             # PWA offline init
├── sync-status-indicator.tsx           # Offline sync indicator
├── notifications/NotificationCenter.tsx # Notification center
└── ui/                                 # 40+ shadcn/ui components

lib/
├── api/                                # API layer
│   ├── client.ts                       # HTTP client (cookies, CSRF, token refresh)
│   ├── base-url.ts                     # API base URL config
│   ├── auth.ts                         # Authentication API
│   ├── products.ts                     # Products API
│   ├── categories.ts                   # Categories API
│   ├── collections.ts                  # Collections API
│   ├── orders.ts                       # Orders API
│   ├── reviews.ts                      # Reviews API
│   ├── promotions.ts                   # Promotions API
│   ├── users.ts                        # Users API
│   ├── shipping.ts                     # Shipping API
│   └── index.ts                        # Re-exports
├── auth-context.tsx                    # Auth state management
├── cart-context.tsx                    # Cart state (IndexedDB + localStorage)
├── wishlist-context.tsx                # Wishlist state
├── language-context.tsx                # i18n context
├── translations.ts                     # FR translations
├── translations-ar.ts                  # AR translations
├── utils.ts                            # Utility functions
├── constants.ts                        # App constants
├── share-utils.ts                      # Social sharing
├── cache/api-cache.ts                  # API response caching
├── db/offline-store.ts                 # Dexie IndexedDB
├── sync/sync-manager.ts                # Offline sync manager
├── crypto/hmac-signer.ts              # Encryption for offline data
└── logger.ts                           # Logger

hooks/
├── use-locale.ts
├── use-mobile.ts
├── use-toast.ts
└── useProtectedRoute.ts

config/
├── constants.ts                        # Contact info, company info
└── socialLinks.ts                      # Social media links

database/                               # Static JSON data files (shipping, etc.)
```

### Backend (Express.js + Prisma + PostgreSQL)
```
routes/
├── auth-v2.js
├── products-v2.js (storefront endpoints)
├── categories-v2.js
├── collections-v2.js
├── orders-v2.js
├── order-history-v2.js
├── favorites-v2.js
├── promotions-v2.js
├── returns-v2.js
├── inventory-v2.js
├── dashboard-v2.js
├── barcode-v2.js
├── constants-v2.js
├── database-v2.js
├── metadata-v2.js
└── notifications.js

prisma/schema.prisma — 20+ models
```

---

## B. PROBLÈMES FRONT ↔ BACK

### ✅ Ce qui fonctionne
1. **API Client** — Cookie-based auth, token refresh, CSRF, request queuing = ROBUSTE
2. **Products** — `productsApi.getAll()`, `getById()`, `getFeatured()`, `getNew()` → connectés au storefront backend
3. **Categories** — `categoriesApi.getAll()`, `getById()`, `getBySlug()` → connectées
4. **Collections** — `collectionsApi.getAll()`, `getBySlug()` → connectées
5. **Promotions** — `promotionsApi.getActive()`, `validate()` → connectées
6. **Reviews** — `reviewsApi.getByProductId()` → connectées
7. **Orders** — `ordersApi` → connectées (auth required)
8. **Cart** — Context-based with IndexedDB persistence + offline sync
9. **Auth** — Full flow: login, signup, forgot/reset password, email verify, Google OAuth
10. **i18n** — FR/AR with RTL support, bilingual DB fields

### ⚠️ Problèmes identifiés
1. **Duplicate `page.tsx` + `page-client.tsx`** — Homepage has both server and client versions; `page.tsx` is a pure client component despite being in the page slot (creates unnecessary re-renders)
2. **`store/loading.tsx` is empty** — Returns `null`, no skeleton loading state
3. **`getLocalizedName` duplicated 8+ times** — Should be a single utility in `lib/utils.ts`
4. **Product names from API are `string` in DB but `BilingualString` in frontend type** — Prisma schema has `product_name String` but frontend expects `{ fr, ar }`. The API layer must be transforming these.
5. **No proper loading skeletons** — All pages show a spinner, no skeleton UI
6. **`error.tsx` is minimal** — No branded error page
7. **Product card stock display is hardcoded** — Uses `text-green-600` without considering design system
8. **Some pages mix `container mx-auto px-4` with `<Container>` component** — Inconsistent container usage

---

## C. ANALYSE TECH-GREEN (https://www.tech-green.fr/)

### Brand Identity
- **Type**: E-commerce B2B/B2C informatique en Algérie (même secteur que le Store)
- **Positionnement**: Professionnel, technique, fiable, premium
- **Perception**: Serious tech retailer, not budget/generic

### Couleurs
| Rôle | Couleur | HEX approximatif |
|------|---------|------------------|
| Primary (vert profond) | Dark Green | `#1a7a3a` / `#1B7A3D` |
| Primary hover | Lighter Green | `#15803d` / `#15A34A` |
| Secondary/Accent | Bright Green | `#22C55E` / `#16A34A` |
| Background | White | `#FFFFFF` |
| Surface/Cards | Off-white | `#F9FAFB` / `#F8FAF9` |
| Text primary | Near-black | `#111827` / `#1A1A2E` |
| Text secondary | Gray | `#6B7280` |
| Border | Light gray | `#E5E7EB` / `#F0F0F0` |
| Success | Green | `#22C55E` |
| Error/Destructive | Red | `#EF4444` |
| Warning | Amber | `#F59E0B` |
| CTA/Hover accent | Light green | `#DCFCE7` |

### Typographie
- **Font**: Inter (ou similaire clean sans-serif)
- **Weights**: 400 (body), 500 (medium), 600 (semibold), 700 (bold)
- **Line-height**: 1.5-1.6 (body), 1.2-1.3 (headings)
- **Letter-spacing**: Tight for headings, normal for body

### Layout
- **Max width**: ~1200-1280px
- **Grid**: 4 columns desktop, 2 columns tablet, 1-2 columns mobile
- **Spacing**: Generous padding (p-6 to p-8 sections), tight component spacing
- **Cards**: Subtle borders, slight rounded corners (8-12px), minimal shadow
- **Shadows**: Very subtle, almost flat design

### UI Components
- **Header**: Clean white, minimal top bar, prominent search, green CTAs
- **Cards**: Clean white bg, subtle border, product image top, info below
- **Buttons**: Rounded-md, green primary, clean typography
- **Badges**: Small, rounded-full, green for "new", red for discounts
- **Nav**: Horizontal category pills/tabs
- **Footer**: Dark bg, multi-column, green accents

### Design Language Key Traits
1. **Clean & Minimal** — No visual clutter
2. **Professional** — Serious tech aesthetic
3. **Green-forward** — Green is the hero color, used strategically
4. **High contrast** — White bg + dark text + green accents
5. **Spacious** — Generous whitespace
6. **Modern** — Subtle shadows, clean lines, no heavy borders

---

## D. DESIGN SYSTEM PROPOSÉ

### Colors (Tech-Green inspired)
```css
:root {
  /* Primary - Tech Green */
  --primary: oklch(0.55 0.17 155);          /* #1a7a3a deep green */
  --primary-foreground: oklch(1 0 0);        /* white */

  /* Secondary - Accent Green */
  --secondary: oklch(0.72 0.19 155);         /* #22C55E bright green */
  --secondary-foreground: oklch(1 0 0);      /* white */

  /* Background & Surfaces */
  --background: oklch(1 0 0);                /* pure white */
  --card: oklch(1 0 0);                      /* white cards */
  --popover: oklch(1 0 0);

  /* Text */
  --foreground: oklch(0.15 0.01 260);        /* near-black */
  --muted: oklch(0.97 0.005 155);            /* very light green-gray */
  --muted-foreground: oklch(0.5 0.01 260);   /* gray */

  /* Borders & Input */
  --border: oklch(0.92 0.005 155);           /* subtle green-tinted border */
  --input: oklch(0.92 0.005 155);
  --ring: oklch(0.55 0.17 155);              /* green focus ring */

  /* Destructive */
  --destructive: oklch(0.58 0.22 27);        /* red */
  --destructive-foreground: oklch(1 0 0);

  /* Accent (reserved for highlights) */
  --accent: oklch(0.95 0.03 155);            /* very light green */
  --accent-foreground: oklch(0.15 0.01 260);

  /* Radius */
  --radius: 0.5rem;                          /* 8px - clean modern */
}
```

### Typography
```
Font: Inter (existing) + Cairo for Arabic (existing)
Headings: font-bold, tracking-tight
Body: font-normal, leading-relaxed
Small: text-sm (14px), text-xs (12px)
```

### Spacing Scale
```
Section: py-16 md:py-20
Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Card gap: gap-4 md:gap-6
Component padding: p-4 to p-6
```

### Border Radius
```
Cards: rounded-xl (12px)
Buttons: rounded-lg (8px)
Badges: rounded-full
Inputs: rounded-lg (8px)
Images: rounded-xl (12px)
```

### Shadows
```
Card default: shadow-sm (barely visible)
Card hover: shadow-md (subtle lift)
Modal: shadow-xl
```

---

## E. PLAN DE REFONTE

### Phase 1: Design System Foundation ✅ COMPLETED
1. ✅ Update `globals.css` — New color tokens (green oklch palette, light + dark)
2. ✅ Update shadcn/ui component variants — Auto via CSS variables
3. ✅ Extract `getLocalizedName` to `lib/utils.ts` — Centralized, removed 8+ duplicates
4. ✅ Update `themeColor` in layout.tsx — `#1a7a3a`

### Phase 2: Layout Global ✅ COMPLETED
5. ✅ Header redesign — Green top bar, blur nav, shadow-sm, clean accents
6. ✅ Footer redesign — Dark `bg-foreground`, green social icons, text-primary contacts
7. ✅ All 40+ components auto-updated via CSS variable changes

### Phase 3: Homepage & Components ✅ COMPLETED
8. ✅ Hero section — Reduced heights, rounded-xl, green dot indicators
9. ✅ Hero slide CTAs — `bg-primary` replaces hardcoded hex
10. ✅ Product cards — `rounded-xl`, green badges, primary rating star, primary CTA
11. ✅ Category cards — `rounded-xl`, primary arrow, gradient hover overlay
12. ✅ Collection cards — `rounded-xl`, primary explorer link
13. ✅ Store page header — `bg-muted/40`, `tracking-tight`

### Phase 4: Core Pages ✅ COMPLETED
14. ✅ Product detail page — `text-primary` for stock, `text-amber-600` for low stock
15. ✅ Cart page — Green promo badge → `bg-primary/5`, discount text → `text-primary`
16. ✅ Checkout page — Shipping estimate → `bg-muted/40`, discount/free → `text-primary`
17. ✅ Order success page — Green check → `bg-primary/10 text-primary`, COD → `bg-muted/50`

### Phase 5: Secondary Pages ✅ COMPLETED
18. ✅ Login page — Already uses design tokens, Google button intentionally uses gray
19. ✅ Signup page — Success icon → `bg-primary`
20. ✅ Account page — Already uses design tokens
21. ✅ Orders list page — Tracking info → `bg-muted/40`, text → `text-foreground`
22. ✅ Orders detail page — Status colors → `text-primary bg-primary/10`, discount → `text-primary`
23. ✅ Order tracking component — Full tracking viz → `bg-primary`, steps → `bg-primary`
24. ✅ Notifications page — Icons → `text-primary`, badge → `bg-primary/10`
25. ✅ Notification center — Unread → `bg-primary/5`, border → `bg-primary`, type styles → `text-primary`
26. ✅ Verify email → `bg-primary/10 text-primary`
27. ✅ Forgot password → `bg-primary/5` success box
28. ✅ Reset password → `bg-primary/10 text-primary`
29. ✅ Static pages (warranty, shipping, returns) — Icon colors → `text-primary`/`text-amber-600`

### Phase 6: Hardcoded Color Cleanup ✅ COMPLETED
30. ✅ All `text-green-600` → `text-primary` (success/positive/savings)
31. ✅ All `bg-green-50/100` → `bg-primary/5` or `bg-primary/10`
32. ✅ All `text-blue-600` → `text-primary` (info/shipping/tracking)
33. ✅ All `bg-blue-50/100` → `bg-muted/40` or `bg-primary/10`
34. ✅ All `text-orange-600` → `text-amber-600` (warnings)
35. ✅ All `bg-orange-50` → `bg-amber-50`
36. ✅ All tracking progress → `bg-primary` / `shadow-primary/30`
37. ✅ Zero hardcoded brand colors remaining in source files
38. ✅ Build compiles successfully — 0 errors

### Phase 7: Loading States & Error Page ✅ COMPLETED
39. ✅ Store page loading skeleton — Full skeleton UI (header, toolbar, sidebar, 12 product cards)
40. ✅ Error page redesign — Branded with AlertTriangle icon, `bg-destructive/10`, French text
41. ✅ Build verified — 0 errors after all changes

### Phase 8: Responsive Design Audit ✅ COMPLETED
42. ✅ Header — Top bar `hidden xl:block`, search `hidden md:flex`, mobile menu `md:hidden`
43. ✅ Hero — `h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px] xl:h-[600px]`
44. ✅ Product grid — `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`
45. ✅ Product detail — `grid lg:grid-cols-2`, sticky buy bar `lg:hidden`
46. ✅ Cart — `grid lg:grid-cols-3`
47. ✅ Checkout — `grid lg:grid-cols-3`, form fields `md:grid-cols-2`
48. ✅ Store page — Sidebar `hidden lg:block` + Sheet drawer on mobile
49. ✅ Footer — `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### Phase 9: Remaining (TODO)
50. ⬜ Visual testing — All pages, all states (light + dark) — requires running dev server
51. ⬜ Front ↔ Back connection audit — API data flow verification
52. ⬜ RTL testing — Arabic layout verification

---

## F. RISQUES

1. **CSS variable changes affect ALL components** — Must update globally, test every page
2. **shadcn/ui components use CSS variables** — Changing tokens automatically updates all UI
3. **RTL support must be maintained** — Arabic layout must work with new design
4. **Dark mode** — Need to update `.dark` variants too
5. **PWA** — Service worker caches old CSS, need cache bust
6. **Image assets** — Existing hero images, logos may not match new green theme
7. **Third-party components** — Quill editor CSS may conflict
