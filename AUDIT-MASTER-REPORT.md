# 🔍 AUDIT COMPLET DU SITE — RAPPORT MASTER

**Date :** 2026-09-04
**Portée :** Frontend Next.js + Backend Express + DB Neon PostgreSQL
**Objectif :** Trouver TOUTES les erreurs avant de lier l'admin panel

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | 🔴 Critique | 🟠 Haute | 🟡 Moyenne | Total |
|-----------|-----------|---------|-----------|-------|
| **Frontend Build** | 4 | 3 | 5 | 12 |
| **Backend API & DB** | 6 | 5 | 8 | 19 |
| **API Integration** | 3 | 5 | 6 | 14 |
| **DB Schema vs Code** | 4 | 3 | 4 | 11 |
| **TOTAL** | **17** | **16** | **23** | **56** |

---

# 🔴 P0 — CRITIQUE (Site cassé ou crash à l'exécution)

## 1. ❌ Table `product_variants` INEXISTANTE dans la DB
**Impact :** Toute opération CRUD produit échoue (500)
**Fichiers affectés :** `productService.js`, `orders-v2.js`, `variantService.js` (30+ requêtes)
**Cause :** La table n'a jamais été créée via SQL, mais le code l'utilise partout.
**Fix :** Créer la table + ajouter `variant_id` à `stock` et `order_items`.

```sql
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(255) NOT NULL DEFAULT 'Default',
    sku VARCHAR(100),
    barcode VARCHAR(100),
    cost_price DECIMAL(12,2),
    wholesale_price DECIMAL(12,2),
    current_price DECIMAL(12,2) NOT NULL,
    sale_price DECIMAL(12,2),
    weight_kg DECIMAL(8,3),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    metadata JSONB,
    supplier_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE stock ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name_snapshot VARCHAR(255);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sku_snapshot VARCHAR(100);
```

## 2. ❌ Tables `collections` et `collection_products` INEXISTANTES
**Impact :** Le filtrage par collections dans le storefront échoue (500)
**Fichiers affectés :** `productService.js`, `orders-v2.js`
**Fix :** Créer les tables ou supprimer le filtrage collections du code.

```sql
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    collection_name JSONB NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description JSONB,
    tagline JSONB,
    parent_collection_id INTEGER REFERENCES collections(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_products (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, product_id)
);
```

## 3. ❌ 21+ liens internes cassés (pas de préfixe locale)
**Impact :** Clic sur n'importe quel lien → 404
**Fichiers affectés :** 14 fichiers (login, signup, store, cart, favorites, orders, etc.)
**Cause :** Tous les `href="/login"` devraient être `href={/${locale}/login}`
**Fix :** Soit remplacer tous les liens, soit adopter le composant `LocalizedLink` déjà existant mais jamais utilisé.

Exemples :
- `favorites/page.tsx:91` → `href="/login"` ❌
- `signup/page.tsx:223` → `href="/login"` ❌
- `store/page.tsx` → `href="/store"` ❌ (multiples)
- `cart/page.tsx` → `href="/store"` ❌
- `header.tsx:221` → `href="/login"` ❌

## 4. ❌ PAS DE MIDDLEWARE (locale detection)
**Impact :** Visiter `/` → 404, aucune protection des routes auth
**Fix :** Créer `middleware.ts` avec :
- Redirection `/` → `/fr` (détection langue navigateur)
- Protection des routes `/account`, `/orders`, `/checkout`, `/favorites`

## 5. ❌ Crash `data.data` dans checkout (ReferenceError)
**Impact :** Le cache wilayas crash silencieusement à chaque visite checkout
**Fichier :** `app/[locale]/checkout/page.tsx:217`
**Fix :** Changer `data.data` → `result.data`

## 6. ❌ Import `db` manquant dans `products-v2.js`
**Impact :** `POST /api/products/bulk-delete` → ReferenceError
**Fichier :** `routes/products-v2.js:447`
**Fix :** Ajouter `import db from '../src/db/postgres.js';`

## 7. ❌ Table `refresh_tokens` potentiellement absente
**Impact :** Login/refresh/logout → 500
**Fix :** Vérifier l'existence de la table dans Neon et la créer si nécessaire.

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    revoked BOOLEAN DEFAULT false,
    replaced_by_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
