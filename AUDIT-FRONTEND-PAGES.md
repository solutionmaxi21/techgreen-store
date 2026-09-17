# Frontend Pages Audit Report

**Date:** 2026-09-04
**Scope:** Admin panel form pages — Product Wizard, Category Form, Collection Form, Warehouse Form
**Method:** Cross-reference frontend submission payloads with backend Zod validation schemas and DB schema

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 3     |
| MEDIUM   | 5     |
| LOW      | 5     |

---

## CRITICAL Findings

### C1. `wholesalePrice` silently dropped on product create/update

**Files:**
- `admin/src/components/forms/ProductWizard/Step2PricingInventory.jsx` (line 219 — input collects value)
- `admin/src/pages/ProductFormPage.jsx` (line 193 — sends `wholesalePrice`)
- `backend/src/shared/validation/products.js` (line 55 — schema validates `wholesalePrice`)
- `backend/routes/products-v2.js` (lines 304-334 POST handler, lines 374-413 PUT handler)

**Problem:** The frontend collects `wholesalePrice` and the backend Zod schema validates it (`z.coerce.number().min(0).optional()`), but **neither the POST nor PUT route handler maps it to the `wholesale_price` DB column**. The field passes validation and is silently discarded.

The database DOES have a `wholesale_price` column (confirmed in `complete-schema.sql:193`, `sql/022_add_wholesale_price.sql`), and the ProductService reads it on retrieval (productService.js line 225). So users can SEE wholesale prices on detail pages but can never SET them through the form.

**Fix:** Add to both POST and PUT handlers:
```js
if (productData.wholesalePrice !== undefined) transformedData.wholesale_price = productData.wholesalePrice;
```

---

### C2. `productFees` collected by frontend but has no backend storage path

**Files:**
- `admin/src/components/forms/ProductWizard/Step2PricingInventory.jsx` (line 282 — input)
- `admin/src/components/forms/ProductWizard/Step4Review.jsx` (line 167 — displayed in review)
- `admin/src/pages/ProductFormPage.jsx` (line 194 — sends `productFees`)
- `backend/src/shared/validation/products.js` — **field not present in schema**
- `backend/routes/products-v2.js` — **field not mapped in handler**
- Database — **no `product_fees` column exists** (confirmed: grep across all .sql and .js returns zero matches)

**Problem:** The product wizard has a "Frais produit" (Product Fees) field that users fill in. It's displayed in the review step (Step4Review line 167) and sent to the API (ProductFormPage line 194). However:
1. The backend Zod schema does NOT include `productFees` (only `.passthrough()` allows it through)
2. The route handler does NOT map it to any DB column
3. No `product_fees` column exists in the database

The `productFees` value is used client-side to calculate landed cost and profit margin (Step2 lines 74-76, 135-143), but is never persisted. If the user creates a product, leaves, and returns to edit, the fees are lost.

**Impact:** Users enter fees thinking they're saved. On re-edit, the field is empty. The landing cost/margin calculations shown during creation are misleading.

**Fix:** Either (a) add `product_fees` column to DB + backend mapping, or (b) remove the field from the wizard if fees are meant to be calculated from other data.

---

## HIGH Findings

### H1. `wholesalePrice` missing from wizard initial state (uncontrolled input)

**Files:**
- `admin/src/hooks/useWizardState.js` (lines 9-42 — initial form data)
- `admin/src/components/forms/ProductWizard/Step2PricingInventory.jsx` (line 219)

**Problem:** The `useWizardState` hook initializes the form with `costPrice`, `currentPrice`, `salePrice`, and `productFees`, but **`wholesalePrice` is absent**. Step2 renders:
```jsx
<input value={formData.wholesalePrice} ... />
```
On new product creation, `formData.wholesalePrice` is `undefined`, making the input uncontrolled. When the user first types, the field transitions from uncontrolled to controlled, triggering a React warning and potentially losing the first keystroke in some React versions.

**Fix:** Add `wholesalePrice: ''` to the initial state in `useWizardState.js`.

---

### H2. Product `name` field is NOT bilingual — inconsistent with Category/Collection

**Files:**
- `admin/src/hooks/useWizardState.js` (line 10 — `name: ''` plain string)
- `admin/src/components/forms/ProductWizard/Step1BasicInfo.jsx` (line 148 — plain text input)
- `backend/src/shared/validation/products.js` (line 42 — `z.string()`)
- Contrast: `admin/src/pages/CategoryFormPage.jsx` (line 31 — `category_name: { fr: '', ar: '' }`)
- Contrast: `admin/src/pages/CollectionFormPage.jsx` (line 61 — `collection_name: { fr: '', ar: '' }`)

