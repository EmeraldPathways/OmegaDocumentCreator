# AGENTS.md

You are a coding agent.

## Primary goals

- Produce correct, minimal, production-ready code
- Prefer small diffs over broad rewrites
- Optimize for clarity, maintainability, and low token usage

---

## Working style

- Be concise and implementation-focused
- Minimize filler, repetition, and long explanations
- Do not restate the request unless needed for clarity
- Ask at most one question only if a wrong assumption would likely break the result
- Otherwise proceed with the safest reasonable assumption

---

## Engineering discipline

### Before coding
- State only critical assumptions when needed
- Proceed unless ambiguity is high-risk
- Push back on unnecessary complexity

### Simplicity
- Only build what is requested
- No speculative features
- No unnecessary abstractions
- Prefer the smallest working solution

### Surgical changes
- Touch only required files
- Do not refactor unrelated code
- Match existing project patterns and style
- Remove only unused code introduced by your changes
- Mention unrelated issues, do not fix them unless asked

### Execution
- Define clear success criteria for non-trivial tasks
- Verify with the smallest relevant command or test
- Iterate until complete or blocked
- Preserve security, validation, and error handling

---

## Coding rules

- Follow existing project patterns first
- Reuse existing utilities, types, and components
- Avoid new dependencies unless required
- Keep public APIs stable unless a change is necessary
- Prefer explicit, readable code over clever code
- Keep code, identifiers, comments, and commit messages normal, clear, and professional

---

## Output format

For code tasks:

1. What changed
2. Why
3. Verification command

- First give the result or patch summary
- Do not dump large unchanged files
- Do not add extra examples or alternatives unless asked

---

## Code reading priority

1. `.ai-codex/*`
2. Agentmemory session context and relevant memories
3. Token Savior memory
4. Token Savior symbol/navigation tools
5. Minimal file reads

- Read `.ai-codex` first before broader exploration when it exists.
- When available, prefer Agentmemory for prior decisions, session continuity, and reusable context.
- When available, prefer memory and symbol lookup over broad file scanning
- Avoid full-file reads when smaller targeted reads are enough

---

## AI context files

`.ai-codex/` is the project knowledge base. Read it instead of scanning source files.

| File | When to read |
|------|-------------|
| `.ai-codex/index.md` | Every session — one-liner per file, do not read unless listed here |
| `.ai-codex/architecture.md` | Stack, module map, persistence state |
| `.ai-codex/patterns.md` | Auth, API patterns, gotchas |
| `.ai-codex/api-surface.md` | All endpoints and types |
| `.ai-codex/decisions-archive.md` | Why things are the way they are |
| `.ai-codex/scopes/persistence.md` | When wiring PostgreSQL |
| `.ai-codex/scopes/document-generation.md` | When touching AI or export pipeline |
| `.ai-codex/scopes/income-protection.md` | When working on workflow tabs |
| `.ai-codex/scopes/auth-admin.md` | When touching login, users, or audit |

### File reading discipline
- Never read a file just to confirm it exists
- Skip test files unless the task is specifically about tests
- Skip `node_modules/`, `apps/api/.venv/`, `dist/`, `.vite-run-cache/`, `*.lock`, `*.log` always
- On new session: read `.ai-codex/index.md` only, then read the relevant scope file for the task
- Do not read `PROJECT.md` unless the task spans multiple modules or scope is unclear

---

## Memory usage

After non-trivial work, store:
- fixes
- reusable patterns
- architectural decisions

Persist anything likely to save future time.

- Use `agentmemory:recall` or `agentmemory:handoff` at the start of longer or resumed sessions when prior context may matter
- Use `agentmemory:remember` after non-trivial work to save fixes, reusable patterns, and architectural decisions
- Use `agentmemory:recap` and `agentmemory:handoff` at the end of long conversations when continuity will help the next session

---

## Token efficiency

- Avoid re-reading known code
- Prefer stored memory, Agentmemory, and symbol lookup when available
- Expand context only when required

---

## Default

- Concise mode
- Optimize for useful output, not conversational padding

---

## Git publishing preference

- When the user says push to main, perform a one-pass workflow: stage only the task files, commit once with a clear message, and push HEAD to origin/main.
- Leave unrelated local changes alone.
- Include `PROJECT.md` only when the user explicitly asks for it.

---

## Local startup memory

- Preferred local startup command: `run-omega.cmd` from the repo root.
- This launches:
  - frontend on `127.0.0.1:3007`
  - backend on `127.0.0.1:8007`
- Direct fallback commands:
  - frontend: `apps\frontend\run-frontend.cmd`
  - backend: `apps\api\run-api.cmd`