```

## 8. ❌ Colonnes manquantes dans `stock` et `stock_movements`
**Impact :** Gestion des variantes cassée
**Fix :**
```sql
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS variant_id INTEGER;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;
```

## 9. ❌ `NEXT_PUBLIC_HMAC_SECRET` non défini
**Impact :** Le panier offline crash au login
**Fichier :** `lib/crypto/hmac-signer.ts`
**Fix :** Ajouter `NEXT_PUBLIC_HMAC_SECRET=<64-chars-hex>` au `.env.local`

---

# 🟠 P1 — HAUTE (Fonctionnalités cassées)

## 10. CSRF ne bloque pas les webhooks Guepex
**Impact :** Les mises à jour de statut livraison sont perdues (403)
**Fichier :** `src/shared/middleware/csrf.js`
**Fix :** Ajouter `/orders/webhooks/guepex` à `EXEMPT_PATHS`

## 11. Role case mismatch (signup)
**Impact :** INSERT échoue si la DB a une contrainte CHECK en MAJUSCULES
**Fichier :** `routes/auth-v2.js` insère `'customer'` (minuscule)
**DB :** ENUM `UserRole` a `'CUSTOMER'` (majuscule)
**Fix :** Vérifier la contrainte dans la DB, harmoniser la casse.

## 12. `avatar_url` vs `avatar` — colonne renommée
**Impact :** Google OAuth update profil échoue silencieusement
**Fichier :** `routes/auth-v2.js` / `authService.js`
**DB :** La colonne est `avatar_url` dans le schema SQL de base
**Note :** Le Prisma schema dit `avatar`, mais le SQL 001 dit `avatar_url`. Vérifier dans la DB.

## 13. Notifications bypassent le client API
**Impact :** Pas de CSRF, pas de refresh token, pas de gestion d'erreur
**Fichiers :** `notifications/page.tsx` (×6 fetch), `NotificationCenter.tsx` (×4 fetch)
**Fix :** Remplacer tous les `fetch()` bruts par le client `api`.

## 14. `shipping_centers` / `shipping_tariffs` tables supprimées
**Impact :** Le service metadata ne trouve plus les centres/tarifs
**Fichier :** `src/services/metadataService.js`
**Fix :** Utiliser `guepex_centers` et `guepex_shipping_fees`/`guepex_commune_fees`

## 15. Colonne `categories.sort_order` inexistante
**Impact :** Le tri des catégories peut échouer
**Fix :** `ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;`

## 16. `products.serial_number` et `products.updated_by` inexistants
**Impact :** Recherche par numéro de série et soft delete cassés
**Fix :** `ALTER TABLE products ADD COLUMN serial_number VARCHAR(100);`
**Fix :** `ALTER TABLE products ADD COLUMN updated_by INTEGER;`

## 17. Duplicate `tracking_number = NULL` dans orders-v2.js
**Fichier :** `routes/orders-v2.js:1875-1877`
**Fix :** Le deuxième devrait probablement être une autre colonne.

## 18. `product_count` potentiellement undefined
**Fichier :** `store/page.tsx:545`
**Fix :** Ajouter un check null: `(collection.product_count ?? 0)`

## 19. `promo.id` n'existe pas sur le type Promotion
**Fichier :** `deals/page.tsx:143`
**Fix :** Utiliser `promo.promotion_id` au lieu de `promo.id`

## 20. `usersApi` ne gère pas les erreurs
**Fichier :** `lib/api/users.ts:52-97`
**Impact :** `response.data!` retourne `undefined` silencieusement en cas d'erreur API
**Fix :** Vérifier `response.error` avant de retourner les données.

## 21. `CreateOrderRequest` incomplet
**Fichier :** `lib/api/orders.ts:85-101`
**Manque :** `delivery_commune_id`, `delivery_wilaya_id`, `delivery_type`, `delivery_center_id`, `payment_method`, `customer_phone`, `customer_email`, `customer_name`
**Fix :** Ajouter tous les champs envoyés par checkout.

## 22. `BilingualString` redéfini dans 2 fichiers avec types différents
**Fichiers :** `lib/api/products.ts` (obligatoire fr+ar) vs `lib/api/collections.ts` (optionnel fr+ar)
**Fix :** Harmoniser dans un seul type partagé.

---

# 🟡 P2 — MOYENNE (Qualité, perf, sécurité)

## 23. `ignoreBuildErrors: true` masque 22 erreurs TypeScript
**Fichier :** `next.config.mjs`
**Fix :** Corriger les erreurs TS puis retirer l'ignore.

## 24. `tailwind.config.ts` est obsolète (v3 vs v4)
**Impact :** Aucun impact technique (ignoré par v4), mais confond les développeurs
**Fix :** Supprimer le fichier.

## 25. IP LAN hardcodée `26.155.110.217` dans next.config
**Fichier :** `next.config.mjs`
**Fix :** Utiliser une variable d'environnement ou wildcard.

## 26. `getPublicApiBaseUrl()` fallback port 80 au lieu de 3001
**Fichier :** `lib/api/base-url.ts:28`
**Impact :** Les images ne chargent pas en dev sans la variable d'env
**Fix :** Mettre le fallback à `http://localhost:3001/api`

## 27. Store page fetch 1000 produits, filtre côté client
**Fichier :** `app/[locale]/store/page.tsx`
**Impact :** Performance, bandwidth gaspillé
**Fix :** Utiliser des query params pour le filtrage serveur.

## 28. Favorites page fetch TOUS les produits pour filtrer 3 wishlists
**Fichier :** `favorites/page.tsx:38`
**Fix :** Endpoint backend `GET /storefront/products?ids=1,2,3`

## 29. Hardcoded French dans favorites page
**Fichier :** `favorites/page.tsx` (8 occurrences)
**Fix :** Utiliser le système de traduction.

