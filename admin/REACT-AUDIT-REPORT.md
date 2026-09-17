# React Anti-Pattern Audit Report — admin/src

**Audited:** 73 JSX/JSX files  
**Date:** 2026-09-04

---

## SUMMARY BY SEVERITY

| Severity | Count |
|----------|-------|
| CRITICAL | 4     |
| HIGH     | 18    |
| MEDIUM   | 27    |
| LOW      | 12    |

---

## 1. MISSING KEY PROPS IN .map()

### Finding 1.1 — MEDIUM
- **File:** `components/DashboardCharts.jsx`, line 257
- **Code:** `{data.map((entry, index) => (`
- **Issue:** Uses array `index` as key for chart Cells. While acceptable for static lists, Recharts can re-render incorrectly if data reorders.
- **Fix:** Use a stable unique identifier from the data if available (e.g., `entry.date`).

### Finding 1.2 — LOW
- **File:** `components/DashboardCharts.jsx`, line 268
- **Code:** `{localizedData.map((entry, index) => (`
- **Key:** `key={index}` — uses index as key for legend items.
- **Fix:** Use `entry.name` or another stable identifier.

---

## 2. INVALID HTML NESTING

### Finding 2.1 — CRITICAL
- **File:** `pages/AcceptInvitePage.jsx`, line 60
- **Code:**
  ```jsx
  <label>{t('invite.newPassword')}<div className="invite-password"><LockKeyhole size={17} /><input .../><button ...>...</button></div></label>
  ```
- **Issue:** `<div>` inside `<label>` — invalid HTML. `<label>` is an inline element; block elements like `<div>` are not permitted inside it per the HTML spec. Browsers may break accessibility and assistive technology behavior.
- **Fix:** Replace `<label>` with a `<div>` wrapper, or use `<label htmlFor="...">` with the input having a matching `id`.

### Finding 2.2 — HIGH
- **File:** `pages/AcceptInvitePage.jsx`, line 60
- **Code:** Same line as above — also contains a `<button>` inside a `<label>`.
- **Issue:** Clicking the button also toggles the label's implicit control binding, causing confusing double-toggle behavior. The button inside the label intercepts clicks meant for the label.
- **Fix:** Move the button outside the label, or use explicit `<label htmlFor>` association.

### Finding 2.3 — MEDIUM
- **File:** `pages/AcceptInvitePage.jsx`, line 59
- **Code:** `<label>{t('invite.email')}<input value={invitation.email} disabled /></label>`
- **Issue:** Implicit label association via nesting works, but inline `<input>` inside `<label>` without `htmlFor`/`id` is not best practice and can confuse screen readers when the label also contains text before the input.
- **Fix:** Use explicit `<label htmlFor="invite-email">` with `id="invite-email"` on the input.

---

## 3. UNUSED useState

### Finding 3.1 — LOW
- **File:** `components/StockMovementLogs.jsx`, line 38
- **Code:** `const [loading, setLoading] = useState(true);`
- **Issue:** `loading` state is set (line 49: `setLoading(true)`) but never read in the component's render. The loading indicator is handled by MUI's `CircularProgress` based on the `logs` array being empty, not the `loading` state.
- **Fix:** Either use `loading` in the render to show/hide a loading indicator, or remove the state entirely.

### Finding 3.2 — LOW
- **File:** `components/StockMovementLogs.jsx`, line 39
- **Code:** `const [error, setError] = useState(null);`
- **Issue:** `error` state is set in the catch block but never used in the render output. Errors are logged to console but not displayed to the user.
- **Fix:** Display the error state in the UI, or remove it.

---

## 4. DIRECT DOM MANIPULATION

### Finding 4.1 — HIGH
- **File:** `components/ConfirmationModal.jsx`, lines 36, 41–42
- **Code:**
  ```jsx
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = '0px';  // in cleanup
  ```
- **Issue:** Directly mutates `document.body.style` from within a `useEffect`. If multiple modals are open simultaneously, the cleanup of one will incorrectly reset styles for another.
- **Fix:** Use a ref-counting approach or a portal-based solution that tracks modal stacking.

### Finding 4.2 — HIGH
- **File:** `components/InvoiceModal.jsx`, lines 117–153
- **Code:**
  ```jsx
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  setTimeout(() => document.body.removeChild(iframe), 1000);
  ```
