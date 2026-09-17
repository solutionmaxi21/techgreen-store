# MaxiStore Security Audit Report

**Audit Date:** 2025-09-04
**Scope:** Full backend security review — authentication, authorization, SQL injection, input validation, sensitive data exposure, CORS, password security, rate limiting
**Audited By:** Automated security scan + manual code review

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH     | 5 |
| MEDIUM   | 6 |
| LOW      | 4 |

The platform has a **solid security foundation** — JWT with refresh rotation, CSRF double-submit, rate limiting, parameterized queries, Helmet headers, and Zod validation. However, several **critical issues around credential exposure** and a few architectural weaknesses need immediate attention.

---

## 1. Authentication Security

### ✅ Good
- **Rate limiting on login:** `loginLimiter` = 5 attempts/min per IP (`backend/src/shared/middleware/rateLimiter.js:57-71`)
- **Password hashing:** bcrypt with 12 salt rounds via `bcryptjs` (`backend/src/shared/utils/password.js:5`)
- **JWT secrets from env:** Loaded from `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` env vars, not hardcoded in code (`backend/src/shared/middleware/auth.js:10-24`)
- **Secret length validation:** Both secrets require ≥32 characters at runtime (`auth.js:12,20`)
- **Token hashing:** Refresh tokens stored as SHA-256 hashes, never plaintext (`authService.js:383-385`)
- **Refresh token rotation:** Full rotation with revocation tracking (`authService.js:156-326`)
- **Reuse detection:** Reuse of revoked refresh tokens revokes all user tokens (`authService.js:183-261`)
- **Grace period:** 30-second grace period prevents false positives from network retries (`authService.js:17`)

### 🔴 CRITICAL-1: No Account Lockout After Failed Logins
- **File:** `backend/src/services/authService.js:22-46`
- **Issue:** Failed login attempts are only rate-limited (5/min per IP), but there is no per-account lockout mechanism. An attacker with rotating IPs can brute-force credentials indefinitely.
- **Impact:** Password brute-force attacks across distributed IPs
- **Fix:** Implement account lockout (e.g., lock account for 15 min after 5 failed attempts). Track `failed_login_attempts` and `locked_until` in the `users` table.

### 🟡 MEDIUM-1: bcryptjs vs native bcrypt
- **File:** `backend/src/shared/utils/password.js:1` (`import bcrypt from 'bcryptjs'`)
- **Issue:** `bcryptjs` is a pure JavaScript implementation. While functionally equivalent, it lacks constant-time comparison protections of native `bcrypt` and is significantly slower (which helps against brute force but can cause DoS under load).
- **Impact:** Minor — bcryptjs is widely used and acceptable, but native `bcrypt` (with Node.js bindings) is preferred for production.
- **Fix:** Switch to `bcrypt` (native) package for better performance and timing-attack resistance.

---

## 2. Authorization Security

### ✅ Good
- **`requireAdmin` middleware:** Checks `req.user.role !== 'ADMIN'` and throws `ForbiddenError` (`auth.js:172-185`)
- **`authorize` middleware:** Role-based access control for multiple roles (`auth.js:154-166`)
- **`requireSelfOrAdmin`:** Prevents IDOR for user-specific resources (`auth.js:193-209`)
- **`verifyResourceOwnership`:** Database-level ownership verification (`auth.js:229-280`)
- **Admin route protection:** All `/api/admin/*` routes use `authenticateToken, requireAdmin` in `server.js:210-253`
- **Admin panel alias routes:** All `/api/admin/*` aliases also protected (`server.js:185-207`)
- **Separate cookie names:** Admin uses `adminAccessToken`/`adminRefreshToken` vs `accessToken`/`refreshToken` (`auth-v2.js:248-254`)

### ⚠️ HIGH-1: CSRF Protection Bypassed for Authorization Header Requests
- **File:** `backend/src/shared/middleware/csrf.js:91-93`
- **Issue:** CSRF protection is skipped when `Authorization` header is present:
  ```js
  if (req.headers['authorization']) {
    return next();
  }
  ```
- **Impact:** The admin panel (cross-origin) sends tokens in the body and uses `Authorization` header. If an attacker can get the JWT (e.g., via XSS on the admin panel), CSRF protection won't apply — but this is mitigated by HttpOnly cookies and the fact that JWT-in-body is only for Electron/cross-origin clients. Still, it means Authorization-header-based API clients have no CSRF protection.
- **Risk context:** Low practical risk because JWT-in-header clients are typically not browser-cookie-based, but the architectural choice should be documented.

