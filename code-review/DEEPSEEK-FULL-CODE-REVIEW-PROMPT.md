# DeepSeek Full Code Review Prompt

Use this prompt in a fresh DeepSeek chat.

```text
Read these first, in this order:

1. AGENTS.md
2. PROJECT.md
3. .ai-codex/index.md
4. .ai-codex/architecture.md
5. .ai-codex/api-surface.md
6. .ai-codex/patterns.md
7. .ai-codex/scopes/persistence.md
8. .ai-codex/scopes/income-protection.md
9. phase1-8.md
10. code-review/README.md
11. code-review/MASTER-CODE-REVIEW.md
12. code-review/01-backend-api-review.md
13. code-review/02-frontend-review.md
14. code-review/03-data-persistence-review.md
15. code-review/04-security-auth-review.md
16. code-review/05-tests-and-quality-review.md
17. code-review/06-infrastructure-ops-review.md

Task:
Perform a strict full-repository code review of the Omega Document Creator codebase.

Your job is not to implement fixes yet.
Your job is to find and document:

- real bugs
- regressions
- unsafe behavior
- partial / empty implementations
- missing validation
- stale docs or mismatched contracts
- bad file boundaries
- dead code
- missing tests
- operational gaps

Primary review rules:

- Follow AGENTS.md exactly.
- Use the project docs as context, but trust the code over the docs if they differ.
- Be strict. Do not mark something complete unless the code really supports the claim.
- Do not do a shallow style review. Focus on behavior, correctness, security, data integrity, and maintainability.
- Prefer file-level evidence and route/function-level evidence.
- If you are unsure, mark it as "needs confirmation" instead of overstating it.
- Do not silently fix code while reviewing unless explicitly asked later.
- Do not skip a layer. Review backend, frontend, data, tests, and infrastructure.

Important context:

- The repo claims Phases 1-16 are complete.
- You must verify that claim against the real codebase.
- The system now includes PostgreSQL persistence, sessions, file/document storage, backup/restore, scheduling, and Cloudflare Tunnel automation.
- The review should challenge those claims where needed.

Files and areas you must cover:

- apps/api/app/main.py
- apps/api/app/models.py
- apps/api/app/config.py
- apps/api/app/document_generation.py
- apps/api/app/repositories/
- apps/api/app/services/
- apps/api/migrations/
- apps/api/tests/
- apps/frontend/src/App.tsx
- apps/frontend/src/auth/
- apps/frontend/src/data/
- apps/frontend/src/documents/
- apps/frontend/src/pages/
- infra/docker/compose.yaml
- infra/cloudflared/
- .env.example
- PROJECT.md
- .ai-codex/*

How to record findings:

Update these files directly as you review:

- code-review/MASTER-CODE-REVIEW.md
- code-review/01-backend-api-review.md
- code-review/02-frontend-review.md
- code-review/03-data-persistence-review.md
- code-review/04-security-auth-review.md
- code-review/05-tests-and-quality-review.md
- code-review/06-infrastructure-ops-review.md

Required structure for each finding:

- Severity: Critical / High / Medium / Low
- File:
- Function / route / component:
- Problem:
- Why it matters:
- Suggested fix direction:
- Confidence: Confirmed / Likely / Needs confirmation

Review method:

1. Start with docs and architecture files so you know the claimed behavior.
2. Verify the backend route surface against implementation.
3. Verify persistence and storage behavior against models, repositories, and services.
4. Verify frontend state flow against the backend contracts.
5. Verify auth/session behavior and destructive operations carefully.
6. Verify tests actually prove the behavior being claimed.
7. Verify infrastructure/docs/operator paths are consistent with the code.
8. Aggregate everything into the master review.

Output requirements:

- Do not give me a casual chat summary only.
- Populate the review markdown files with concrete findings.
- In `code-review/MASTER-CODE-REVIEW.md`, provide:
  - executive verdict
  - severity summary
  - cross-cutting findings
  - recommended fix order
  - final decision

What good looks like:

- The review pack should let a follow-up agent fix issues area by area.
- The master file should make it obvious what is broken now, what is incomplete, and what is acceptable.
- If an area appears solid, say so explicitly instead of leaving it blank.

Do not stop early.
Review the whole repo.
```