**Problem:** Categories and Collections use bilingual `{ fr, ar }` names via `BilingualInput`. Products use a plain string `name`. The backend product schema also expects a plain string (`z.string().min(2).max(200)`).

This means product names cannot have Arabic translations. If the storefront is bilingual (which it is — evidenced by the `BilingualInput` component and RTL support), product names will only display in French.

**Impact:** User-facing inconsistency — category/collection pages can show Arabic names, but product pages cannot. This is a product limitation, not a bug per se, but worth flagging as a HIGH architectural inconsistency.

**Fix (if bilingual products are desired):** Add a `bilingualFieldSchema` for product `name`, update the wizard to use `BilingualInput`, and update the backend schema + DB column to store `{ fr, ar }`.

---

### H3. Warehouse routes have NO Zod validation

**Files:**
- `backend/routes/warehouses.js` (lines 63-87 POST, lines 93-130 PUT)

**Problem:** Unlike categories and collections (which use `validate(createCategorySchema)` middleware), the warehouse routes have zero Zod validation. The POST handler only does a manual `if (!name)` check (line 66). There is:
- No type validation on `wilaya_id` (could be a string, negative number, etc.)
- No length validation on `name`, `address`, `phone`
- No phone format validation (the common `phoneSchema` exists but is unused)
- No maximum length enforcement

**Impact:** Malicious or malformed data can reach the database. An attacker could send extremely long strings or wrong types for `wilaya_id`.

**Fix:** Create a `warehouseSchema` in `backend/src/shared/validation/warehouses.js` and apply `validate()` middleware to POST/PUT routes.

---

## MEDIUM Findings

### M1. Category `image` field: Zod expects URL but path may be relative

**Files:**
- `backend/src/shared/validation/categories.js` (line 42 — `image: z.string().url().optional()`)
- `admin/src/pages/CategoryFormPage.jsx` (line 159 — `image: formData.category_image || undefined`)
- `admin/src/utils/imageUrl.js` (line 94-96 — `normalizeImageUrl` prepends `BACKEND_ORIGIN` for `/uploads/` paths)

**Problem:** The backend validates `image` as `z.string().url()`, which requires a full URL (e.g., `http://...`). The frontend uses `normalizeImageUrl()` which prepends `BACKEND_ORIGIN` for relative paths. If `BACKEND_ORIGIN` is misconfigured or empty, a relative path like `/uploads/categories/foo.jpg` would be sent and fail Zod URL validation.

**Risk:** Medium — depends on BACKEND_ORIGIN configuration. If properly set, this works. If not, category creation with images silently fails validation.

**Fix:** Either change backend schema to `z.string()` (accept any string), or add a `coerceCategoryUploadRelativePath()` call on the backend handler (already done for collections-v2.js line 295 but not visible in categories POST handler). Actually, looking at the categories-v2.js handler line 295: `const categoryImage = coerceCategoryUploadRelativePath(image)` — this IS called. But the Zod validation runs BEFORE the handler, so if the value is a relative path, Zod rejects it before `coerceCategoryUploadRelativePath` can fix it.

**Recommendation:** Change `image: z.string().url().optional()` to `image: z.string().optional()` in the category schema.

---

### M2. Collection loads ALL products into memory on form mount

**Files:**
- `admin/src/pages/CollectionFormPage.jsx` (lines 99-117)

**Problem:** The `loadInitialData` function paginates through ALL products (fetching 100 at a time) to build the product picker list:
```js
do {
  const productsResult = await productApi.getAll({ page: currentPage, limit: 100 });
  loadedProducts = [...loadedProducts, ...productRows];
  currentPage++;
} while (loadedProducts.length < totalCount);
```
For a store with 5,000 products, this makes 50 API calls and loads all product data into component state.

**Impact:** Slow form load (50+ sequential HTTP requests), high memory usage, potential browser tab crash for large catalogs.

**Fix:** Implement server-side search/filtering for the product picker, or use a virtualized list with lazy loading.

---

### M3. Category form sends redundant `name` + `category_name`

**Files:**
- `admin/src/pages/CategoryFormPage.jsx` (lines 153-156)

**Problem:** The payload sends both fields with the same bilingual object value:
```js
const payload = {
  name: formData.category_name,       // { fr, ar }
  category_name: formData.category_name, // { fr, ar } (same value)
  ...
};
```
The backend uses `name || category_name` (categories-v2.js line 293). Sending both is redundant and wastes bandwidth.