## 30. `cookie_secure: false` dans .env
**Impact :** OK en dev, dangereux si déployé tel quel
**Fix :** Activer en production: `COOKIE_SECURE=true`

## 31. Credentials admin en clair dans .env
**Fichiers :** `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`
**Fix :** Supprimer ou rotater en production.

## 32. Logging PII dans orders-v2.js en production
**Fichier :** `routes/orders-v2.js` (10+ console.log avec données clients)
**Fix :** Utiliser le logger structuré, pas console.log.

## 33. Webhook signature non vérifiée en dev (continues anyway)
**Fichier :** `routes/orders-v2.js:2240-2255`
**Impact :** OK en dev, à fixer avant prod.

## 34. `REVALIDATION_SECRET` non défini
**Impact :** Endpoint `/api/revalidate` accessible à tous
**Fix :** Ajouter au `.env.local`

## 35. CSP `connect-src` uniquement localhost
**Fichier :** `next.config.mjs`
**Impact :** Bloquera les appels API en production

## 36. `tsconfig.json` extends `expo/tsconfig/base`
**Impact :** Inhabituel pour un projet Next.js pur, risque de divergences

## 37. `bcrypt` + `bcryptjs` tous les deux installés
**Fix :** Supprimer l'un des deux

## 38. 3 schémas SQL concurrents non synchronisés
- `complete-schema.sql` → ANCIEN et FAUX
- `prisma/schema.prisma` → partiellement correct
- `sql/001_schema.sql` + migrations → la vraie source
**Fix :** Supprimer `complete-schema.sql`, synchroniser Prisma avec le SQL réel.

## 39. Fichiers test/scripts à la racine du backend
`find-admins.js`, `check-users.js`, `test-*.js`, etc.
**Fix :** Déplacer dans `scripts/`.

---

# 📋 ORDRE D'EXÉCUTION RECOMMANDÉ

## Étape 1 — DB (Neon) — Exécuter les SQL
1. Créer `product_variants`
2. Créer `collections` + `collection_products`
3. Ajouter `variant_id` à `stock` et `stock_movements`
4. Ajouter `variant_id`, `variant_name_snapshot`, `sku_snapshot` à `order_items`
5. Créer `refresh_tokens` (si absent)
6. Ajouter `sort_order` à `categories`
7. Ajouter `serial_number`, `updated_by` à `products`

## Étape 2 — Backend — Fixes code
8. Import `db` dans `products-v2.js`
9. Fix CSRF exemptions (webhook guepex)
10. Fix role case (customer vs CUSTOMER)
11. Fix `avatar_url` / `avatar`
12. Fix duplicate `tracking_number`
13. Fix `metadataService.js` (shipping_centers → guepex_centers)
14. Vérifier `refresh_tokens` table

## Étape 3 — Frontend — Fixes critiques
15. Fix `data.data` → `result.data` (checkout)
16. Fix TOUS les liens internes (locale prefix)
17. Créer `middleware.ts` (locale redirect + auth guard)
18. Ajouter `NEXT_PUBLIC_HMAC_SECRET` au `.env.local`
19. Fix `getPublicApiBaseUrl()` fallback port

## Étape 4 — Frontend — Fixes fonctionnels
20. Notifications → utiliser le client API
21. Update `CreateOrderRequest` interface
22. Fix `promo.id` → `promo.promotion_id`
23. Fix `BilingualString` type
24. Add error handling à `usersApi`
25. Fix `product_count` null check

## Étape 5 — Qualité
26. Retirer `ignoreBuildErrors`
27. Supprimer `tailwind.config.ts` obsolète
28. Nettoyer les scripts à la racine backend
29. Supprimer `complete-schema.sql`
30. Fix hardcoded French dans favorites

---

# ✅ CE QUI FONCTIONNE BIEN

- Auth flow (JWT cookies + CSRF double-submit + refresh token)
- Thème Light/Dark avec design tokens oklch
- Service Worker v4 (network-first)
- Provider chain (Google → Theme → Language → Auth → Wishlist → Cart)
- Google OAuth graceful degradation
- ThemeLogo switching (light/dark)
- Architecture backend (routes séparées, middleware chain)
- Cache manager
- Schema Prisma (structurellement correct, juste pas synchronisé avec la DB)

---

# 🔗 POUR LIER L'ADMIN PANEL

Avant de lier l'admin panel, il faut que :

1. **La DB fonctionne** → Étape 1 (SQL) + Étape 2 (backend)
2. **Le frontend fonctionne** → Étape 3 (liens + middleware + HMAC)
3. **L'admin panel a accès aux mêmes endpoints** → Vérifier que les routes admin (`GET /api/products`, `POST /api/orders/manual`, `GET /api/dashboard/*`, etc.) sont fonctionnelles

L'admin panel aura besoin de :
- Même base Neon (déjà connectée)
- Même backend Express sur :3001 (déjà en place)
- Auth admin (role = 'ADMIN' dans la DB)
- CORS configuré pour l'URL de l'admin panel
