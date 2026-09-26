# Global Rules

## Search Tool

Always prefer `rg` (ripgrep) over `grep`, `find`, and `ls` when searching files or listing matches via Bash — it is faster and respects `.gitignore` by default. The dedicated Grep tool may still be used for simple content searches, but any shell-level searching must use `rg`.

## Todo List Currency

Primary agents must keep the visible todo list current: call `todowrite` as soon as the plan is clear, and update it after each task or checkpoint — not just at setup and completion. Frequent, small updates are the norm; batch them only when a stretch of work is genuinely one unit. Subagents are exempt unless they have `todowrite` permission.

## Review Policy

Follow the active project's review and validation workflow when one exists. The
project workflow owns review timing, evidence, reviewer selection, and scope; do
not add reviews during intermediate work unless that workflow or the user
explicitly requires one.

Outside a project-defined workflow, review only a completed reviewable change.
Use one bounded pass, start with the standard reviewer, and escalate only for a
concrete unresolved risk that the standard review cannot verify within scope.
Keep review limited to changed behavior and named direct consumers. Do not ask
for speculative hardening, alternative architecture, or repository-wide audit.
