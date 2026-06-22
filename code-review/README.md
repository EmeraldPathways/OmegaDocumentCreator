# Code Review Pack

This folder is the workspace for a full-repo review run.

Use it to drive one strict review pass over the whole codebase and capture findings in a consistent format.

## Files

- `MASTER-CODE-REVIEW.md` - top-level summary, severity rollup, and final verdict
- `01-backend-api-review.md` - FastAPI routes, repositories, services, models, migrations
- `02-frontend-review.md` - React pages, state flow, API clients, UX correctness
- `03-data-persistence-review.md` - PostgreSQL wiring, file storage, backup/restore, sessions
- `04-security-auth-review.md` - auth, authorization, cookies, input validation, destructive operations
- `05-tests-and-quality-review.md` - tests, verification gaps, flaky areas, dead code, maintenance risks
- `06-infrastructure-ops-review.md` - env/config, Docker, Cloudflare Tunnel, runtime operations
- `DEEPSEEK-FULL-CODE-REVIEW-PROMPT.md` - full prompt to give the review agent
- `DEEPSEEK-LONG-FIX-THREAD.md` - one long DeepSeek remediation thread
- `FIX-PROMPT-1-CRITICAL.md` - fix critical findings first
- `FIX-PROMPT-2-HIGH-BACKEND-AUTH.md` - then fix highest-priority backend/auth/data-integrity findings
- `FIX-PROMPT-3-OPS-MAINTAINABILITY.md` - then fix ops, tests, docs, and maintainability findings

## Review rules

- Prefer evidence over speculation.
- Record file paths and function names whenever possible.
- Separate confirmed bugs from lower-confidence concerns.
- Do not silently "fix while reviewing".
- If an area looks incomplete rather than broken, record it as a gap with impact.

## Expected outcome

At the end of the review:

1. Each area file should contain concrete findings.
2. `MASTER-CODE-REVIEW.md` should aggregate the results.
3. The review should distinguish:
   - bugs
   - missing validation
   - empty or partial implementations
   - stale docs / mismatched contracts
   - risky operational gaps