- **Issue:** Creates DOM elements imperatively. The iframe removal relies on a fixed 1000ms timeout — if the print dialog is still open or the component unmounts before cleanup, the iframe leaks.
- **Fix:** Use React portals or ensure cleanup runs on unmount.

### Finding 4.3 — MEDIUM
- **File:** `pages/CollectionFormPage.jsx`, lines 664, 713
- **Code:**
  ```jsx
  onClick={() => document.getElementById('file-input-banner_image').click()}
  ```
- **Issue:** Uses `document.getElementById` to trigger a file input. Fragile — breaks if the element ID changes, and bypasses React's declarative model.
- **Fix:** Use a `useRef` to hold the file input reference.

### Finding 4.4 — MEDIUM
- **File:** `components/forms/RichTextEditor.jsx`, lines 33, 112
- **Code:**
  ```jsx
  const input = document.createElement('input');  // line 33 (file picker)
  const tempDiv = document.createElement('div');  // line 112 (count chars)
  ```
- **Issue:** Direct DOM creation inside a React component. The `tempDiv` on line 112 is acceptable for a one-off computation, but `document.createElement('input')` on line 33 for file picking bypasses React.
- **Fix:** Use `useRef` for the file input; the tempDiv usage is acceptable.

### Finding 4.5 — LOW (widespread pattern)
- **Files:** `pages/ProductDetailsPage.jsx` (lines 104–162), `pages/OrdersListPage.jsx` (lines 120–127), `pages/ProductsListPage.jsx` (lines 165–170), `pages/SettingsPage.jsx` (lines 351–566), `pages/NewsletterSubscribersPage.jsx` (lines 80–87), `components/StockMovementLogs.jsx` (line 117)
- **Code pattern:**
  ```jsx
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  ```
- **Issue:** Repeated pattern of imperative DOM manipulation for file downloads. While functional, it's duplicated across 6+ files and not cleaned up on unmount.
- **Fix:** Extract into a shared utility function (e.g., `utils/download.js`).

### Finding 4.6 — LOW
- **File:** `pages/SettingsPage.jsx`, line 288
- **Code:** `window.location.reload();`
- **Issue:** Full page reload in a SPA. Destroys all React state and causes a flash.
- **Fix:** Use React Router navigation or re-fetch data.

---

## 5. useEffect DEPENDENCY ISSUES

### Finding 5.1 — CRITICAL
- **File:** `components/StockMovements.jsx`, lines 76–155
- **Code:**
  ```jsx
  const fetchMovements = async () => {
    // uses: rowsPerPage, page, filterWarehouse, filterType, filterProduct
    // calls: setMovements, setError, setLoading
  };
  // ...
  useEffect(() => {
    fetchMovements();
    fetchWarehouses();
    fetchProducts();
    fetchCostAnalysis();
  }, [page, rowsPerPage, filterWarehouse, filterType, filterProduct]);
  ```
- **Issue:** `fetchMovements`, `fetchWarehouses`, `fetchProducts`, and `fetchCostAnalysis` are defined as plain async functions inside the component body but are NOT listed in the dependency array. Since they close over state variables like `API_URL` (which is stable), this *works*, but the ESLint `react-hooks/exhaustive-deps` rule would flag this. More critically, these functions are recreated every render, meaning the effect captures stale closures in certain timing scenarios.
- **Fix:** Wrap fetch functions in `useCallback`, or move the fetching logic inside the useEffect.

### Finding 5.2 — CRITICAL
- **File:** `components/StockMovementLogs.jsx`, line 109
- **Code:**
  ```jsx
  useEffect(() => {
    // ...
    refresh();  // calls fetchLogs() and fetchStats()
    const interval = setInterval(refresh, 120000);
    // ...
  }, [lines]);
  ```
- **Issue:** `refresh`, `fetchLogs`, and `fetchStats` are NOT in the dependency array. These functions are recreated each render, so the `setInterval` captures a stale version of `refresh` — it will always use the `lines` value from when the effect last ran, not the current value.
- **Fix:** Add the fetch functions to the dependency array (wrapped in `useCallback`), or move them inside the effect.

### Finding 5.3 — HIGH
- **File:** `components/forms/ProductWizard/Step1BasicInfo.jsx`, lines 34–36
- **Code:**
  ```jsx
  useEffect(() => {
    validateStep();
  }, [formData.name, formData.sku, formData.categoryId, formData.serialNumber, isValid]);
  ```