### ⚠️ HIGH-2: Admin Cookie `sameSite: 'none'` Weakens CSRF Protection
- **File:** `backend/routes/auth-v2.js:38`
- **Issue:** In production, cookies use `sameSite: 'none'`, which means they're sent on cross-origin requests. This is required for the admin panel (different domain) but weakens CSRF protection. The CSRF double-submit pattern is the only defense.
- **Impact:** If the CSRF token is compromised (e.g., via a subdomain XSS), the `sameSite: 'none'` cookies will be sent on cross-origin requests.
- **Mitigation:** The double-submit CSRF pattern is correctly implemented. However, consider whether the admin panel could use a different auth mechanism (e.g., short-lived tokens in memory only).

---

## 3. SQL Injection Check

### ✅ Good
- **Parameterized queries throughout:** All routes use `$1, $2, ...` parameterized queries with `db.query(query, [params])`.
- **No direct user input in SQL:** `req.query` and `req.params` values are passed as parameters, not interpolated into SQL strings.
- **Dynamic column names use `assertSafeIdentifier`:** `database-v2.js:12-16` validates table/column names with regex `^[a-zA-Z_][a-zA-Z0-9_]*$`.
- **Dynamic UPDATE queries use whitelisted field names:** `categories-v2.js:462` and `suppliers-v2.js:212` build SET clauses from controlled field name arrays, not user input.
- **Storefront filters use allowlist mapping:** `storefront-v2.js:53-57` maps `sortBy` to fixed column names.

### ⚠️ HIGH-3: `verifyResourceOwnership` Uses String Interpolation for Table/Column Names
- **File:** `backend/src/shared/middleware/auth.js:257-258`
- **Issue:**
  ```js
  const resource = await db.queryOne(
    `SELECT ${userIdColumn} FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
    [resourceId]
  );
  ```
  While `table` and `userIdColumn` are caller-supplied constants (not user input), this pattern is inherently risky. If a developer passes user-controlled values, it becomes SQL injection.
- **Impact:** Low risk currently (all callers pass string literals), but high risk as a code pattern.
- **Fix:** Use an allowlist of table/column names or use a query builder for dynamic identifiers.

### ℹ️ INFO: `database-v2.js` Dynamic Table Names
- **File:** `backend/routes/database-v2.js:53,104,225,310,406`
- **Issue:** Table names are interpolated directly: `` `SELECT * FROM ${table}` ``. However, table names come from `information_schema.tables` (line 22-29), not user input, and are validated with `assertSafeIdentifier` before use.
- **Impact:** Minimal — defense-in-depth is correctly applied.

---

## 4. Input Validation

### ✅ Good
- **Zod validation on auth endpoints:** Login, register, password reset all use Zod schemas (`backend/src/shared/validation/auth.js`)
- **Password complexity enforcement:** Min 8 chars, max 128, requires uppercase + lowercase + number, plus zxcvbn entropy check (score ≥3) (`password.js:39-86`, `auth.js:22-26`)
- **File upload restrictions:** Only image types (jpeg, jpg, png, gif, webp), 5MB max, filename sanitization via multer (`upload.js:29-48`)
- **Product CRUD validation:** All product endpoints use Zod schemas (`products-v2.js:293,361,428`)
- **User CRUD validation:** All user endpoints validated (`users-v2.js:319,344,375,457,485`)
- **Truncate table whitelist:** Only specific tables can be truncated (`database-v2.js:517-529`)
- **Truncate requires confirmation:** Must set `confirm: true` (`database-v2.js:509-514`)
- **Input sanitization:** XSS prevention via regex tag stripping on names (`auth-v2.js:93-94`)
- **Body size limit:** 10MB JSON limit (`server.js:98`)

### 🔴 CRITICAL-4: Truncate Endpoint Allows Without Re-Authentication
- **File:** `backend/routes/database-v2.js:499`
- **Issue:** The `/api/database/tables/truncate` endpoint requires `authenticateToken` and `requireAdmin`, but does **not** require password re-verification (unlike the `/verify-password` endpoint at line 458 which exists but is standalone).
- **Impact:** An admin session (stolen token or shared computer) can truncate production tables without re-entering password.
- **Fix:** Chain `verifyPassword` or require `confirm` + password before truncation.

---

## 5. Sensitive Data Exposure

### 🔴 CRITICAL-2: `audit_db.js` Contains Hardcoded Production Database Credentials
- **File:** `audit_db.js` (root directory, untracked)
- **Issue:** Contains plaintext Neon PostgreSQL connection string with username/password (REDACTED)
- **Status:** ✅ FIXED — File deleted
- **Impact:** Anyone with access to the source code has full database access. If this file is accidentally committed or shared, the database is compromised.
- **Fix:** Delete this file immediately. Use environment variables for all database connections.

### 🔴 CRITICAL-3: `backend/.env` Contains Production Secrets with Weak Test Password
- **File:** `backend/.env`
- **Content:**
  - Production `DATABASE_URL` with credentials
  - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (hardcoded, though strong values)
  - `TEST_ADMIN_PASSWORD=ChangeThisPassword123!`
  - `HMAC_SECRET`, `REVALIDATION_SECRET`, `GUEPEX_WEBHOOK_SECRET`
- **Impact:** While `.env` is gitignored (verified), the file exists on disk and contains all production secrets in one place. The weak test admin password (`ChangeThisPassword123!`) could be used to access the admin panel if it exists in the production database.
- **Fix:** Remove test credentials from `.env`. Use a secrets manager for production. Rotate all secrets if this file was ever shared.

### 🟡 MEDIUM-2: Hardcoded Credentials in Test Scripts (Committed)
- **Files:**
  - `backend/scripts/fix-test-data.js:6` — `postgresql://postgres:sm2025mf@localhost:5432/maxistore`
  - `backend/scripts/fix-order-15.js:6` — same credentials
  - `backend/test-favorites.js:19` — same credentials as fallback
  - `backend/docs/root/QUICK_START.md:36` — same credentials in documentation
  - `backend/postman/Shipping-Guepex-API-Tests.postman_collection.json:80` — `admin123` password
  - `backend/postman/Guepex-Complete-Tests.postman_collection.json:162` — `admin123` password
  - `backend/scripts/tests/test-auth-complete.js:5` — `Admin1234!`
  - `backend/scripts/tests/test-multi-tab-logout.js:12-14` — `Admin1234!` and `Test1234!`
  - `backend/COMPLETE-DEPLOYMENT-GUIDE.md:678` — `ChangeThisPassword123!`
