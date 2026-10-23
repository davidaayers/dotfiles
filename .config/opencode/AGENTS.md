# Global Rules

## Todo List Currency

Primary agents must keep the visible todo list current for multi-step work.

- **Create** a todo list before starting any task that needs 3+ steps.
- **Update** it when a meaningful work item finishes, a blocker changes the plan,
  or the user changes scope. Do not resend an unchanged list after every tool call.
- Keep exactly one item `in_progress` while work remains; terminal lists have none.
  Mark an item `completed` only after its required verification succeeds.

Subagents are exempt unless they have `todowrite` permission.

## Search Tool

Prefer dedicated Glob, Grep, and Read tools for file discovery and inspection.
When shell searching is necessary, use `rg` rather than `grep` or `find`.
Use `ls` for required parent-directory verification, not recursive discovery.

## Local File Links

When presenting clickable links to local files, including screenshots, use an
absolute `file://` URL as the Markdown link target so terminal clients such as
iTerm2 can open it correctly. For example:
`[View screenshot](file:///Users/david/project/screenshot.png)`.
Do not use a bare filesystem path or a relative path as a local hyperlink target.
Percent-encode spaces and other URL-sensitive path characters (for example,
`%20` for a space and `%23` for `#`). Plain file references in code spans and
paths in shell commands should retain their normal filesystem syntax.

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

## Shared Reviewer Contract

This section owns the common procedure for the OpenCode reviewer agents. Their
agent files own specialty checks and escalation targets; the active project owns
review timing, selection, budgets, authority, and acceptance requirements.

- Reviewers inspect evidence and return findings; they do not edit, delegate,
  publish, or impose a development lifecycle. Use the supplied request/decision,
  exact diff or artifact scope, owners, named direct consumers, and verification.
  Ask for missing scope instead of assuming all uncommitted work belongs to the task.
- Inspect all supplied changed hunks or planning artifacts, with enclosing context.
  Batch reads; read full files only when needed to establish a concrete invariant.
  Before leaving the named boundary, return `Scope expansion requested` with the
  suspected defect and required sources. Report incomplete coverage explicitly.
- Judge whether supplied checks prove the claimed outcome. Do not rerun them;
  report suspect evidence or an invalid oracle to the primary agent for verification.
  Missing evidence is a gap, never proof of success. Visual implementation review
  requires rendered evidence for the named states/viewports.
- Report evidenced material defects, not speculative hardening, unrelated existing
  problems, praise, or aesthetic preferences. A high-risk topic alone does not
  justify deep escalation; name the unresolved failure, evidence, and extra scope.
- On resume, inspect corrective changes and unresolved findings. Reopen earlier
  context only when the correction invalidates a relevant assumption or boundary.
- Return findings ordered by severity, each with exact location/boundary, evidence,
  realistic consequence, and smallest concrete correction. If clean, say
  `No findings`; list only remaining coverage/evidence gaps or requested verified
  invariants. Do not summarize the change.

## Skill Boundaries

Load skills for the actual task, not incidental keywords. Project workflow owns
scope, approvals, review timing, and verification; domain skills supply technical
procedures within that boundary. A tool example is not authorization to install,
deploy, publish, or change unrelated project configuration. Resolve genuine
conflicts under the governing instruction hierarchy rather than following both.
