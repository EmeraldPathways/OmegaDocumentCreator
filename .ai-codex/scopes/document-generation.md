# Scope: Document Generation

Use this scope for AI generation, quote/statement routing, preview, export, or generated-document history work.

## Entry points

- `apps/api/app/document_generation.py` - orchestration, quote routing, seeded fallback, persistence metadata
- `apps/api/app/ai.py` - Gemini prompt building and allowlisted field transport
- `apps/frontend/src/documents/document-api.ts` - `/documents/generate` and `/documents/statement-quote` client
- `apps/frontend/src/documents/generated-output-workspace.tsx` - review/generate/export UI
- `apps/frontend/src/documents/workflow-document-builders.ts` - composed HTML builders
- `apps/frontend/src/documents/document-composer.ts` - shared composition helpers
- `apps/frontend/src/documents/export-generated-document.ts` - export/history/file update flow
- `apps/frontend/src/documents/pdf-export.ts`
- `apps/frontend/src/documents/word-export.ts`

## Supported document types in current code

- `Fact Find`
- `Fact Find Update`
- `Terms of Business`
- `Quote`
- `Statement of Suitability`
- `Pensions Quote`
- `Pensions Statement`

## Current pipeline

```text
workflow page
  -> document-api.ts
  -> POST /documents/generate or /documents/statement-quote
  -> document_generation.py
  -> ai.py or seeded fallback
  -> normalized frontend response
  -> generated-output workspace / builders
  -> optional artifact persistence under client/year/workflow/documents
```

## Constraints

- frontend must not call Gemini directly
- seeded fallback remains in `document_generation.py`
- prompt payloads should stay filtered to the allowlisted field set
- quote routing must respect explicit document type before workflow heuristics
- preview, edit, export, and stored document history should stay aligned
