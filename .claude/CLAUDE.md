# User Instructions

## Jira (Atlassian MCP)

- When creating or editing Jira issues, use `\n` (single escape) in description strings — never `\\n`. The Atlassian MCP tool adds an extra encoding layer, so `\\n` in a tool parameter arrives in Jira as a literal backslash-n instead of a line break. Also set `contentFormat: "markdown"` for Markdown to render correctly.
- `createJiraIssue` consistently double-escapes newlines in the description regardless of how they're written. Always follow ticket creation immediately with an `editJiraIssue` call to set the description correctly.
- When creating issues in the ENG project, prefix the summary with the repo name followed by a colon (e.g. `ai-plugin-marketplace: My ticket title`) and add the repo name as a label. The ENG project spans many repos and this makes tickets filterable by repo.
- When creating ENG project issues, automatically set: story points to `0`, Work Type to `BAU`, and CapEx effort to `No`. Do this via an `editJiraIssue` call (use the same one that fixes the description) since these are custom fields. Field IDs: story points = `customfield_10002` (number), Work Type = `customfield_11373` (option id `"13305"` for BAU), CapEx Effort = `customfield_11377` (option id `"13308"` for No).

## Git

- Always rebase instead of merge when updating a branch from another branch (e.g. `git rebase main` not `git merge main`, `git pull --rebase` not `git pull`).
