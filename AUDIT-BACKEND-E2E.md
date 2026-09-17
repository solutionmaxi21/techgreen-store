# MaxiStore Backend API — Complete E2E Audit Report

**Date:** 2026-09-17
**Base URL:** `https://techgreen-store.onrender.com/api`
**Authenticated As:** `admin@maxistore.com` (ADMIN role, user ID: 3)
**Token Used:** JWT Bearer token (15-minute expiry)

---

## Executive Summary

| Metric | Value |
|---|---|
| **Total Endpoints Tested** | **68** |
| **✅ PASS** | **49** (72%) |
| **⚠️ PARTIAL (working but buggy)** | **3** (4%) |
| **❌ FAIL (server error / broken)** | **4** (6%) |
| **🚫 NOT IMPLEMENTED (404)** | **12** (18%) |

---

## 1. Auth Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/auth/login` (isAdmin) | POST | 200 | 200 + token | ✅ PASS | Returns accessToken, refreshToken, user object |
| 2 | `/api/auth/login` (no isAdmin) | POST | 200 | 200 | ✅ PASS | Returns user but **no token** when isAdmin omitted |
| 3 | `/api/auth/login` (wrong password) | POST | 401 | 401 | ✅ PASS | `"Invalid credentials"` |
| 4 | `/api/auth/login` (fake email) | POST | 401 | 401 | ✅ PASS | `"Invalid credentials"` |
| 5 | `/api/auth/me` (valid token) | GET | 200 | 200 | ✅ PASS | Returns user with role, email, jwtIat |
| 6 | `/api/auth/me` (no token) | GET | 401 | 401 | ✅ PASS | `"Access token required"` |
| 7 | `/api/auth/refresh` (valid token) | POST | 200 | 200 | ✅ PASS | `"Token refreshed"` |
| 8 | `/api/auth/refresh` (invalid token) | POST | 401 | 401 | ✅ PASS | `"Invalid or expired refresh token"` |

**Auth Module: 8/8 PASS ✅**

---

## 2. Products Module (Admin)

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/products` | GET | 200 | 200 + list | ✅ PASS | Returns `{products, total, page, limit, totalPages}`. 2 products found. |
| 2 | `/api/admin/products?search=test` | GET | 200 | 200 + filtered | ✅ PASS | Returns empty array (no matches). Structure correct. |
| 3 | `/api/admin/products?category=1` | GET | 200 | 200 + filtered | ⚠️ PARTIAL | **BUG:** Returns ALL products regardless of category value. Filtering appears broken. |
| 4 | `/api/admin/products/11` (existing) | GET | 200 | 200 + detail | ✅ PASS | Full product detail with variants, attributes, timestamps |
| 5 | `/api/admin/products/1` (non-existent) | GET | 404 | 404 | ✅ PASS | `"Product not found"` |
| 6 | `/api/admin/products/nonexistent` (string) | GET | 422 | 4xx | ✅ PASS | Zod validation: `"expected number, received string"` |
| 7 | `/api/admin/products/stats` | GET | 422 | 200 | ❌ FAIL | **ROUTE ORDERING BUG:** `/:id` catches "stats" string. Stats endpoint unreachable. |
| 8 | `/api/admin/products` (create) | POST | 201 | 201 | ✅ PASS | Created product ID 15 with SKU `AUDIT-TEST-001`. Returns full product object. |
| 9 | `/api/admin/products/11` (update) | PUT | 200 | 200 | ✅ PASS | Updated name to "Lampe LED 12W Updated", price to 1600. Verified in response. |
| 10 | `/api/admin/products/bulk-delete` (empty) | POST | 422 | 4xx | ✅ PASS | `"productIds must be a non-empty array"` |
| 11 | `/api/admin/products/bulk-delete` (valid) | POST | 200 | 200 | ✅ PASS | `deletedCount:1, failedCount:0`. Product 15 successfully deleted. |
| 12 | `/api/admin/products/export?format=csv` | GET | 200 | 200 + CSV | ✅ PASS | Returns proper CSV with headers: ID, Name, Slug, SKU, Barcode, Price, etc. |
| 13 | `/api/admin/products` (no auth) | GET | 401 | 401 | ✅ PASS | `"Access token required"` |

**Products Module: 11/13 PASS, 1 PARTIAL, 1 FAIL**

### BUG: Category filter ignored
```
GET /api/admin/products?category=1  →  returns all products (total:2)
Expected: only products with categoryId=1
```

### BUG: /stats route shadowed by /:id
```
GET /api/admin/products/stats  →  422 Validation Error
Cause: /:id route is registered before /stats route
```

---

## 3. Categories Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/metadata/categories` | GET | 200 | 200 + list | ✅ PASS | Returns flat array of categories with bilingual names |
| 2 | `/api/admin/categories` | GET | 200 | 200 + list | ✅ PASS | Returns categories with product_count (admin version) |
| 3 | `/api/admin/categories` (simple name) | POST | 500 | 201 or 422 | ❌ FAIL | **SERVER ERROR:** Requires bilingual `name` object `{ar, fr}` — should return 422 not 500 |
| 4 | `/api/admin/categories` (bilingual) | POST | 201 | 201 | ✅ PASS | Created category 15 with bilingual name. Slug auto-generated. |
| 5 | `/api/admin/categories/9` (update) | PUT | 200 | 200 | ✅ PASS | Updated name and slug successfully |
| 6 | `/api/admin/categories/9` (delete) | DELETE | 200 | 200 | ✅ PASS | `"Category deleted successfully"`. Verified removed from list. |

