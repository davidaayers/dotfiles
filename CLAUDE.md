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
git clone git@github.com:davidaayers/dotfiles.git .dotfiles
./.dotfiles/bin/dfm install   # creates symlinks into $HOME

# Install all tools
brew bundle
```

After install, populate token files:
- `~/.dotfiles/homebrew_api_token` — GitHub PAT (no permissions needed) for Homebrew
- `~/.dotfiles/npm_token` — NPM token with publish access

## dfm behavior

- `bin/dfm install` symlinks all files from this repo into `$HOME`, preserving directory structure
- `.dfminstall` controls exceptions: files listed with `skip` are **not** symlinked (`README.md` and `Brewfile` are skipped so they don't pollute `$HOME`)
- After adding a new dotfile here, re-run `bin/dfm install` to create its symlink

## Key files

| File | Purpose |
|------|---------|
| `.zshrc` | Oh My Zsh config; theme `bira-custom`, plugins, PATH setup, token loading |
| `.gitconfig` | Git aliases, user identity, pull-rebase default |
| `.shellrc.load` | Sourced by `.zshrc`; place for additional PATH entries and shell customizations |
| `Brewfile` | Declarative list of all Homebrew packages and casks |

## Shell setup notes

- Theme: `bira-custom` (custom variant of bira, stored in `~/.oh-my-zsh/custom/themes/`)
- Node version management: **Volta** (primary, `~/.volta/bin` on PATH) and **nvm** (fallback, loaded from `/usr/local/opt/nvm`)
- History search: `zsh-history-substring-search` bound to arrow keys
- Syntax highlighting: `zsh-syntax-highlighting` (both installed via Homebrew)
