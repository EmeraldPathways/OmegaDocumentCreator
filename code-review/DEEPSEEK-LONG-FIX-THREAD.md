# DeepSeek Long Fix Thread

Use this in one long DeepSeek conversation.

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
18. code-review/FIX-PROMPT-1-CRITICAL.md
19. code-review/FIX-PROMPT-2-HIGH-BACKEND-AUTH.md
20. code-review/FIX-PROMPT-3-OPS-MAINTAINABILITY.md

Task:
Work through Prompt 1, then Prompt 2, then Prompt 3 in this same conversation.

Rules:

- Stay in one long fix thread.
- Do not skip Prompt 1.
- Do not start Prompt 2 until Prompt 1 is implemented and verified.
- Do not start Prompt 3 until Prompt 2 is implemented and verified.
- Fix code, tests, and docs together where required.
- Keep changes surgical.
- Do not rewrite unrelated modules.
- Prefer the smallest safe production-ready fix.

Execution requirements:

For each prompt:

1. Re-read the prompt file before making changes.
2. Implement only that prompt's scope.
3. Run the smallest relevant verification commands.
4. Update:
   - code-review/MASTER-CODE-REVIEW.md
   - the affected area review files
5. Mark fixed findings clearly rather than deleting evidence.
6. Summarize:
   - files changed
   - what changed
   - test/verification result
   - remaining risks

Finding-status rules:

- If a finding is fixed, mark it as `Fixed in Prompt N`.
- If partially fixed, mark it as `Partially fixed in Prompt N` and explain what remains.
- If a finding is not addressed by current scope, leave it unchanged.

Scope order:

- Prompt 1: Critical fixes only
- Prompt 2: High-priority backend/auth/data integrity fixes
- Prompt 3: Ops, migrations, tests, and maintainability fixes

Do not stop after planning.
Implement Prompt 1 immediately.
After Prompt 1 is complete, continue with Prompt 2.
After Prompt 2 is complete, continue with Prompt 3.
```
