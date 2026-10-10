# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal dotfiles managed with [dfm](https://github.com/justone/dotfiles) (Dotfiles Manager). Files are symlinked from `~/.dotfiles/` into `$HOME` via `bin/dfm install`.

## Installing on a new machine

```bash
# Prerequisites (in order)
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Clone and install
cd $HOME
git clone https://github.com/scottpopplewell/dotfiles.git .dotfiles
./.dotfiles/bin/dfm install   # creates symlinks into $HOME

# Install all tools
brew bundle
```

## Machine-specific setup (not committed)

Secrets and identity live outside the repo so a fresh clone has no hardcoded
machine paths or credentials:

- `~/.zshrc.local` — sourced by `.zshrc` if present. Holds secret exports
  (`HOMEBREW_GITHUB_API_TOKEN`, `NPM_AUTH_TOKEN`) and personal model prefs.
  Tokens are read from `~/.config/secrets/`.
  - `~/.config/secrets/homebrew_api_token` — GitHub PAT (no permissions needed) for Homebrew
  - `~/.config/secrets/npm_token` — NPM token with publish access
- `~/.gitconfig.local` — included by `.gitconfig` via `[include]`. Holds `[user]`
  identity, plus a work-specific `core.hooksPath` pointing at the Invitation
  Homes `git-shared-hooks` checkout (`~/git-shared-hooks`).

Full install/setup docs live in `README.md` (canonical).

## dfm behavior

- `bin/dfm install` symlinks all files from this repo into `$HOME`, preserving directory structure
- `.dfminstall` controls exceptions: `skip` entries are **not** symlinked
  (`README.md`, `Brewfile`, `CLAUDE.md`), `recurse` entries are recursed into so only
  their contents get symlinked (`.config`, `.claude`)
- After adding a new dotfile here, re-run `bin/dfm install` to create its symlink

## Key files

| File | Purpose |
|------|---------|
| `.zshrc` | Oh My Zsh config; theme `robbyrussell`, plugins, PATH setup |
| `.gitconfig` | Git aliases, pull-rebase default, includes `~/.gitconfig.local` |
| `.shellrc.load` | Sourced by `.zshrc`; place for additional PATH entries and shell customizations |
| `Brewfile` | Declarative list of all Homebrew packages and casks |

## Shell setup notes

- Theme: `robbyrussell` (stock Oh My Zsh theme)
- Node version management: **Volta** only (`~/.volta/bin` on PATH)
- Python: **pyenv** (`~/.pyenv`), initialized in `.zshrc` via `pyenv init -` (installed via Brewfile)
- History search: `zsh-history-substring-search` bound to arrow keys
- Syntax highlighting: `zsh-syntax-highlighting` (both installed via Homebrew)
