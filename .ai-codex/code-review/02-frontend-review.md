# Frontend Review

Status: complete
Reviewer: Automated review pass

## Scope

- `apps/frontend/src/App.tsx` — routes, auth wrapping
- `apps/frontend/src/auth/` — login/logout, session validation
- `apps/frontend/src/data/` — client state, workflow API, file API
- `apps/frontend/src/documents/` — generation, preview, export
- `apps/frontend/src/pages/` — income protection, admin

---

## Findings

### Critical

1. **`GET /clients` and `GET /clients/{ref}` are called without authentication check but server also lacks auth guard — confirmed data leak**
   - File: `apps/frontend/src/data/client-data-context.tsx` — fetches `/clients` on mount
   - Problem: Frontend fetches client data without needing auth, and the backend serves it without auth. Double exposure.
   - Why it matters: PII exposed to unauthenticated users.
   - Suggested fix direction: Backend fix (add `_current_user` guard) is the primary fix. Frontend should still call the endpoint as-is.
   - Confidence: Confirmed

2. **`tryRestoreApiSession()` — hardcoded admin credentials in browser-shipped JavaScript**
   - File: `apps/frontend/src/documents/document-api.ts`
   - Function: `tryRestoreApiSession()`
   - Problem: Calls `POST /auth/login` with hardcoded `admin@omega.local` and `ChangeMe123!`. These credentials are visible in the browser's JS bundle to any user who opens DevTools.
   - Why it matters: If the default admin password isn't changed in production, anyone can extract these credentials and gain admin access.
   - Suggested fix direction: Remove `tryRestoreApiSession()` entirely. When the API returns 401, the auth context should redirect to `/login` instead of auto-reauthenticating with baked-in creds.
   - Confidence: Confirmed

### High

1. **`client-data-context.tsx` mirrors client data in React state with no invalidation or freshness guarantees**
   - File: `apps/frontend/src/data/client-data-context.tsx`
   - Problem: Client list is fetched once on mount. No polling, no WebSocket, no event-based invalidation. If another user creates a client, this user's list stays stale until a full page refresh.
   - Why it matters: Stale client lists cause confusion in multi-user scenarios.
   - Suggested fix direction: Add a manual refresh function and expose it via context. Consider polling (every 30s) or server-sent events for real-time updates.
   - Confidence: Confirmed

2. **`income-protection-page.tsx` — 2588 lines, single monolithic component**
   - File: `apps/frontend/src/pages/income-protection-page.tsx`
   - Problem: The entire workflow UI — tabs, forms, file upload, document generation, generated output workspace, template picker — is in one file. No separation of concerns.
   - Why it matters: Maintainability nightmare. Changes to one tab risk breaking another. Testing individual features is nearly impossible.
   - Suggested fix direction: Extract each tab into its own component file. Extract form validation, file management, and document generation into dedicated hooks.
   - Confidence: Confirmed

3. **No frontend delete UI for files or documents**
   - File: `apps/frontend/src/pages/income-protection-page.tsx` (no delete buttons)
   - Problem: Backend supports `DELETE /clients/{ref}/files/{id}` and `DELETE /clients/{ref}/documents/{id}` but the frontend has no buttons to trigger these. Users cannot delete uploaded files or generated documents through the UI.
   - Why it matters: Incomplete feature. Orphaned files/documents accumulate with no UI path to remove them.
   - Suggested fix direction: Add delete buttons to the Files tab and Generated Documents tab lists with confirmation dialogs.
   - Confidence: Confirmed (acknowledged gap in PROJECT.md)

### Medium

1. **`document-api.ts` has `sanitizeGeneratedHtml()` that runs DOMParser on every document generation response**
   - File: `apps/frontend/src/documents/document-api.ts`
   - Problem: `new DOMParser().parseFromString(html, "text/html")` runs client-side HTML sanitization. If the AI or seeded fallback returns malformed HTML, the parser may silently drop content or produce inconsistent DOM.
   - Why it matters: Generated documents may display differently in the preview vs. the final PDF/DOCX export.
   - Suggested fix direction: Complement with server-side HTML validation/sanitization before persisting preview HTML.
   - Confidence: Confirmed

2. **`auth-context.tsx` stores auth state only in `sessionStorage` — lost on tab close**
   - File: `apps/frontend/src/auth/auth-context.tsx`
   - Problem: Auth state (user object) is stored solely in `sessionStorage`. Closing the tab clears it. The cookie session persists server-side but the frontend has no awareness until it re-calls `/auth/me`.
   - Why it matters: User experience: reopening a tab shows a flash of unauthenticated state before the `/auth/me` call completes.
   - Suggested fix direction: Acceptable for security (sessionStorage is per-tab). Add a loading state to prevent flash.
   - Confidence: Informational

