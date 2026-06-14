# AI Document Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered document creation to Omega's Income Protection workflow so Fact Find, Terms of Business, and Statement of Suitability documents are generated as styled, reviewable, exportable documents instead of plain field dumps.

**Architecture:** Keep the current React + FastAPI shape. Add a small backend AI generation boundary for prompt construction and provider calls, then build a frontend document-composition layer that turns AI output plus workflow data into styled HTML reused by preview, PDF export, DOCX export, and generated-document history.

**Tech Stack:** React, TypeScript, Vitest, FastAPI, Pydantic, `jspdf`, `html2canvas`, `docx`, `file-saver`

---

## Source Notes

- Omega current state came from `PROJECT.md`.
- Legacy behavior reference came from `dynamic-ai-document-generator/PROJECT_OVERVIEW.md` and `dynamic-ai-document-generator/PROJECT_REVIEW.md`.
- This plan intentionally ignores broader roadmap work and focuses only on AI-backed document creation.

## File Structure

### Existing files to modify

- `apps/api/app/config.py`
  - Add AI settings.
- `apps/api/app/main.py`
  - Add generation endpoint.
- `apps/api/app/store.py`
  - Extend seeded generated-document records and saved generated content.
- `apps/api/tests/test_api.py`
  - Add API tests for AI generation fallback and saved generated documents.
- `apps/frontend/src/data/seeded-clients.ts`
  - Add richer generated-document metadata and template defaults.
- `apps/frontend/src/data/client-data-context.tsx`
  - Persist generated preview content and generation drafts.
- `apps/frontend/src/documents/workflow-document-builders.ts`
  - Replace plain output with structured document sections.
- `apps/frontend/src/documents/export-generated-document.ts`
  - Export composed styled content rather than rebuilding from raw profile fields.
- `apps/frontend/src/documents/pdf-export.ts`
  - Preserve styled sections and visual blocks in PDF output.
- `apps/frontend/src/documents/word-export.ts`
  - Preserve headings, lists, callouts, and key-value blocks in DOCX.
- `apps/frontend/src/pages/income-protection-page.tsx`
  - Replace placeholder generation flow with AI-generate -> review -> export.
- `apps/frontend/src/app.test.tsx`
  - Cover the new user flow.

### New files to create

- `apps/api/app/ai.py`
  - Prompt builder and provider integration boundary.
- `apps/api/app/document_generation.py`
  - Generation orchestration and seeded fallback.
- `apps/frontend/src/documents/document-types.ts`
  - Shared types for templates, generated sections, and composed blocks.
- `apps/frontend/src/documents/document-templates.ts`
  - Built-in template definitions for the three workflow documents.
- `apps/frontend/src/documents/document-composer.ts`
  - Converts workflow data + AI result into styled HTML blocks.
- `apps/frontend/src/documents/document-api.ts`
  - Frontend API client for generation calls.
- `apps/frontend/src/documents/document-preview.tsx`
  - Review/edit preview surface before export.
- `apps/frontend/src/documents/template-picker.tsx`
  - Template selector inside the workflow.

## Task 1: Add the backend AI generation boundary

**Files:**
- Create: `apps/api/app/ai.py`
- Create: `apps/api/app/document_generation.py`
- Modify: `apps/api/app/config.py`
- Modify: `apps/api/app/main.py`

- [ ] Add config fields:
  - `AI_ENABLED`
  - `AI_PROVIDER`
  - `AI_API_KEY`
  - `AI_MODEL`
- [ ] Add a generation service that accepts:
  - `client_reference`
  - `document_type`
  - `template_id`
  - `workflow_snapshot`
- [ ] Return structured output:
  - `title`
  - `summary`
  - `sections`
  - `warnings`
  - `generated_html`
- [ ] Keep a seeded fallback path so frontend work is testable without live credentials.
- [ ] Verification command: `cd apps/api; .\.venv\Scripts\python -m unittest discover -s tests`

## Task 2: Add template definitions and generated-document types

**Files:**
- Create: `apps/frontend/src/documents/document-types.ts`
- Create: `apps/frontend/src/documents/document-templates.ts`
- Modify: `apps/frontend/src/data/seeded-clients.ts`
- Modify: `apps/frontend/src/data/client-data-context.tsx`

- [ ] Add types for:
  - `DocumentTemplateDefinition`
  - `GeneratedDocumentDraft`
  - `GeneratedDocumentSection`
  - `ComposedDocument`
  - `ComposedBlock`
- [ ] Seed built-in templates for:
  - Fact Find
  - Terms of Business
  - Statement of Suitability
