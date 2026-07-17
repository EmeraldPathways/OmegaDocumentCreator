# Testing Checklist

This checklist is the current full-project verification pass for `Omega Document Creator`.

## 1. Frontend automated checks

Run from `apps/frontend`:

```powershell
npx.cmd tsc --noEmit --project tsconfig.app.json
npm.cmd test -- --no-cache
npm.cmd run build
```

Pass criteria:

- TypeScript completes with no errors.
- Vitest completes with no failing tests.
- Production build completes with no errors.

## 2. Backend automated checks

Before backend tests, set a dedicated test database. Do not point this at the live app database.

Example:

```powershell
$env:TEST_DATABASE_URL="postgresql://omega:omega_dev_password@127.0.0.1:5432/omega_test"
```

Run from `apps/api`:

```powershell
python -m pip check
python -m pytest
```

Pass criteria:

- `pip check` reports no broken requirements.
- `pytest` runs against the dedicated test database and passes.

## 3. Startup checks

Run from repo root:

```powershell
.\run-omega.cmd
```

Verify:

- Frontend loads on `http://127.0.0.1:3007`
- Backend health responds on `http://127.0.0.1:8007/health`
- No startup crash in frontend or backend logs

## 4. Authentication checks

Verify:

- Login works in the in-app browser
- Login works in Chrome
- Invalid credentials show a failure without crashing the app
- Logout clears the session and returns to logged-out state
- Admin-only pages stay blocked for non-admin users

## 5. Navigation and route checks

Verify:

- Top navigation shows `Clients`, `Fact Find`, `Income Protection`, and `Files/Docs`
- `Pensions` is hidden from the top navigation for now
- `/` redirects to `/fact-find`
- `/income-protection` opens the quote/statement surface
- `/pensions` opens the pensions quote/statement surface directly
- `/files-docs` opens files and generated documents
- legacy `/files` redirects to `/files-docs`
- legacy `/clients/:clientReference/income-protection` stores the selected client and opens income protection

## 6. Clients checks

Verify:

- Clients list loads correctly
- Search clients works
- Create client works
- Edit client works
- Saved client data persists after refresh
- Client profile opens correctly
- Delete client behavior is verified carefully because this flow currently needs review

## 7. Fact Find checks

Verify:

- Fact Find page only shows `Fact Find` and `Fact Find Update` tabs
- Partner toggle is off by default
- Partner fields appear only when the toggle is enabled
- `Pension Arrangements - Partner` stays hidden until partner toggle is enabled
- Second client signature stays hidden until partner toggle is enabled
- `Additional Relevant Information` layout renders correctly
- `Services Requested` layout renders correctly
- `Data Protection & Marketing Preferences` layout renders correctly
- `PEP Confirmation` layout renders correctly
- Edit, preview, and export stay in sync for Fact Find
- Fact Find generation requirements card is visible and accurate

## 8. Income Protection checks

Verify:

- Income Protection page only shows `Quote` and `Statement of Suitability`
- No-deferred provider toggle is off by default
- `No deferred provider` and `Deferred period provider` sections appear only when enabled
- Quote form fields render in the intended 3-column layout on desktop
- Quote table formatting is correct, especially discount placement and long labels
- Generated quote content refreshes after changing quote inputs
- Statement form matches the expected layout and current wording
- Edit, preview, and export stay in sync for Quote
- Edit, preview, and export stay in sync for Statement of Suitability
- Quote generation requirements card is visible and accurate
- Statement generation requirements card is visible and accurate

## 9. Pensions checks

Verify:

- Pensions route is reachable directly even though it is hidden from the top navigation
- Pensions page only shows `Quote` and `Statement of Suitability`
- Pensions quote uses its own flow and fields
- Pensions statement uses its own flow
- Fact Find data is reused where intended
- Pensions API integration for quote behaves correctly
- Edit, preview, and export stay in sync for pensions quote/statement

## 10. Files and Generated Documents checks

Verify:

- `Files/Docs` shows only `Files` and `Generated Documents`
- Existing files appear correctly
- Generated documents appear correctly
- File upload works
- File download works
- File delete works
- Generated document preview works
- Generated DOCX export works
- Generated PDF export works
- Download document pack works

## 11. Document generation checks

Verify for each supported document:

- `Fact Find`
- `Fact Find Update`
- `Quote`
- `Statement of Suitability`
- `Pensions Quote`
- `Pensions Statement`

For each document verify:

- Generation succeeds
- Edit view loads correctly
- Preview view matches the edit content
- Exported DOCX is correct
- Exported PDF is correct
- Header, spacing, table formatting, and recommendation content are correct

## 12. Data persistence checks

Verify:

- Saving workflow data persists after refresh
- Generated draft content persists after refresh
- Selected client persists when expected
- Local fallback behavior works when backend is unavailable
- Backend-backed file/document lists refresh after create/delete actions

## 13. Error-handling checks

Verify:

- Backend unavailable state does not crash the frontend
- Failed saves show an error toast
- Failed document generation shows an error state
- Failed file upload/download shows an error state
- Empty states render cleanly when no files/documents exist

## 14. Security and dependency checks

Verify:

- Frontend dependency audit remains clean
- Python dependency check remains clean via `python -m pip check`
- If Snyk CLI is available later, run both frontend and backend scans and capture results

Suggested future commands if tooling is installed:

```powershell
snyk test
snyk test --file=apps/api/pyproject.toml --package-manager=pip
```

## 15. Release sign-off

Before pushing or releasing, confirm:

- All automated checks pass
- Critical manual flows above have been tested
- No new console errors appear during the tested flows
- Branch contains only intended changes