- **Impact:** Hardcoded passwords in committed files can be extracted by anyone with repo access. Even if these are local/development passwords, they may match production accounts.
- **Fix:** Remove all hardcoded credentials from committed files. Use `.env` or secrets injection for test data.

### ℹ️ INFO: `.env` is Properly Gitignored
- Verified: `git check-ignore backend/.env` returns `backend/.env`
- Verified: `git ls-files backend/.env` returns "not matched" — file is NOT tracked
- Both root `.gitignore` and `backend/.gitignore` exclude `.env` files

---

## 6. CORS Configuration

### ✅ Good
- **Origin allowlist:** Configurable via `ALLOWED_ORIGINS` env var (`security.js:36-55`)
- **Default production origins:** Hardcoded Vercel deployments only (`security.js:41-43`)
- **No wildcard `*`:** Origins are explicitly listed
- **Credentials allowed:** `credentials: true` for cookie-based auth (`security.js:101`)
- **Loopback restricted to dev:** `isLoopbackOrigin` check only in non-production (`security.js:87-89`)
- **Blocked origins logged in production:** `console.warn('[CORS] Blocked origin:', origin)` (`security.js:94`)

### 🟡 MEDIUM-3: No Origin Required for Non-Browser Clients in Production
- **File:** `backend/src/config/security.js:74-78`
- **Issue:** Requests without an `Origin` header are allowed in production:
  ```js
  if (!origin) {
    if (isProduction) {
      return callback(null, true); // Allows non-browser clients
    }
  }
  ```
- **Impact:** This is by design (for API clients like curl, mobile apps, Electron). CORS enforcement only applies to browsers, so this is acceptable. However, it means any server-side request can bypass CORS restrictions.

---

## 7. Password Security

### ✅ Good
- **Bcrypt with 12 rounds:** `BCRYPT_SALT_ROUNDS=12` (`password.js:5`)
- **Password hashing before storage:** All registration and password reset paths hash via `hashPassword()` (`auth-v2.js:85,219`)
- **Password complexity at registration:** Zod enforces min 8, max 128, uppercase + lowercase + number (`auth.js:22-26`)
- **zxcvbn entropy check:** Reset password uses `validatePasswordStrength` which requires zxcvbn score ≥ 3 (`password.js:70-80`)
- **Password validation on reset:** `reset-password` endpoint validates strength (`auth-v2.js:200-204`)
- **Change password validation:** Users endpoint validates strength on change (`users-v2.js:300`)
- **Max password length:** 128 chars prevents bcrypt truncation attacks