- **Issue:** `validateStep` is not in the dependency array. It's defined in the component body and likely references other state/props. If `validateStep` changes identity between renders, the effect may use a stale version.
- **Fix:** Either include `validateStep` in deps or refactor it to be stable.

### Finding 5.4 — MEDIUM
- **File:** `components/forms/ProductWizard/WizardContainer.jsx`, line 56
- **Code:**
  ```jsx
  useEffect(() => {
    if (isEdit && initialData && !hasLoadedInitialData.current) {
      updateMultipleFields(initialData);
      hasLoadedInitialData.current = true;
    }
  }, [isEdit, initialData]);
  ```
- **Issue:** `updateMultipleFields` is excluded from the deps with the comment "stable, no need to include." While this is likely true, it violates the exhaustive-deps rule and could cause issues if the function identity ever changes.
- **Fix:** Include it in the dependency array or memoize it at the source.

### Finding 5.5 — MEDIUM
- **File:** `components/forms/ProductWizard/Step1BasicInfo.jsx`, line 43
- **Code:**
  ```jsx
  useEffect(() => {
    if (formData.sku && formData.sku.length >= 3) {
      validateSku(formData.sku, productId ? { excludeProductId: productId } : undefined);
    }
  }, []); // Run once on mount
  ```
- **Issue:** Empty dependency array with a comment "Run once on mount" — but the effect references `formData.sku`, `validateSku`, and `productId` which are not in the deps. If any of these change after mount, the effect uses stale values.
- **Fix:** Either add the necessary deps or use a ref to capture the initial values.

### Finding 5.6 — MEDIUM
- **File:** `components/forms/ProductWizard/Step4Review.jsx`, line 35
- **Code:**
  ```jsx
  useEffect(() => {
    loadReviewData();
  }, []);
  ```
- **Issue:** `loadReviewData` is not memoized and not in the deps array. ESLint would warn about this.
- **Fix:** Either wrap `loadReviewData` in `useCallback` or move it inside the effect.

### Finding 5.7 — MEDIUM
- **File:** `pages/OrdersListPage.jsx`, lines 38–40
- **Code:**
  ```jsx
  useEffect(() => {
    loadOrders();
  }, [filters, activeTab]);
  ```
- **Issue:** `loadOrders` is not in the dependency array. Recreated every render.
- **Fix:** Wrap in `useCallback` or move logic inside the effect.

### Finding 5.8 — MEDIUM
- **File:** `pages/ProductDetailsPage.jsx`, lines 222–224
- **Code:**
  ```jsx
  useEffect(() => {
    loadProduct();
  }, [id]);
  ```
- **Issue:** `loadProduct` not in dependency array.
- **Fix:** Same as above.

---

## 6. setState AFTER UNMOUNT / MISSING CLEANUP

### Finding 6.1 — HIGH
- **File:** `components/BarcodeManager.jsx`, lines 63, 100
- **Code:**
  ```jsx
  setTimeout(() => setSuccess(false), 3000);  // line 63
  setTimeout(() => setSuccess(false), 2000);  // line 100
  ```
- **Issue:** `setTimeout` callbacks call `setSuccess(false)` without cleanup. If the component unmounts before the timer fires, this causes a "Can't perform a React state update on an unmounted component" warning.
- **Fix:** Store timer IDs and clear them in a `useEffect` cleanup, or use an `AbortController` / `isMounted` flag.

### Finding 6.2 — HIGH
- **File:** `components/PostCreationBarcodeModal.jsx`, line 20
- **Code:**
  ```jsx
  setTimeout(() => setCopying(false), 1500);
  ```
- **Issue:** Same as 6.1 — uncleaned setTimeout calling setState.
- **Fix:** Use `useEffect` cleanup to clear the timeout.

### Finding 6.3 — HIGH
- **File:** `pages/BarcodeScannerPage.jsx`, line 77
- **Code:**
  ```jsx
  setTimeout(() => {
    navigate(`/products/${productId}`);
  }, 500);
  ```
- **Issue:** setTimeout not cleaned up. If the component unmounts within 500ms (e.g., user navigates away), `navigate` is called on an unmounted component.
- **Fix:** Store timer ref and clean up in useEffect.

### Finding 6.4 — MEDIUM
- **File:** `pages/ProductDetailsPage.jsx`, line 192
- **Code:**
  ```jsx
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  ```
- **Issue:** Uses `window.setTimeout` without cleanup. If the component unmounts before the timeout, the revoke happens on a potentially invalid context.
- **Fix:** Use a ref-based cleanup pattern.

