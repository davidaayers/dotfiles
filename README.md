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
* `~/.gitconfig.local` (included by `.gitconfig`) — git `[user]` identity, and a
  work-specific `core.hooksPath` if you use the Invitation Homes
  `git-shared-hooks` checkout at `~/git-shared-hooks`.

## Setup Programs

The `Brewfile` included in the .dotfiles directory uses [brew bundle](https://github.com/Homebrew/homebrew-bundle) to setup every program in that file with one simple command:

`brew bundle`

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

**Claude Code** — registers shell hooks in `~/.claude/settings.json` (not part
of this repo) that call `tab-chroma.sh` on `SessionStart`/`UserPromptSubmit`/
`PreToolUse`/`Stop`/`Notification`/`PermissionRequest`. The `claude()` wrapper
in `.zshrc` resets the tab on exit (Claude Code has no exit hook).

**opencode** — opencode has no hook system, so `.config/opencode/plugin/tab-chroma.ts`
subscribes to opencode's plugin event bus and pipes the same JSON the script
expects into `~/.config/tab-chroma/tab-chroma.sh`. The `opencode()` wrapper in
`.zshrc` resets the tab on exit. The plugin is registered in `opencode.jsonc`
via `"plugin": ["./plugin/tab-chroma.ts"]` and has no npm dependencies, so a
fresh clone needs no `npm install`.

Event mapping for opencode:

| opencode event | tab-chroma state |
| -------------- | ---------------- |
| `session.created` | `session.start` (reset) |
| `session.status` (busy) | `working` |
| `session.idle` | `done` |
| `permission.ask` | `permission` |

Notes:

* `~/.config/tab-chroma/config.json` is gitignored — the script rewrites it on
  theme/feature toggles and regenerates defaults via `ensure_config()`.
* After changing `opencode.jsonc` or the plugin, restart opencode — its config
  is loaded once at startup and not hot-reloaded.
* After changing `.zshrc`, run `source ~/.zshrc` or open a new shell.

## Alfred Setup

* [Github Workflow](https://github.com/gharlan/alfred-github-workflow) - install [latest release](https://github.com/gharlan/alfred-github-workflow/releases)

## Other Setup Stuff for new Mac:

* Install Anonymous Pro: https://www.marksimonson.com/fonts/view/anonymous-pro

## Full documentation

For more information, check out the [wiki](http://github.com/justone/dotfiles/wiki).

You can also run <tt>dfm --help</tt>.

