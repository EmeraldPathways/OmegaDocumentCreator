# Decisions Archive

Architectural choices reflected in the current codebase.

## Backend is the authority

- Decision: live client records, workflow records, files, generated documents, audit rows, backups, and sessions are backend-backed.
- Why: browser storage cannot be trusted for office records or access control.

## Cookie session, not JWT

- Decision: auth uses Starlette `SessionMiddleware` plus persisted session rows.
- Why: internal office app, browser-first usage, simpler invalidation and audit visibility.

## Assignment is client-scoped

- Decision: access is derived from the client record and inherited by workflows, files, and generated documents.
- Why: avoids separate permission models drifting apart.

## Restore execution is guarded

- Decision: restore requires validation or dry-run first, then a short-lived approval token, then confirmation text.
- Why: destructive restore actions need a deliberate operator flow.

## Document composition remains centralized

- Decision: composed document HTML stays in shared builders/composer helpers.
- Why: preview, edit, export, and persisted artifacts need to stay aligned.

## Seeded fallback belongs in document generation

- Decision: `document_generation.py` decides fallback content, not `ai.py`.
- Why: fallback is a document concern, while `ai.py` is transport/prompt plumbing.

## Client storage naming is office-friendly

- Decision: external references stay `CLI-YYYY-NNNN`, while disk folders use `Last, First - omega-00000`.
- Why: office users need readable references and stable client folders.

## Local run ports are pinned

- Decision: local scripts use `127.0.0.1:3007` for frontend and `127.0.0.1:8007` for backend.
- Why: these are the live script/config values in the repo.
