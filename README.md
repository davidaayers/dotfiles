# David Ayers Dotfiles & Misc Setup Stuff

## First, install Ohmyzsh

https://ohmyz.sh/#install

`sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"`

## Install Homebrew

https://brew.sh/

`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

## Installing dotfiles

To install your dotfiles onto a new system:

```
cd $HOME
git clone git@github.com:davidaayers/dotfiles.git .dotfiles
./.dotfiles/bin/dfm install # creates symlinks to install files
```

## Machine-specific setup (not committed)

Secrets and identity are kept out of the repo. Create these locally:

* `~/.zshrc.local` (sourced by `.zshrc`) — exports tokens read from `~/.config/secrets/`:
  * `~/.config/secrets/homebrew_api_token` — GitHub PAT (no permissions needed) for Homebrew
  * `~/.config/secrets/npm_token` — NPM token with publish access
* `~/.config/opencode/service.json` — generated local OpenCode service settings,
  including its password. Gitignored; do not copy it between machines or commit it.

## Set up Git on a new machine

After `dfm install` symlinks `.gitconfig` into your home directory, create
`~/.gitconfig.local` with your name and email address:

```gitconfig
[user]
    name = Your Name
    email = you@example.com
```

The tracked `.gitconfig` includes this local file, so Git uses that identity
without committing your personal details to the dotfiles repo. Check it with
`git config --global user.name` and `git config --global user.email`.
If you use the Invitation Homes `git-shared-hooks` checkout at
`~/git-shared-hooks`, also set `core.hooksPath` in `~/.gitconfig.local`.

## Setup Programs

The `Brewfile` included in the .dotfiles directory uses [brew bundle](https://github.com/Homebrew/homebrew-bundle) to setup every program in that file with one simple command:

`brew bundle --file ~/.dotfiles/Brewfile`

Python is managed with [pyenv](https://github.com/pyenv/pyenv) (now installed with Brewfile).

Node is managed with [Volta](https://volta.sh/) (installed separately, not via Brewfile).

## tab-chroma (iTerm2 tab colors)

[tab-chroma](https://github.com/JCPetrelli/TabChroma) changes the iTerm2 tab
color/badge/title to reflect what an AI coding agent is doing (working, done,
needs approval, etc.). The script is vendored at `.config/tab-chroma/` and
symlinked into `~/.config/tab-chroma` by `dfm install`, so it's transportable
between machines.

The script has two parts: a terminal-facing engine (themes, config, debounce,
iTerm2 escape sequences) and event wiring. The engine is shared; each agent
wires it up its own way.

**Claude Code** — registers shell hooks in `~/.claude/settings.json` (tracked
in this repo) that call `tab-chroma.sh` on `SessionStart`/`UserPromptSubmit`/
`PreToolUse`/`Stop`/`Notification`/`PermissionRequest`. The `claude()` wrapper
in `.zshrc` resets the tab on exit (Claude Code has no exit hook).

**OpenCode V2** — `.config/opencode/plugins/tab-chroma/tui.ts` runs in the
terminal client and forwards events to `~/.config/tab-chroma/tab-chroma.sh`.
V2 discovers this CLI plugin automatically; it is not a server plugin and does
not need an entry in `opencode.jsonc` or `cli.json`. Running client-side matters:
the shared server has no terminal, and events from another terminal must not
change this window. Only the currently viewed session drives its tab feedback.
The `opencode()` wrapper in `.zshrc` resets the tab on exit. Runtime imports are
Node builtins only; no `npm install` is required.

Color/badge mapping for opencode (unchanged — handled by the vendored script):

| opencode event | tab-chroma state |
| -------------- | ---------------- |
| Selected session changes (including resumed sessions) | `session.start`, then current state |
| `session.execution.started` | `working` |
| `session.execution.succeeded`, `.failed`, `.interrupted` | `done` |
| `permission.asked` | `permission` |
| `permission.replied` | `working` |

The tab **title** is driven by the plugin rather than the vendored script, so
it can show what opencode is actually doing instead of a static "working".
It subscribes to V2 `session.tool.input.started` / `session.tool.called` and
text/reasoning events to read the active tool and its arguments, producing titles like `◉ myapp · npm test`,
`◉ myapp · reading foo.ts`, `◉ myapp · thinking`, and `◉ myapp · done`. This
keeps `tab-chroma.sh` pristine — `tab-chroma update` won't clobber the title
logic — at the cost of a small duplicated device-resolution/title-write helper
in the plugin.

Notes:

* `~/.config/tab-chroma/config.json` is gitignored — the script rewrites it on
  theme/feature toggles and regenerates defaults via `ensure_config()`.
* V2 watches local plugins for changes. Check `/plugins` for loading errors;
  restart the TUI if it is still showing an old plugin generation.
* After changing `.zshrc`, run `source ~/.zshrc` or open a new shell.

## OpenCode V2

Server settings live in `.config/opencode/opencode.jsonc`; terminal settings live
in `.config/opencode/cli.json`. V2 uses `cli.json`, not the retired V1 `tui.json`.
Supported legacy server-config fields can remain in `opencode.jsonc`; converting
all of them to native V2 syntax is not required.

### Published sidebar plugins

`cli.json` pins the released packages, not local development checkouts:

```json
{
  "plugins": [
    "@davidaayers/opencode-context-gauge-plugin@1.0.0",
    "@davidaayers/opencode-go-usage-plugin@1.0.0",
    "@davidaayers/opencode-codex-usage-plugin@1.0.0"
  ]
}
```

These releases require OpenCode `>=2.1.3 <3`. No local re-export wrappers or
duplicate server-config entries are needed. Go and Codex usage widgets appear
only in matching provider sessions. Use `/plugins` to inspect loading failures;
press Ctrl+A there to show internal plugins. Built-ins register before external
plugins in 2.1.3: listing an internal ID later enables it but does not reorder it.

### Todo reminders

`.config/opencode/plugins/todo-nudge/index.ts` is a V2 server plugin, enabled
by the `plugins` array in `opencode.jsonc`. Its `context` hook appends a pointer
to the global AGENTS.md Todo List Currency rule before each agent-loop model
request. It does not add its own policy or modify persisted messages.

The `todowrite` tool is off by default in V2. `opencode.jsonc` enables it with
`"experimental": { "todo": true }`. The built-in `opencode.sidebar.todo` widget
displays the structured tool data, not Markdown checklists in assistant replies.

### Clipboard image fallback

`.config/opencode/plugins/clipboard-image/index.ts` registers the V2
`clipboard_image` tool through the server `plugins` array. It preserves the old
clipboard helper without the V1 plugin API. It checks the `clipboard_image`
permission before reading the macOS clipboard and saves PNGs under the system
temporary directory. It reads the **server host's** clipboard; use normal image
attachments for remote sessions.

### Local plugin development

The local plugins use Node builtins at runtime; OpenCode supplies the plugin API.
`package.json` pins `@opencode/plugin@2.1.3` as a development-only dependency for
editor types (`npm ci` from `.config/opencode`). No V1 plugin dependency remains.

Run the local plugin behavior tests from the dotfiles repository:

```sh
bun test ./.config/opencode/tests/plugins.test.ts
```

The tests replace filesystem and subprocess output so they do not recolor your
terminal or launch the real Tab Chroma script.

## OpenCode session cleanup

`bin/opencode-cleanup` is an offline maintenance utility for **OpenCode v1**.
The `bin/` directory is installed as `~/bin` by dfm and is on the shell PATH.
It defaults to keeping sessions updated within the last five rolling days,
across all projects. Parents of retained sessions are also kept, because
OpenCode deletes child sessions along with their parent.

```bash
# Preview while OpenCode is running; nothing is deleted or vacuumed.
~/.dotfiles/bin/opencode-cleanup --keep-days 5 --dry-run