### 🟡 MEDIUM-4: No Special Character Requirement
- **File:** `backend/src/shared/utils/password.js:46`
- **Issue:** `requireSpecial: false` — special characters are not required. While zxcvbn compensates by checking overall entropy, requiring special characters adds defense-in-depth.
- **Impact:** Minor — zxcvbn score ≥ 3 already ensures reasonable password strength.

---

## 8. Rate Limiting

### ✅ Good — Comprehensive Rate Limiting Configuration

| Endpoint | Window | Max (Prod) | Purpose |
|----------|--------|------------|---------|
| `loginLimiter` | 1 min | 5 | Brute-force prevention |
| `authLimiter` | 15 min | 10 | Signup, verify, resend |
| `passwordResetLimiter` | 1 hour | 5 | Reset abuse prevention |
| `refreshLimiter` | 1 min | 10 | Token replay prevention |
| `sensitiveLimiter` | 1 hour | 10 | Destructive operations |
| `readLimiter` | 15 min | 10,000 | GET requests |
| `apiLimiter` | 15 min | 3,000 | POST/PUT/DELETE/PATCH |

### ✅ Additional Protections
- Auth routes skip global rate limiter (avoids double-limiting) (`server.js:87-88`)
- `skipSuccessfulRequests: true` on login limiter — only counts failures (`rateLimiter.js:69`)
- Standard headers returned (`Retry-After`) for compliant clients
- Test environment skips all rate limits (`rateLimiter.js:27,50,70,90,110,127,147`)

### 🟡 MEDIUM-5: Rate Limiting is IP-Based Only
- **Issue:** All rate limiters use `express-rate-limit` which defaults to `req.ip`. Attackers using VPNs, Tor, or cloud functions can rotate IPs.
- **Impact:** Rate limiting is less effective against distributed attacks.
- **Fix:** Consider adding per-user rate limiting (keyed on `req.user.userId` after authentication) for authenticated endpoints.

---

## 9. CSRF Protection

### ✅ Good
- **Double-submit cookie pattern:** Token set in `XSRF-TOKEN` cookie, verified via `X-XSRF-TOKEN` header (`csrf.js:1-116`)
- **Safe methods skipped:** GET/HEAD/OPTIONS exempt (`csrf.js:21`)
- **Webhook paths exempted:** Shipping webhooks properly excluded (`csrf.js:27-54`)
- **Cookie security settings:** `httpOnly: false` (readable by JS), `secure: true` in production, `sameSite` configured (`csrf.js:63-73`)

---

## 10. Security Headers (Helmet)

### ✅ Good
- **HSTS:** 1 year max-age with preload and includeSubDomains (`security.js:22-26`)
- **CSP:** Restrictive directives with `defaultSrc: 'self'` (`security.js:9-19`)
- **X-Frame-Options: DENY** — clickjacking prevention (`security.js:118`)
- **X-Content-Type-Options: nosniff** (`security.js:114`)
- **Referrer-Policy: strict-origin-when-cross-origin** (`security.js:123`)
- **Permissions-Policy:** Blocks camera, microphone, geolocation (`security.js:126-129`)
- **X-Powered-By disabled** (`server.js:69`)
- **Cache-Control: no-store** on API responses (`security.js:132`)

### 🟡 MEDIUM-6: CSP Allows `unsafe-inline` for Styles
- **File:** `backend/src/config/security.js:13`
- **Issue:** `styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]`
- **Impact:** Inline styles can be injected via XSS, though this is lower risk than `unsafe-inline` for scripts.
- **Fix:** Use nonces or hashes for inline styles where possible.

### ℹ️ LOW-1: `X-XSS-Protection` Header is Deprecated
- **File:** `backend/src/config/security.js:120`
- **Issue:** Modern browsers have removed XSS auditors. This header can be safely removed.
- **Impact:** None — it's harmless but unnecessary.

---

## 11. Additional Findings

### 🔴 CRITICAL (see #2): Database credentials in `audit_db.js`
### 🔴 CRITICAL (see #3): Secrets in `backend/.env` with weak test password