**Impact:** Low functional impact but indicates incomplete migration from old field name to new one.

**Fix:** Send only `name` (the canonical field). Keep `category_name` in the backend for backward compatibility but remove from frontend payload.

---

### M4. Collection form sends redundant `name` + `collection_name`

**Files:**
- `admin/src/pages/CollectionFormPage.jsx` (lines 338-339)

**Same pattern as M3:**
```js
const payload = {
  name: formData.collection_name,
  collection_name: formData.collection_name,
  ...
};
```

**Fix:** Same as M3 — send only `name`.

---

### M5. Product attributes: bilingual name object vs backend `z.string()` expectation

**Files:**
- `admin/src/components/forms/ProductWizard/Step3DetailsMedia.jsx` (line 173 — `name: { fr: '', ar: '' }`)
- `backend/src/shared/validation/products.js` (line 134 — `productAttributeSchema` expects `name: z.string()`)

**Problem:** The wizard creates attributes with bilingual name objects (`{ fr: 'Couleur', ar: 'اللون' }`), but the `productAttributeSchema` (used for individual attribute operations) expects `name: z.string()`. The `createProductSchema` uses `attributes: z.array(z.any())` which bypasses individual validation, so attributes ARE saved. But if any code path uses `productAttributeSchema` to validate these attributes (e.g., a future attribute update endpoint), it would fail.

**Impact:** Latent issue — works now due to `z.any()`, but would break if individual attribute validation is tightened.

**Fix:** Update `productAttributeSchema` to accept bilingual names:
```js
name: z.union([z.string().min(1).max(100), z.object({ fr: z.string(), ar: z.string().optional() })])
```

---

## LOW Findings

### L1. Product `price` and `currentPrice` are redundantly sent

**Files:**
- `admin/src/pages/ProductFormPage.jsx` (lines 191, 222)

**Problem:** The submit handler sends both:
```js
currentPrice: parseFloat(wizardFormData.currentPrice) || 0,  // line 191
price: parseFloat(wizardFormData.currentPrice) || 0,          // line 222
```
The backend handler uses `productData.price || productData.currentPrice` (products-v2.js line 310). Both fields hold the same value.

**Fix:** Send only `currentPrice`. Remove the legacy `price` field from the submit payload.

---

### L2. Product dimensions: sent as flat fields, not as `dimensions` object

**Files:**
- `admin/src/pages/ProductFormPage.jsx` (lines 200-202 — sends `length`, `width`, `height` top-level)
- `backend/src/shared/validation/products.js` (lines 62-66 — schema has `dimensions: z.object({...})`)
- `backend/routes/products-v2.js` (lines 317-319 — handler maps `length` → `length_cm`)

**Problem:** The backend schema defines an optional `dimensions` object, but the frontend sends `length`, `width`, `height` as top-level fields. The handler manually maps these. The `dimensions` schema field is never used.

**Impact:** None — works correctly via the handler mapping. Just architecturally inconsistent.

---

### L3. Product `hasVariants` not sent to backend

**Files:**
- `admin/src/pages/ProductFormPage.jsx` (line 229 — only sends `variants` array if hasVariants)

**Problem:** The `hasVariants` boolean is a frontend-only toggle. The backend infers variant presence from whether `variants` array is present. This works but means the backend can't distinguish "user chose not to use variants" from "variants are pending".

**Impact:** Negligible — the `variants` array presence is sufficient.

---

### L4. Warehouse form: no validation on `wilaya_id` type

**Files:**
- `backend/routes/warehouses.js` (line 64 — `const { name, address, phone, wilaya_id } = req.body`)
- `admin/src/pages/WarehouseFormPage.jsx` (line 114 — `wilaya_id: resolvedWilayaId || null`)

**Problem:** The frontend resolves `wilaya_id` from a text input via string matching (`resolveWilayaId` function, line 75). The backend has no type validation on this field. If the frontend sends a non-numeric value, it would be inserted into the DB as-is.

**Impact:** Low — the frontend resolver returns `''` or a numeric ID, and the frontend sends `null` for empty. But no backend safety net.

---

### L5. Product wizard: hardcoded default `warehouseId: 1`

**Files:**
- `admin/src/hooks/useWizardState.js` (line 24)

**Problem:** The wizard defaults `warehouseId` to `1`. If warehouse ID 1 doesn't exist or is deleted, the product would fail to create (or create with an invalid warehouse reference).