# Quit OpenCode and its servers, then delete old sessions.
opencode-cleanup --keep-days 5

# Also reclaim database disk space (use after large cleanups or monthly).
opencode-cleanup --keep-days 5 --vacuum
```

The script refuses destructive maintenance when another process has the
database open, prevents overlapping cleanup runs with a lock directory next
to the database, and logs progress to stdout (errors go to stderr). Stop
launching OpenCode until maintenance finishes. Dry runs remain read-only.
It uses `opencode`, `sqlite3`, and `lsof`; the latter two ship with macOS.

For regular maintenance, run deletion daily and vacuum occasionally: SQLite
reuses deleted space without vacuuming. A macOS `launchd` job can invoke the
script, but no schedule is installed here. Scheduled jobs must include the
OpenCode binary directory in `PATH` and capture stdout/stderr; database-in-use
and other failures exit nonzero so the job can retry on its next scheduled run.

The script intentionally rejects other major versions. OpenCode v2 uses a
shared background server and different interfaces; closing its UI is not
sufficient for offline maintenance.

V2 has no documented age-based session retention setting. Its experimental
`location_idle_timeout` unloads inactive project services, not session history.
Leave this V1 utility unused on V2; do not bypass its version guard.

## Claude Code

The following Claude Code config is tracked in this repo and symlinked by `dfm install`:

| Path | What it is |
|------|------------|
| `~/.claude/settings.json` | Permissions, hooks, plugins, model, status line config |
| `~/.claude/CLAUDE.md` | Global instructions (Jira/Git rules) |
| `~/.claude/commands/` | Custom slash commands (badge-on/off, tab-chroma) |
| `~/.claude/hooks/ccusage-statusline.sh` | Custom status line script |
| `~/.claude/skills/agent-browser/` | Browser automation skill |
| `~/.claude/skills/david-voice/` | Writing voice skill |
| `~/.config/ccstatusline/settings.json` | Status line layout config |

### Post-install steps

**Install ccusage and ccstatusline** (power the status line):

```
npm install -g ccusage
npm install -g ccstatusline
```

**Install the `/util.md-to-clipboard` skill dependency:**

```
pip3 install pyobjc-framework-Cocoa
```

**Re-authenticate marketplace plugins** — plugins are auth'd per-machine. After first launch, Claude Code will prompt you to authenticate:
- `proofread@invitation-homes`
- `ospj@invitation-homes`
- `backlog-review@invitation-homes`
- `ih-brand@invitation-homes`
- `skill-creator@claude-plugins-official`

## Alfred Setup

* [Github Workflow](https://github.com/gharlan/alfred-github-workflow) - install [latest release](https://github.com/gharlan/alfred-github-workflow/releases)

## Other Setup Stuff for new Mac:

* Install Anonymous Pro: https://www.marksimonson.com/fonts/view/anonymous-pro
* TextMate (`mate`) is the default `$EDITOR`. Enable its CLI: open TextMate once, then TextMate → Settings → Terminal → Install Shell Support.

## Full documentation

For more information, check out the [wiki](http://github.com/justone/dotfiles/wiki).

You can also run <tt>dfm --help</tt>.