### ⚠️ HIGH-4: `verifyPassword` Endpoint is Standalone (Not Gated to Destructive Ops)
- **File:** `backend/routes/database-v2.js:458-494`
- **Issue:** `POST /api/database/verify-password` exists but the truncate endpoint (line 499) does not require it. The verify-password endpoint is an independent admin re-authentication check that isn't enforced on any destructive endpoint.
- **Fix:** Either chain re-authentication on destructive endpoints or remove the standalone endpoint.

### ⚠️ HIGH-5: JWT Role Embedded in Token Without Invalidation Mechanism
- **File:** `backend/src/shared/middleware/auth.js:32-36`
- **Issue:** The user's `role` is embedded in the JWT access token. If an admin demotes a user, the access token remains valid with the old role for up to 15 minutes.
- **Impact:** Window where a demoted user retains admin access.
- **Fix:** Check role against the database on sensitive operations, or use short-lived access tokens (already 15 min, which limits the window).

### ℹ️ LOW-2: Body Size Limit of 10MB
- **File:** `backend/server.js:98`
- **Issue:** `express.json({ limit: '10mb' })` is generous. Most API requests are <1MB.
- **Fix:** Consider reducing to 1MB for general routes, with the database import endpoint handling larger payloads separately.

### ℹ️ LOW-3: Test Environment Disables All Security Controls
- **File:** `rateLimiter.js:27,50,70,90,110,127,147` — `skip: () => process.env.NODE_ENV === 'test'`
- **File:** `csrf.js:96-98` — CSRF disabled when `CSRF_DISABLED=true`
- **Issue:** Running with `NODE_ENV=test` disables all rate limits. Ensure this is never used in production.

### ℹ️ LOW-4: Google OAuth Fallback Without Audience Verification
- **File:** `backend/src/services/authService.js:69-77`
- **Issue:** When `GOOGLE_CLIENT_ID` is not set (it's empty in `.env:35`), the code falls back to calling Google's userinfo endpoint without audience verification. This is less secure than the proper `verifyIdToken` flow.
- **Fix:** Set `GOOGLE_CLIENT_ID` in production to enable proper audience verification.

---

## Recommendations (Priority Order)

### Immediate (CRITICAL)
1. **Delete `audit_db.js`** from the project root — contains hardcoded production database credentials
2. **Rotate database credentials** if `audit_db.js` or `backend/.env` was ever shared
3. **Remove weak test password** (`ChangeThisPassword123!`) from `.env` and documentation
4. **Remove hardcoded credentials** from all committed test scripts, Postman collections, and documentation

### Short-term (HIGH)
5. **Implement account lockout** — lock accounts after N failed attempts (e.g., 5 attempts → 15 min lock)
6. **Chain re-authentication** on destructive database operations (truncate, import, restore)
7. **Fix `verifyResourceOwnership`** to use an allowlist for table/column names
8. **Add per-user rate limiting** on authenticated endpoints
9. **Check role against DB** on sensitive admin operations to handle mid-session role changes

### Medium-term (MEDIUM)
10. Set `GOOGLE_CLIENT_ID` in production for proper OAuth audience verification
11. Switch from `bcryptjs` to native `bcrypt`
12. Remove `unsafe-inline` from CSP where possible
13. Reduce default body size limit
14. Add special character requirement to password policy

### Low-term (LOW)
15. Remove deprecated `X-XSS-Protection` header
16. Ensure `NODE_ENV=test` is never used in production deployments

---

## Positive Findings

The codebase demonstrates several security best practices:

- ✅ **Refresh token rotation with reuse detection** — industry standard
- ✅ **CSRF double-submit cookie pattern** — properly implemented
- ✅ **Parameterized SQL queries** throughout the codebase
- ✅ **Zod validation** on all mutation endpoints
- ✅ **Helmet security headers** with HSTS, CSP, and more
- ✅ **Rate limiting** on all endpoint categories with appropriate thresholds
- ✅ **File upload validation** — type and size restrictions
- ✅ **Database table whitelist** for truncation
- ✅ **Token hashing** — refresh tokens stored as SHA-256, never plaintext
- ✅ **HttpOnly + Secure cookies** for token storage
- ✅ **.env properly gitignored** — credentials not committed
- ✅ **Minimal error messages** — "Invalid credentials" instead of "User not found"
- ✅ **Password strength validation** with zxcvbn entropy checking
- ✅ **Admin/customer cookie separation** — prevents cross-role token misuse

---

*End of Security Audit*