**Impact:** Low — the user must select a warehouse in Step 2 (it's required), so the default is overridden before submission.

---

## Bilingual Handling Assessment

**Category Form** (CategoryFormPage.jsx):
- ✅ State initialized as `{ fr: '', ar: '' }` (line 31)
- ✅ BilingualInput used for name and description fields
- ✅ Backend `bilingualFieldSchema` accepts both string and `{ fr, ar }` object
- ✅ Backend handler correctly extracts name from bilingual object
- ✅ `value={formData.category_name}` at line 228 correctly passes the bilingual object

**Collection Form** (CollectionFormPage.jsx):
- ✅ State initialized as `{ fr: '', ar: '' }` (lines 61-63)
- ✅ BilingualInput used for name, tagline, description
- ✅ Benefits stored as `{ fr: [], ar: [] }` with bilingual tab switcher
- ✅ Backend `bilingualFieldSchema` + `benefitsSchema` correctly handle the format
- ✅ `value={formData.collection_name}` at line 438 correctly passes the bilingual object

**Product Wizard**:
- ⚠️ Product name is plain string, not bilingual (see H2)
- ✅ Attribute names are bilingual `{ fr, ar }` (Step3DetailsMedia line 173)
- ✅ `getLocalizedName()` helper correctly handles both string and object formats

**BilingualInput Component**:
- ✅ Correctly normalizes input: `fr: value?.fr || (typeof value === 'string' ? value : ''), ar: value?.ar || ''` (line 39-42)
- ✅ Correctly returns `{ fr, ar }` object on change
- ✅ Shows RTL indicator for Arabic input
- ✅ Shows preview of other language

---

## Product Form Field Mapping (Frontend → Backend → DB)

| Frontend Field | Backend Schema Field | DB Column | Status |
|---|---|---|---|
| `name` | `name` (z.string) | `product_name` | ✅ OK |
| `sku` | `sku` (z.string) | `sku` | ✅ OK |
| `brand` | `brand` (z.string) | `brand` | ✅ OK |
| `categoryId` | `categoryId` (z.number) | `category_id` | ✅ OK |
| `supplierId` | `supplierId` (z.number) | `supplier_id` | ✅ OK |
| `modelNumber` | `modelNumber` (z.string) | `model_number` | ✅ OK |
| `serialNumber` | `serialNumber` (z.string) | `serial_number` | ✅ OK |
| `currentPrice` | `currentPrice` (z.number) | `current_price` | ✅ OK |
| `costPrice` | `costPrice` (z.number) | `cost_price` | ✅ OK |
| `salePrice` | `salePrice` (z.number) | `sale_price` | ✅ OK |
| `wholesalePrice` | `wholesalePrice` (z.number) | `wholesale_price` | ❌ **C1: Not mapped in handler** |
| `productFees` | **Not in schema** | **No column** | ❌ **C2: Dead field** |
| `warehouseId` | `warehouseId` (z.number) | `warehouse_id` | ✅ OK |
| `stock` | `stock` (z.number) | `stock` | ✅ OK |
| `reorderLevel` | `reorderLevel` (z.number) | `reorder_level` | ✅ OK |
| `weight` | `weight` (z.number) | `weight_kg` | ✅ OK |
| `length` | (top-level, not in `dimensions`) | `length_cm` | ✅ OK (via handler) |
| `width` | (top-level) | `width_cm` | ✅ OK (via handler) |
| `height` | (top-level) | `height_cm` | ✅ OK (via handler) |
| `warrantyMonths` | `warrantyMonths` (z.number) | `warranty_months` | ✅ OK |
| `shortDescription` | `shortDescription` (z.string) | `short_description` | ✅ OK |
| `fullDescription` | `fullDescription` (z.string) | `description` | ✅ OK |
| `images` | `images` (z.array) | product_images | ✅ OK |
| `attributes` | `attributes` (z.array(z.any)) | product_attributes | ✅ OK |
| `tags` | `tags` (z.array) | `tags` (comma-separated) | ✅ OK |
| `metaTitle` | `metaTitle` (z.string) | `meta_title` | ✅ OK |
| `metaDescription` | `metaDescription` (z.string) | `meta_description` | ✅ OK |
| `isActive` | `isActive` (z.boolean) | `is_active` | ✅ OK |
| `featured` | `featured` (z.boolean) | `is_featured` | ✅ OK |
| `price` (legacy) | `price` (z.number) | `current_price` | ✅ OK (redundant with currentPrice) |
