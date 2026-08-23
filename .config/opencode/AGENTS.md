# Global Rules

## Todo List Currency

Primary agents must keep the visible todo list current: call `todowrite` as soon as the plan is clear, and update it after each task or checkpoint — not just at setup and completion. Frequent, small updates are the norm; batch them only when a stretch of work is genuinely one unit. Subagents are exempt unless they have `todowrite` permission.

## Persistent Memory (Vestige)

Use the `vestige_*` MCP tools for cross-session memory:

- At the start of substantive sessions, call `vestige_session_start` to prime relevant context.
- After notable decisions, preferences, bug fixes, or architecture facts are settled, call `vestige_smart_ingest` with a concise standalone statement.
- Before non-obvious choices, call `vestige_recall` to check for prior decisions — never contradict a stored decision silently; surface it instead.
- Keep ingests selective: durable project/user facts only, not transient session state.
