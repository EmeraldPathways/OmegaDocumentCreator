# Scope: Document Generation

Use this scope for AI generation, preview, export, or document-history work.

## Entry points

- `apps/api/app/document_generation.py` - orchestration, seeded fallback, PHI request
- `apps/api/app/ai.py` - prompt building and Gemini call
- `apps/frontend/src/documents/document-api.ts` - `/documents/generate` client
- `apps/frontend/src/documents/generated-output-workspace.tsx` - live review/generate/export UI
- `apps/frontend/src/documents/workflow-document-builders.ts` - composed HTML builders
- `apps/frontend/src/documents/document-composer.ts` - shared composition helpers
- `apps/frontend/src/documents/export-generated-document.ts` - export/history/file update flow
- `apps/frontend/src/documents/pdf-export.ts`
- `apps/frontend/src/documents/word-export.ts`

## Supported document types in current code

- `Fact Find`
- `Terms of Business`
- `Statement of Suitability`

## Current pipeline

```text
income-protection-page.tsx
  -> document-api.ts
  -> POST /documents/generate
  -> document_generation.py
  -> ai.py or seeded fallback
  -> normalized response in document-api.ts
  -> generated-output-workspace.tsx
  -> workflow-document-builders.ts
  -> export-generated-document.ts
  -> pdf-export.ts / word-export.ts
```

## Constraints

- Frontend must not call Gemini directly.
- Seeded fallback remains in `document_generation.py`.
- Document history and preview HTML are still local/seeded, not durable backend storage.
- Statement of Suitability generation can attach PHI integration request data.