### Finding 6.5 — MEDIUM
- **File:** `components/InvoiceModal.jsx`, line 153
- **Code:**
  ```jsx
  setTimeout(() => document.body.removeChild(iframe), 1000);
  ```
- **Issue:** If the InvoiceModal unmounts before the 1000ms timeout, `removeChild` will fail because the iframe was already removed by React cleanup.
- **Fix:** Check if the iframe is still in the DOM before removing, or use a ref.

---

## 7. console.log/warn/error STATEMENTS

### Finding 7.1 — HIGH (Production Console Pollution)
- **Total count:** 115+ console statements across the codebase
- **Worst offender:** `components/forms/ProductWizard/Step3DetailsMedia.jsx` — 14 console.log statements (lines 81, 91, 96, 99, 103, 106, 112, 116, 118, 126, 135, 138, 141)
- **Second worst:** `App.jsx` — 12 console.log statements (lines 100, 102, 114, 129, 177, 181, 188, 195, 211, 215, 266)
- **Third worst:** `components/NotificationBell.jsx` — 10 console.debug/error statements (lines 103, 108, 110, 130, 136, 163, 183, 192, 196)

**High-severity console statements (should be removed for production):**

| File | Line | Statement |
|------|------|-----------|
| `App.jsx` | 100 | `console.log("[App] Session verified, user:", ...)` |
| `App.jsx` | 114 | `console.log("[App] Session check failed:", ...)` |
| `App.jsx` | 177 | `console.log(\`[App] Received cross-tab event: ${type}\`)` |
| `App.jsx` | 181 | `console.log('[App] Cross-tab logout detected...')` |
| `App.jsx` | 188 | `console.log('[App] Cross-tab login detected...')` |
| `App.jsx` | 195 | `console.log('[App] BroadcastChannel error:', ...)` |
| `App.jsx` | 211 | `console.log('[App] Tab became visible but...')` |
| `App.jsx` | 215 | `console.log('[App] Tab became visible...')` |
| `Step3DetailsMedia.jsx` | 81 | `console.log('[uploadImages] Starting batch upload:', ...)` |
| `Step3DetailsMedia.jsx` | 91 | `console.log('[uploadImages] Uploading files:', ...)` |
| `Step3DetailsMedia.jsx` | 96 | `console.log('[uploadImages] Upload batch completed:', ...)` |
| `Step3DetailsMedia.jsx` | 99 | `console.log('[uploadImages] Successful uploads:', ...)` |
| `Step3DetailsMedia.jsx` | 103 | `console.log('[uploadImages] Final images array:', ...)` |
| `Step3DetailsMedia.jsx` | 112 | `console.log('[uploadSingleImage] Starting upload:', ...)` |
| `Step3DetailsMedia.jsx` | 116 | `console.log('[uploadSingleImage] Calling uploadImage...')` |
| `Step3DetailsMedia.jsx` | 118 | `console.log('[uploadSingleImage] Upload response...')` |
| `Step3DetailsMedia.jsx` | 126 | `console.log('[uploadSingleImage] Upload completed...')` |
| `Step3DetailsMedia.jsx` | 135 | `console.log('[uploadSingleImage] Image object created...')` |
| `NotificationBell.jsx` | 103 | `console.debug('[NotificationBell] Not authenticated...')` |
| `NotificationBell.jsx` | 108 | `console.debug('[NotificationBell] Poll skipped...')` |
| `NotificationBell.jsx` | 130 | `console.debug('[NotificationBell] Failed to fetch...')` |
| `NotificationBell.jsx` | 192 | `console.debug('[NotificationBell] Not authenticated...')` |
| `NotificationBell.jsx` | 196 | `console.debug('[NotificationBell] Authenticated...')` |

**Fix:** Remove all `console.log` and `console.debug` statements for production. Use a proper logging library (e.g., `loglevel`, `debug`) that can be tree-shaken or disabled in production builds.

---

## 8. dangerouslySetInnerHTML

### Finding 8.1 — HIGH
- **File:** `pages/ProductDetailsPage.jsx`, line 701
- **Code:**
  ```jsx
  dangerouslySetInnerHTML={{
    __html: getLocalizedText(product.description || product.fullDescription)
  }}
  ```