- [ ] Extend client data with:
  - selected template id per document type
  - last generated HTML
  - last generated structured sections
  - AI generation status
- [ ] Verification command: `cd apps/frontend; npm.cmd test`

## Task 3: Replace plain builders with a styled document composer

**Files:**
- Create: `apps/frontend/src/documents/document-composer.ts`
- Modify: `apps/frontend/src/documents/workflow-document-builders.ts`

- [ ] Stop building documents as flat paragraphs only.
- [ ] Compose documents from reusable blocks:
  - title banner
  - client summary grid
  - recommendation section
  - needs/objectives narrative
  - warnings/disclaimers callout
  - signatures/footer block
- [ ] Ensure the composer can merge:
  - workflow field values
  - AI narrative sections
  - fixed compliance copy
- [ ] Example block contract:

```ts
export type ComposedBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; html: string }
  | { kind: "grid"; items: Array<{ label: string; value: string }> }
  | { kind: "callout"; tone: "warning" | "info"; title: string; bodyHtml: string };
```

- [ ] Verification command: `cd apps/frontend; npm.cmd test`

## Task 4: Add the frontend AI generation client and template picker

**Files:**
- Create: `apps/frontend/src/documents/document-api.ts`
- Create: `apps/frontend/src/documents/template-picker.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

- [ ] Add a small API client for `POST /documents/generate`.
- [ ] Add a template picker for each supported document type.
- [ ] Replace the current generate actions so they:
  1. collect workflow data
  2. call backend generation
  3. store generated draft content
  4. show styled preview
- [ ] Keep current missing-field validation before the AI call.
- [ ] Verification command: `cd apps/frontend; npm.cmd test`

## Task 5: Add review/edit preview before export

**Files:**
- Create: `apps/frontend/src/documents/document-preview.tsx`
- Modify: `apps/frontend/src/pages/income-protection-page.tsx`

- [ ] Add a generated-preview panel that shows the styled output instead of status text only.
- [ ] Allow inline editing of generated sections before export.
- [ ] Save the edited generated result back into client state so reopened documents show the latest content.
- [ ] Reuse the preview when downloading an existing generated document from the Generated Documents tab.
- [ ] Verification command: `cd apps/frontend; npm.cmd test`

## Task 6: Upgrade export so the final document is not plain

**Files:**
- Modify: `apps/frontend/src/documents/export-generated-document.ts`
- Modify: `apps/frontend/src/documents/pdf-export.ts`
- Modify: `apps/frontend/src/documents/word-export.ts`

- [ ] Export the composed preview HTML, not the raw workflow field dump.
- [ ] Preserve:
  - headings
  - summary grids
  - warnings
  - spacing
  - footer/signature sections
- [ ] Keep current filename/version handling compatible with the generated-documents table.
- [ ] Verification command: `cd apps/frontend; npm.cmd test`

## Task 7: Save generated content and cover it with tests

**Files:**
- Modify: `apps/api/app/store.py`
- Modify: `apps/api/tests/test_api.py`
- Modify: `apps/frontend/src/app.test.tsx`

- [ ] Save generated HTML and structured sections in seeded records so the user can reopen the last generated version.
- [ ] Add backend tests for:
  - AI-disabled fallback generation
  - generated document response shape
  - saved generated-document records
- [ ] Add frontend tests for:
  - generate Fact Find
  - generate Terms of Business
  - generate Statement of Suitability
  - preview displays styled output
  - export uses generated content
- [ ] Verification command: `cd apps/api; .\.venv\Scripts\python -m unittest discover -s tests && cd ..\\frontend && npm.cmd test`

## Delivery Order

1. Backend AI boundary
2. Frontend types and templates
3. Styled document composer
4. Workflow generation integration
5. Preview/edit flow
6. Export upgrade
7. Tests

## Spec Coverage Check

- AI for document creation: Tasks 1 and 4.
- Replacing plain documents: Tasks 3, 5, and 6.
- Current workflow integration: Tasks 2 and 4.
- Reopenable generated history: Task 7.
- Legacy behavior carried over:
  - template-based generation
  - AI narrative generation
  - editable output before export
  - PDF/DOCX export

## Open Decisions Before Execution

- AI provider: Gemini is the closest match to the legacy project and should be the default unless you want a different provider.
- Rich text editing scope: the smallest diff is inline editable sections inside the preview, not a full editor migration.

## Verification Baseline

- Backend: `cd apps/api; .\.venv\Scripts\python -m unittest discover -s tests`
- Frontend: `cd apps/frontend; npm.cmd test`

Plan complete and saved to `docs/superpowers/plans/2026-06-13-ai-document-flow.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