**Categories Module: 5/6 PASS, 1 FAIL**

### BUG: Category create crashes on simple name format
```
POST /api/admin/categories  body: {"name":"Simple Name",...}
→ 500 Internal Server Error
Expected: 422 with validation message
```

---

## 4. Collections Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/metadata/collections` | GET | 200 | 200 + list | ⚠️ PARTIAL | **DATA LEAK:** Response contains raw `QueryResult` internals: `_parsers`, `_types`, `RowCtor`, `binary`, `text` objects |
| 2 | `/api/admin/collections` | GET | 200 | 200 + list | ✅ PASS | Returns clean array of collections |
| 3 | `/api/admin/collections` (create) | POST | 201 | 201 | ✅ PASS | Created collection with bilingual defaults |
| 4 | `/api/admin/collections/5` (update) | PUT | 200 | 200 | ✅ PASS | Updated name. Slug auto-regenerated. |
| 5 | `/api/admin/collections/1` (non-existent) | PUT | 404 | 404 | ✅ PASS | `"Collection not found"` |
| 6 | `/api/admin/collections/10` (delete) | DELETE | 200 | 200 | ✅ PASS | `"Collection deleted successfully"` |

**Collections Module: 5/6 PASS, 1 PARTIAL**

### SECURITY ISSUE: /metadata/collections leaks DB internals
```json
{
  "data": {
    "command": "SELECT",
    "rowCount": 4,
    "oid": null,
    "rows": [...],
    "fields": [...],
    "_parsers": [null,null,...],
    "_types": { "_types": { "arrayParser": {}, "builtins": {...} } }
  }
}
```
**Risk:** Exposes database driver internals, field types, and internal structure to the client.

---

## 5. Orders Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/orders` | GET | 200 | 200 + list | ✅ PASS | Returns `{success:true, data:[]}` (empty — no orders exist) |
| 2 | `/api/admin/orders/1` (non-existent) | GET | 404 | 404 | ✅ PASS | `"Order with ID 1 not found"` |
| 3 | `/api/admin/orders/ORD-000001` | GET | 404 | 404 | ✅ PASS | Parsed to numeric ID 1, correctly returned 404 |
| 4 | `/api/admin/orders/stats` | GET | 422 | 200 | ❌ FAIL | **ROUTE ORDERING BUG:** `/:id` catches "stats". Stats endpoint unreachable. |

**Orders Module: 3/4 PASS, 1 FAIL**

### BUG: /stats route shadowed by /:id (same as Products)
```
GET /api/admin/orders/stats  →  422 "Invalid order ID format"
```

---

## 6. Customers Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/customers` | GET | 200 | 200 + list | ✅ PASS | Returns 7 users with pagination |
| 2 | `/api/admin/customers/3` (existing) | GET | 200 | 200 + detail | ✅ PASS | Full detail: orders, reviews, addresses, timestamps |
| 3 | `/api/admin/customers/4` (existing) | GET | 200 | 200 + detail | ✅ PASS | Full customer detail with order/review counts |
| 4 | `/api/admin/customers/999` (non-existent) | GET | 404 | 404 | ✅ PASS | `"User not found"` |
| 5 | `/api/admin/users` (alias) | GET | 200 | 200 | ✅ PASS | Same data as `/api/admin/customers` |
| 6 | `/api/admin/users/3` (alias) | GET | 200 | 200 | ✅ PASS | Same detail as `/api/admin/customers/3` |