- **Issue:** Renders user-supplied HTML content without sanitization. If a product description contains malicious scripts, this creates an XSS vulnerability.
- **Fix:** Sanitize HTML with `DOMPurify` before rendering: `DOMPurify.sanitize(html)`.

### Finding 8.2 — HIGH
- **File:** `pages/UsersListPage.jsx`, line 368
- **Code:**
  ```jsx
  <span dangerouslySetInnerHTML={{
    __html: getLocalizedName(user.name) || t('common.na')
  }} />
  ```
- **Issue:** User name rendered as raw HTML. If user names contain HTML (e.g., `<script>`), this is an XSS vector.
- **Fix:** Use text content instead of `dangerouslySetInnerHTML`, or sanitize.

### Finding 8.3 — MEDIUM
- **File:** `pages/NewsletterBroadcastPage.jsx`, line 455
- **Code:**
  ```jsx
  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selectedBroadcast.content) }}
  ```
- **Issue:** This one is **sanitized** via `sanitizeRichHtml`, which is good. But verify that `sanitizeRichHtml` uses a proper allowlist (not just string replacement).
- **Fix:** Audit the `sanitizeRichHtml` function to ensure it uses DOMPurify or equivalent.

---

## 9. DEPRECATED REACT PATTERNS

### Finding 9.1 — None found
- No instances of `findDOMNode`, `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate`, `UNSAFE_` lifecycle methods, or string refs were found.
- **Status:** ✅ Clean

---

## 10. MEMORY LEAKS

### Finding 10.1 — MEDIUM
- **File:** `pages/OrderFormPage.jsx`, lines 92–103
- **Code:**
  ```jsx
  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearch.length > 2) {
        searchProducts(productSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);
  ```
- **Issue:** This one is **correctly cleaned up**. ✅ However, `searchProducts` is not in the deps — same stale closure risk as Finding 5.7.

### Finding 10.2 — LOW (Potential)
- **File:** `components/NotificationBell.jsx`, lines 206–208
- **Code:**
  ```jsx
  const scheduleNext = (delayMs) => {
    clearTimers();
    pollingTimeoutRef.current = setTimeout(runPoll, delayMs);
  };
  ```
- **Issue:** `runPoll` is defined inside the effect and captures `fetchUnreadCount`. Since `fetchUnreadCount` is a stable `useCallback` with `[]` deps, this is safe. The cleanup function properly calls `clearTimers()`. ✅ No leak here.

### Finding 10.3 — LOW
- **File:** `components/InvoiceModal.jsx`, lines 117–153
- **Code:** Creates an iframe and removes it via setTimeout.
- **Issue:** If the component unmounts before the setTimeout fires (e.g., user quickly closes the modal during print), the iframe remains in the DOM.
- **Fix:** Track the iframe with a ref and clean up in useEffect.

---

## 11. PROP DRILLING

### Finding 11.1 — MEDIUM
- **File:** `components/forms/ProductWizard/WizardContainer.jsx`
- **Issue:** The WizardContainer passes 7+ props to each step component (`formData`, `updateFormData`, `errors`, `clearError`, `setStepValid`, `productId`, etc.). Each step then passes some of these further down to child components.
- **Fix:** Consider using React Context (e.g., `WizardContext`) to share form state, or use `useReducer` with context.

### Finding 11.2 — MEDIUM
- **File:** `components/DataTable.jsx`
- **Issue:** DataTable receives `onSelectAll`, `onSelectRow`, `onRowClick`, `onSort`, `onPageChange`, `onPageSizeChange` — 6 callback props. The parent pages (e.g., `ProductsListPage`, `OrdersListPage`) must thread these through.
- **Fix:** This is a common pattern for generic table components and is acceptable, but consider a compound component pattern for complex use cases.

---

## 12. INLINE FUNCTIONS IN JSX

### Finding 12.1 — MEDIUM (widespread pattern)
- **Count:** 170+ inline arrow functions in JSX across the codebase
- **Examples:**
  - `components/DataTable.jsx`: lines 136, 150, 159, 192, 215, 225
  - `layouts/AdminLayout.jsx`: lines 125, 150, 169, 184, 198, 209, 246, 272, 285
  - `pages/TeamAccessPage.jsx`: lines 295, 310, 330, 334, 339, 343, 346, 350, 352, 368, 381, 382, 385, 420, 428, 436, 452, 457, 465
  - Nearly every page file

