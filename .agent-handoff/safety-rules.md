# Safety Rules

## Roles

1. Codex is the planner and reviewer.
2. Cline is the implementation agent.
3. Shared handoff files are the communication layer.
4. Git branches or checkpoints are the safety layer.
5. Codex and Cline must never edit the same files at the same time.

## Conversation Start Rules

- On every new Cline conversation, read `AGENTS.md` before touching code.
- On every new Cline conversation, connect to the available MCPs first.
- Prefer Agentmemory for prior context and reusable decisions.
- Prefer Token Savior for memory and symbol/navigation support when available.

## Working Rules

- Codex defines task scope before Cline starts.
- Cline only edits files explicitly handed off.
- Cline writes results back to `.agent-handoff/cline-result.md`.
- If Cline edits `.agent-handoff/cline-result.md` or `.agent-handoff/validation-log.md`, those files must be listed under changed files.
- Codex reviews changes before validation and commit.
- Codex compares the reported changed-file list against the actual diff before approving work.
- Validation output goes in `.agent-handoff/validation-log.md`.
- Use a branch or checkpoint before risky changes.
- If scope changes, Codex updates `.agent-handoff/codex-task.md` first.