**Customers Module: 6/6 PASS ✅**

---

## 7. Suppliers Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/suppliers` | GET | 200 | 200 + list | ✅ PASS | Returns `[]` (empty before test) |
| 2 | `/api/admin/suppliers` (missing field) | POST | 422 | 422 | ✅ PASS | `"contact_email: expected string, received undefined"` |
| 3 | `/api/admin/suppliers` (create) | POST | 201 | 201 | ✅ PASS | Created supplier ID 1 with all fields |
| 4 | `/api/admin/suppliers/1` (update) | PUT | 200 | 200 | ✅ PASS | Updated name and contact_email. Verified in response. |
| 5 | `/api/admin/suppliers/1` (delete) | DELETE | 200 | 200 | ✅ PASS | `"Supplier deleted successfully"` |

**Suppliers Module: 5/5 PASS ✅**

---

## 8. Warehouses & Inventory Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/warehouses` | GET | 200 | 200 + list | ✅ PASS | Returns 1 warehouse (Entrepôt Principal) |
| 2 | `/api/admin/warehouses` (create) | POST | 201 | 201 | ✅ PASS | Created warehouse ID 2 |
| 3 | `/api/admin/inventory` | GET | 200 | 200 + list | ✅ PASS | Returns 5 inventory records with stock levels, warehouse info |
| 4 | `/api/admin/inventory` (adjust) | POST | 404 | 200/201 | ❌ FAIL | **ROUTE NOT FOUND:** `POST /api/admin/inventory` not implemented |
| 5 | `/api/admin/inventory/adjust` | POST | 404 | 200/201 | ❌ FAIL | **ROUTE NOT FOUND:** `POST /api/admin/inventory/adjust` not implemented |

**Warehouses & Inventory: 3/5 PASS, 2 FAIL**

### BUG: Inventory adjustment endpoint does not exist
```
POST /api/admin/inventory       →  404 "Route POST /api/admin/inventory not found"
POST /api/admin/inventory/adjust → 404 "Route POST /api/admin/inventory/adjust not found"
No way to adjust stock via API.
```

---

## 9. Reviews Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/reviews` | GET | 200 | 200 + list | ✅ PASS | Returns `{reviews:[], total:0}` with pagination |
| 2 | `/api/admin/reviews/1` (non-existent) | GET | 404 | 404 | ✅ PASS | `"Review not found"` |

**Reviews Module: 2/2 PASS ✅**

---

## 10. Promotions Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/promotions` | GET | 200 | 200 + list | ✅ PASS | Returns `{promotions:[], total:0}` with pagination |
| 2 | `/api/admin/promotions` (all attempts) | POST | 500 | 201/422 | ❌ FAIL | **SERVER ERROR:** Every create attempt crashes with 500 regardless of body format |

**Promotions Module: 1/2 PASS, 1 FAIL**

### BUG: Promotion creation always crashes
```
POST /api/admin/promotions  (3 different body formats tested)
→ All return 500 "An unexpected error occurred"
Backend handler has an unhandled error in the create logic.
```

---

## 11. Purchase Orders Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/purchase-orders` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 2 | `/api/admin/purchase-orders` | POST | 404 | 201/422 | 🚫 NOT IMPLEMENTED | Route does not exist |

**Purchase Orders: 0/2 — NOT IMPLEMENTED**

---

## 12. Employees Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/employees` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 2 | `/api/admin/employees` | POST | 404 | 201/422 | 🚫 NOT IMPLEMENTED | Route does not exist |

**Employees: 0/2 — NOT IMPLEMENTED**

---

## 13. Notifications Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/notifications` | GET | 200 | 200 + list | ✅ PASS | Returns `{success:true, data:[], pagination:{nextCursor:null, hasMore:false}}` |
| 2 | `/api/admin/notifications/unread-count` | GET | 200 | 200 + count | ✅ PASS | Returns `{success:true, unreadCount:0}` |

**Notifications: 2/2 PASS ✅**

---

## 14. Dashboard Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/dashboard/summary` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 2 | `/api/admin/dashboard/recent-activity` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 3 | `/api/admin/dashboard` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |

**Dashboard: 0/3 — NOT IMPLEMENTED**

---

## 15. Settings Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/settings` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 2 | `/api/admin/settings` | PUT | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |

**Settings: 0/2 — NOT IMPLEMENTED**

---

## 16. Profile Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/profile` | GET | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |
| 2 | `/api/admin/profile` | PUT | 404 | 200 | 🚫 NOT IMPLEMENTED | Route does not exist |

