# Prompt Format

Use this format for every new implementation prompt written from this repo unless the user asks for a different structure.

## Default location

- Write implementation prompts in `.agent-handoff/codex-task.md`.
- Treat `.agent-handoff/` as the default handoff surface for Codex, Cline, and DeepSeek prompts.

## Required structure

Copy this structure and fill it with the current task details:

```text
You are working in:

<absolute repo path>

Read in this order first:
1. AGENTS.md
2. .ai-codex/index.md
3. <relevant scope file>
4. <small set of exact implementation files>
5. <tests only if needed>

Task boundary:
- One phase only.
- Small surgical changes only.
- <frontend/backend/both> only.
- No unrelated refactors.
- No new dependencies unless explicitly approved.
- <schema/model constraints if relevant>

Current truth:
- <current repo facts that the implementation agent must treat as authoritative>
- <existing behavior that must stay unchanged>
- <known broken behavior being fixed>

Critical correction:
- <the most important thing to get right>
- <what must not happen>

Goal:
1. <primary outcome>
2. <secondary outcome if needed>

Hard requirements:
1. <non-negotiable implementation rule>
2. <non-negotiable implementation rule>
3. <non-negotiable implementation rule>

Implementation targets:
- `<file path>`
  - <specific responsibility in that file>
- `<file path>`
  - <specific responsibility in that file>

Validation:
- <exact command>
- <exact command>

Deliverable:
1. Files changed
2. What changed
3. Test results
4. Remaining limitations
```

## Repo-specific rules

- Start with `You are working in:` and the full repo path.
- Always include `Read in this order first:` with a numbered list.
- Keep the read list short and exact. Do not send broad repo scans.
- Always include `Task boundary:` and keep it restrictive.
- Always include `Current truth:` so the agent does not overwrite known-good behavior.
- Use `Critical correction:` when there is one mistake the agent is likely to make.
- Use `Implementation targets:` with exact file paths and responsibilities.
- Use `Validation:` with real commands Codex expects to be run.
- Keep the prompt scoped to one phase only.
- Prefer copy-pasteable prompts with no extra commentary before or after.

## When writing the prompt

- Mirror the user's terminology.
- Preserve exact constraints like ports, routes, file paths, and branch scope.
- Separate current truth from requested change.
- If the task is frontend-only, say that explicitly.
- If the task must not change a schema, persistence model, or API shape, say that explicitly.
