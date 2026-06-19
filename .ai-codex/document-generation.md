# Scope: Document Generation

Use this scope when working on AI document generation, preview, export, or the document pipeline.

## Entry points

- `apps/api/app/document_generation.py` — prompt builders, response parsing, seeded fallback
- `apps/api/app/ai.py` — Gemini client, fallback switch
- `apps/frontend/src/documents/document-api.ts` — frontend API call to `/documents/generate`
- `apps/frontend/src/documents/document-composer.ts` — HTML shell builder (do not bypass)
- `apps/frontend/src/documents/document-preview.tsx` — editable preview component
- `apps/frontend/src/documents/export-generated-document.ts` — saves export record
- `apps/frontend/src/documents/pdf-export.ts` — HTML-to-PDF
- `apps/frontend/src/documents/word-export.ts` — structured DOCX

## Document types

| Type | `doc_type` value |
|------|-----------------|
| Fact Find | `fact_find` |
| Terms of Business | `terms_of_business` |
| Statement of Suitability | `statement_of_suitability` |

## Pipeline (do not break this chain)

```
income-protection-page.tsx
  → document-api.ts → POST /documents/generate
  → document_generation.py (builds prompt)
  → ai.py (Gemini or fallback)
  → response: { title, summary, sections[], warnings[], generated_html }
  → document-composer.ts (wraps in styled HTML shell)
  → document-preview.tsx (renders editable)
  → pdf-export.ts OR word-export.ts
  → export-generated-document.ts (saves history record)
```

## AI config

- Provider: `gemini-2.0-flash`
- Temperature: `0.3`
- Controlled via `AI_ENABLED`, `AI_PROVIDER`, `GEMINI_API_KEY` in `.env`
- Fallback: seeded structured content in `document_generation.py` (not in `ai.py`)

## Constraints

- Never call Gemini from the frontend
- `document-composer.ts` is the single source of styled output — reused for review AND export
- Seeded fallback must always return valid `{ title, summary, sections, warnings, generated_html }`
- Generated preview HTML is frozen at export time and stored with the history record

## What's not yet done

- Durable filesystem/DB storage for generated documents
- Document download endpoints
- ZIP pack download
- Version tracking beyond browser-backed history