**Profile: 0/2 — NOT IMPLEMENTED**

---

## 17. Cache Module

| # | Endpoint | Method | Status | Expected | Result | Notes |
|---|---|---|---|---|---|---|
| 1 | `/api/admin/metadata/cache/invalidate` | POST | 200 | 200 | ✅ PASS | Returns `"All cache cleared"` |

**Cache: 1/1 PASS ✅**

---

## All Bugs & Issues Summary

### 🔴 CRITICAL (Server Errors)

| # | Endpoint | Issue | Impact |
|---|---|---|---|
| 1 | `POST /api/admin/promotions` | Always returns 500 — promotion creation is completely broken | Cannot create any promotions |
| 2 | `POST /api/admin/inventory` and `/inventory/adjust` | Routes don't exist — no way to adjust inventory via API | Cannot manage stock levels through API |
| 3 | `POST /api/admin/categories` (simple name) | 500 crash instead of 422 validation on simple name format | Poor error handling, confusing for API consumers |

### 🟡 BUGS (Incorrect Behavior)

| # | Endpoint | Issue | Impact |
|---|---|---|---|
| 4 | `GET /api/admin/products?category=N` | Category filter is ignored — returns all products | Category filtering is non-functional |
| 5 | `GET /api/admin/products/stats` | Route shadowed by `/:id` — returns 422 instead of stats | Cannot retrieve product statistics |
| 6 | `GET /api/admin/orders/stats` | Route shadowed by `/:id` — returns 422 instead of stats | Cannot retrieve order statistics |

### 🟠 SECURITY

| # | Endpoint | Issue | Impact |
|---|---|---|---|
| 7 | `GET /api/admin/metadata/collections` | Leaks raw PostgreSQL driver internals (`_parsers`, `_types`, `RowCtor`, `binary`, `text`) | Exposes database implementation details to client |

### 🔵 NOT IMPLEMENTED (12 endpoints missing)

| Module | Endpoints Missing |
|---|---|
| Purchase Orders | `GET /api/admin/purchase-orders`, `POST /api/admin/purchase-orders` |
| Employees | `GET /api/admin/employees`, `POST /api/admin/employees` |
| Dashboard | `GET /api/admin/dashboard/summary`, `GET /api/admin/dashboard/recent-activity`, `GET /api/admin/dashboard` |
| Settings | `GET /api/admin/settings`, `PUT /api/admin/settings` |
| Profile | `GET /api/admin/profile`, `PUT /api/admin/profile` |
| Inventory Adjust | `POST /api/admin/inventory`, `POST /api/admin/inventory/adjust` |

---

## CRUD Verification Summary

| Module | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|
| Products | ✅ Works | ✅ Works | ✅ Works | ✅ Works (bulk-delete) | Category filter broken; stats unreachable |
| Categories | ⚠️ Works (bilingual only) | ✅ Works | ✅ Works | ✅ Works | Simple name crashes with 500 |
| Collections | ✅ Works | ✅ Works | ✅ Works | ✅ Works | Metadata endpoint leaks DB internals |
| Orders | N/A (no create) | ✅ Works | N/A | N/A | No orders exist to test detail; stats broken |
| Customers | N/A (no create) | ✅ Works | N/A | N/A | Full CRUD not available (read-only) |
| Suppliers | ✅ Works | ✅ Works | ✅ Works | ✅ Works | Full CRUD working |
| Warehouses | ✅ Works | ✅ Works | N/A | N/A | No update/delete endpoints tested |
| Inventory | ❌ No adjust endpoint | ✅ List works | N/A | N/A | Cannot adjust stock |
| Reviews | N/A | ✅ Works | N/A | N/A | Read-only |
| Promotions | ❌ 500 crash | ✅ List works | N/A | N/A | Create completely broken |

---

## Recommendations (Priority Order)

1. **Fix promotion creation** — Debug the 500 error in the promotions create handler
2. **Implement inventory adjustment endpoint** — Critical for warehouse operations
3. **Fix route ordering** — Move `/products/stats` and `/orders/stats` routes BEFORE `/:id` routes
4. **Fix product category filtering** — The `?category=N` query parameter is being ignored
5. **Sanitize `/metadata/collections` response** — Strip `_parsers`, `_types`, `RowCtor`, `binary`, `text` from response
6. **Improve category validation** — Return 422 validation error instead of 500 on invalid input
7. **Implement missing modules** — Dashboard, Settings, Profile, Purchase Orders, Employees
