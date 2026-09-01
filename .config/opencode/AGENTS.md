# Global Rules

## Search Tool

Always prefer `rg` (ripgrep) over `grep`, `find`, and `ls` when searching files or listing matches via Bash — it is faster and respects `.gitignore` by default. The dedicated Grep tool may still be used for simple content searches, but any shell-level searching must use `rg`.

## Todo List Currency

Primary agents must keep the visible todo list current: call `todowrite` as soon as the plan is clear, and update it after each task or checkpoint — not just at setup and completion. Frequent, small updates are the norm; batch them only when a stretch of work is genuinely one unit. Subagents are exempt unless they have `todowrite` permission.

## Persistent Memory (Vestige)

Use the `vestige_*` MCP tools for cross-session memory:

- At the start of substantive sessions, call `vestige_session_start` to prime relevant context.
- After notable decisions, preferences, bug fixes, or architecture facts are settled, call `vestige_smart_ingest` with a concise standalone statement.
- Before non-obvious choices, call `vestige_recall` to check for prior decisions — never contradict a stored decision silently; surface it instead.
- Keep ingests selective: durable project/user facts only, not transient session state.

## Architecture Review Protocol

Before invoking an architecture reviewer, classify the change by behavioral
risk rather than diff size:

- `targeted`: metadata, fixtures, isolated tests, narrowly scoped documentation,
  or mechanical changes.
- `standard`: localized behavior within one known architectural boundary.
- `full`: public contracts, persistence or migrations, authentication or trust,
  concurrency, distributed state, external-service resilience, shared
  abstractions, multiple boundaries, difficult rollback, or uncertain ownership.

Use `architecture-reviewer` for targeted and standard reviews. Use
`architecture-reviewer-deep` for full reviews or when the standard reviewer
escalates.

Every review prompt must include the review mode, change path, affected
capabilities, implementation entry points, direct consumers, invariants,
non-goals, completed validation, and specific questions to answer. The reviewer
may expand scope when evidence requires it, but the prompt must not request an
unbounded repository review by default.

Architecture review is pre-implementation. Use the matching code reviewer for
the post-implementation diff and `design-reviewer` for visual or UX concerns. Skip
architecture review for purely editorial documentation. Resume the same review
task for corrections and send only the artifact delta plus unresolved finding
IDs unless the correction changes scope or assumptions.

## Code Review Protocol

Apply the same behavioral-risk classification after implementation:

- Use `code-reviewer-targeted` for targeted diffs.
- Use `code-reviewer` for standard diffs.
- Use `code-reviewer-deep` for full-risk diffs or when another reviewer
  escalates.

Every code-review prompt must include the exact diff or commit range, changed
files, behavioral delta, relevant requirements and design decisions,
implementation entry points, direct consumers, invariants, non-goals, completed
validation, and specific questions. For full reviews, also include suspected
transitive consumers and affected boundaries.

Code review verifies implementation correctness and conformance; it does not
repeat the approved architecture review. Reviewers may expand scope to verify a
concrete concern, but must not perform unbounded repository review by default.
Resume the same review task for corrections and send only the corrective diff
plus unresolved finding IDs unless behavior or boundaries changed.

## Design Review Protocol

Classify visual and UX changes by affected design risk:

- `targeted`: isolated copy, icon, color, spacing, visual-state, or
  single-component changes.
- `standard`: one component or screen with multiple states, responsive behavior,
  or a localized interaction flow.
- `full`: shared design systems or primitives, information architecture,
  navigation, multi-screen workflows, accessibility-critical interactions,
  responsive systems, multiple input modalities, cross-platform presentation,
  rendering pipelines, or uncertain visual ownership.

Use `design-reviewer` for targeted and standard reviews. Use
`design-reviewer-deep` for full reviews or when the standard reviewer escalates.

Every design-review prompt must include the stage (`specification` or
`implementation`), review mode, named surfaces, user tasks and states, required
viewports and platforms, input modalities, governing design decisions,
accessibility constraints, invariants, non-goals, completed validation, and
specific questions. Implementation reviews must include the exact visual diff
and rendered evidence for required states and viewports.

Design review does not repeat architecture or code review. At the specification
stage, review artifacts rather than implementation. At the implementation stage,
verify parity with the approved design and supplied rendered evidence rather
than repeating the full specification review. If required visual evidence is
missing, report the gap instead of launching independent browser exploration.
Resume the same review task for corrections and send only changed artifacts,
rendered evidence, and unresolved finding IDs unless the visual system or user
flow changed.
