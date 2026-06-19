# Decisions Archive

Architectural choices reflected in the current codebase.

## Workflow client stays in page state

- Decision: `income-protection-page.tsx` owns the selected workflow client.
- Why: the route stays stable at `/income-protection`, while client switching is local UX state.

## Cookie session, not JWT

- Decision: auth uses Starlette `SessionMiddleware`.
- Why: internal office app, browser-first usage, simpler server-side invalidation.

## Browser persistence is temporary

- Decision: workflow/client state persists in `client-data-context.tsx` via `localStorage`.
- Why: enough to support the current scaffold before backend persistence exists.

## Document composition remains centralized

- Decision: composed workflow HTML is built through `workflow-document-builders.ts` and shared document-composer helpers.
- Why: preview/edit/export should stay aligned.

## Seeded fallback belongs in document generation

- Decision: `document_generation.py` decides fallback content, not `ai.py`.
- Why: fallback is a document concern.

## Client references are human-readable

- Decision: `build_client_reference()` uses `CLI-YYYY-NNNN`.
- Why: stable office-friendly references and storage naming.

## Local run ports are pinned

- Decision: use `127.0.0.1:3007` for frontend and `127.0.0.1:8007` for backend when running locally.
- Why: these are the live script/config values in the repo.