3. **`file-api.ts` `downloadFile()` triggers a download by creating a blob URL — no cleanup**
   - File: `apps/frontend/src/data/file-api.ts`
   - Problem: `URL.createObjectURL(blob)` is called but `URL.revokeObjectURL(url)` is never called. The blob URL persists until the page is unloaded.
   - Why it matters: Memory leak on pages where many files are downloaded in one session.
   - Suggested fix direction: Call `URL.revokeObjectURL(url)` after the download is triggered (in a setTimeout or on the anchor's load event).
   - Confidence: Confirmed

4. **`generated-document-api.ts` `downloadDocument()` and `downloadDocumentPack()` — no error handling for blob responses that are actually JSON error objects**
   - File: `apps/frontend/src/documents/generated-document-api.ts`
   - Problem: The functions assume the response is always a blob. If the server returns a JSON error (e.g., `{"detail": "Not found"}`), the code creates a blob from the JSON and triggers a download of a `.json` file instead of showing the error.
   - Why it matters: Confusing UX — user downloads a JSON error file instead of seeing an error message.
   - Suggested fix direction: Check `response.headers.get("content-type")` before treating the response as a blob. If it's `application/json`, parse and throw/show the error.
   - Confidence: Confirmed

### Low

1. **Multiple API helper files (`file-api.ts`, `workflow-api.ts`, `document-api.ts`, `generated-document-api.ts`) duplicate fetch boilerplate**
   - Problem: Each file manually constructs fetch calls with `/clients/{ref}/...` URLs, credentials, and error handling. No shared API client.
   - Why it matters: Inconsistent error handling across API calls. Changes to auth flow or base URL require edits in multiple files.
   - Suggested fix direction: Create a shared `api-client.ts` wrapper that handles base URL, credentials, auth error handling, and JSON parsing.
   - Confidence: Informational

2. **`App.tsx` route `/` redirects to `/income-protection` — no landing page**
   - Problem: Users accessing the root URL are immediately redirected to the Income Protection workflow. No dashboard, no navigation overview.
   - Why it matters: Minor UX concern. Acceptable for an internal tool focused on one workflow.
   - Suggested fix direction: Acceptable as-is. Consider a simple dashboard if more modules are added.
   - Confidence: Informational

3. **`error-boundary.tsx` exists but doesn't appear to catch errors from lazy-loaded content gracefully**
   - Problem: Standard React error boundary. May not catch errors in async event handlers or server-side rendering (not applicable here since it's client-only).
   - Why it matters: Limited recovery for unhandled promise rejections or event handler errors.
   - Suggested fix direction: Add `window.addEventListener("unhandledrejection", ...)` to catch async errors globally.
   - Confidence: Needs confirmation

---

## UX / State Risks

1. **Workflow save (`PUT /clients/{ref}/workflow`) has no optimistic update or loading indicator feedback**
   - The save function calls the API but provides no visual confirmation beyond success/failure. If the network is slow, users may think the save didn't work and re-submit.

2. **File upload has no progress indicator**
   - `uploadFile()` uses `fetch` with `FormData` — no upload progress callback. Large files give no feedback during the upload.

3. **Client list on `/clients` page — no search, filter, or pagination**
   - All clients are loaded at once. For 500+ clients, this becomes slow and unmanageable.

---

## Confirmed Good

- Auth context uses `sessionStorage` (not `localStorage`) for auth mirroring — good security practice.
- Backend is the authoritative source for workflow, files, and generated documents — no `localStorage` fallback remains.
- TypeScript strict mode is used (`tsc --noEmit` passes per verification baseline).
- Frontend route structure matches the documented routes in `api-surface.md`.
- Document generation preview/edit/export flow is well-connected to the backend.
- Pack download (ZIP of all documents) works through a dedicated endpoint.

---

## Post-Fix Status (Prompts 1-3)

| # | Finding | Status |
|---|---------|--------|
| Critical #1 | GET /clients, GET /clients/{ref} data leak | **Fixed** — backend auth guards added |
| Critical #2 | tryRestoreApiSession() hardcoded credentials | **Fixed** — function and credential constants removed |
| High #1 | client-data-context stale client state | **Still Open** |
| High #2 | income-protection-page.tsx 2588-line monolith | **Still Open (deferred)** — needs dedicated refactor pass |
| High #3 | No frontend delete UI for files/documents | **Still Open** |
| Medium #1 | DOMParser sanitization on every response | **Still Open** |
| Medium #2 | sessionStorage auth state lost on tab close | **Still Open** |
| Medium #3 | blob URL memory leak in file-api.ts | **Still Open** |
| Medium #4 | Blob download no error handling for JSON errors | **Still Open** |
| Low #1 | Duplicate fetch boilerplate across API files | **Still Open** |
| Low #2 | No landing page (redirects to /income-protection) | **Still Open** |
| Low #3 | Error boundary limited recovery | **Still Open** |

### Changes affecting frontend from Prompts 1-3
- 401 from `/documents/generate` now throws clear error instead of auto-login with baked-in creds
- CSRF protection on backend — frontend must carry same-origin Origin/Referer
- Upload limit on backend — frontend receives 413 for files >50MB

---

## File-Level Follow-Up

- [ ] Remove `tryRestoreApiSession()` from `document-api.ts`.
- [ ] Add delete buttons to Files and Generated Documents tab UIs.
- [ ] Extract `income-protection-page.tsx` into per-tab components.
- [ ] Add `URL.revokeObjectURL()` in file download functions.
- [ ] Add content-type checking in blob download functions to catch JSON errors.
- [ ] Create shared API client wrapper for fetch boilerplate.
- [ ] Add client list refresh/polling for multi-user scenarios.