- **Typical examples:**
  ```jsx
  // DataTable.jsx:136
  onClick={() => onPageChange(page - 1)}
  // AdminLayout.jsx:150
  onClick={() => toggleMenu(item.id)}
  // OrdersListPage.jsx:240
  onClick={() => setActiveTab(tab.id)}
  ```

- **Issue:** Each inline arrow creates a new function reference on every render, which causes child components to re-render unnecessarily if they are wrapped in `React.memo`.
- **Fix:** For performance-critical paths (lists, tables with many rows), use `useCallback` handlers or pass the event with data attributes. For simple UI interactions (button clicks), the impact is negligible — these are LOW severity.
- **Notable high-impact instances:**
  - `components/DataTable.jsx` line 215: `onClick={() => onRowClick && onRowClick(row)}` — called for every row; if `DataTable` is ever memoized, this defeats it.
  - `pages/TeamAccessPage.jsx` lines 330–352: Many inline handlers in a member list that could cause re-renders.

---

## ADDITIONAL FINDINGS

### Finding A.1 — HIGH: window.confirm() in Production
- **File:** `pages/TeamAccessPage.jsx`, lines 146, 175, 246, 262
- **Code:**
  ```jsx
  if (!window.confirm(t('teamAccess.confirm.passwordReset', ...))) return;
  if (!window.confirm(t('teamAccess.confirm.deleteRole', ...))) return;
  ```
- **Issue:** Uses `window.confirm()` which is a blocking native dialog. The app already has a `useConfirmation` hook with a custom modal. Mixing native and custom confirmation dialogs creates an inconsistent UX.
- **Fix:** Replace all `window.confirm()` calls with the `useConfirmation` hook that's already used elsewhere (e.g., `OrderDetailPage.jsx`).

### Finding A.2 — MEDIUM: window.open() without cleanup
- **File:** `pages/CategoriesListPage.jsx`, line 320
- **Code:** `printWindow = window.open('', '_blank', 'width=1100,height=800');`
- **Issue:** Opens a new window for printing. If the component unmounts before the print window closes, the reference is lost and cleanup can't run.
- **Fix:** Track the window reference and close it on unmount.

### Finding A.3 — LOW: Inline styles in JSX
- **Files:** `pages/BarcodeScannerPage.jsx` (lines 105–242), `pages/OrderFormPage.jsx` (line 312), `pages/SettingsPage.jsx` (multiple)
- **Issue:** Large blocks of inline styles create new objects on every render, causing unnecessary re-renders and making the code harder to maintain.
- **Fix:** Move to CSS classes or CSS modules.

---

## PRIORITIZED REMEDIATION PLAN

### Immediate (CRITICAL)
1. Fix `<div>` inside `<label>` in `AcceptInvitePage.jsx` (Finding 2.1)
2. Add `useCallback` to fetch functions in `StockMovements.jsx` (Finding 5.1)
3. Add `useCallback` to fetch functions in `StockMovementLogs.jsx` (Finding 5.2)
4. Sanitize `dangerouslySetInnerHTML` in `ProductDetailsPage.jsx` with DOMPurify (Finding 8.1)

### Short-term (HIGH)
5. Remove all `console.log` and `console.debug` from production code (Finding 7.1)
6. Add cleanup for `setTimeout` calls in `BarcodeManager.jsx`, `PostCreationBarcodeModal.jsx`, `BarcodeScannerPage.jsx` (Findings 6.1–6.3)
7. Sanitize `dangerouslySetInnerHTML` in `UsersListPage.jsx` (Finding 8.2)
8. Replace `window.confirm` with custom `useConfirmation` hook in `TeamAccessPage.jsx` (Finding A.1)
9. Fix `ConfirmationModal.jsx` body style mutation (Finding 4.1)

### Medium-term (MEDIUM)
10. Fix missing dependency arrays across all useEffect calls (Findings 5.3–5.8)
11. Extract repeated DOM manipulation download pattern into a shared utility (Finding 4.5)
12. Replace `document.getElementById` with `useRef` in `CollectionFormPage.jsx` (Finding 4.3)
13. Consider Context for WizardContainer prop drilling (Finding 11.1)

### Low-term (LOW)
14. Remove unused `loading` and `error` state in `StockMovementLogs.jsx` (Findings 3.1–3.2)
15. Use stable keys instead of array indices in DashboardCharts (Findings 1.1–1.2)
16. Move inline styles to CSS modules (Finding A.3)
17. Optimize inline functions in performance-critical DataTable/TeamAccess paths (Finding 12.1)
