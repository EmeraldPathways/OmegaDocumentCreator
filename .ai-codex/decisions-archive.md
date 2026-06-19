# Decisions Archive

Architectural choices made and why. Do not reverse these without explicit instruction.

## Workflow client in page state, not route

**Decision**: Selected Income Protection client stored inside `income-protection-page.tsx`, not in URL params.
**Why**: Workflow is multi-tab and client switching is part of the UX; routing adds complexity without benefit at this stage.

## Document composer as single export source

**Decision**: `document-composer.ts` produces styled HTML used for both preview display AND PDF/DOCX export.
**Why**: Guarantees what-you-see-is-what-you-export. Do not split into separate preview vs export renderers.

## Seeded fallback in document_generation.py, not ai.py

**Decision**: Fallback content lives in `document_generation.py`, not in the AI wrapper.
**Why**: Keeps `ai.py` as a clean transport layer. Fallback is a document concern, not an AI concern.

## Cookie session, not JWT

**Decision**: Starlette `SessionMiddleware` with server-side session cookie.
**Why**: Internal office app. No mobile clients. Simpler and more secure than token management for this use case.

## Port 3001 for frontend

**Decision**: `vite.run.config.ts` binds `127.0.0.1:3001`.
**Why**: Port 3000 was already in use on the office development machine. Do not change without checking conflicts.

## client_reference as primary key

**Decision**: Clients are keyed by `client_reference` (e.g. `OMG-001`), not auto-increment ID.
**Why**: Human-readable, stable across import/export, used in file storage paths.

## Cloudflare Tunnel for remote access (not open ports)

**Decision**: Remote access must use Cloudflare Tunnel with Cloudflare Access.
**Why**: Office server should never have public ports open. Tunnel provides HTTPS + auth without port exposure.
**Config**: `.env.example` has `REMOTE_ACCESS_MODE=local_only` as default.

## Browser storage for drafts (temporary)

**Decision**: Workflow drafts currently persist in browser storage via `client-data-context.tsx`.
**Why**: Stage scaffold to prove UX before DB persistence is wired.
**Replace with**: API-backed save/load when persistence scope is implemented.

## Staging approach (17 stages)

**Decision**: Incremental stage-by-stage delivery, each stage leaving previous stages working.
**Why**: Allows partial deployment and testing on an office server without a full rewrite cycle.
