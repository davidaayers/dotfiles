# Dotfiles & Misc Setup Stuff

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
git clone https://github.com/scottpopplewell/dotfiles.git .dotfiles
./.dotfiles/bin/dfm install # creates symlinks to install files
```

## Machine-specific setup (not committed)

Secrets and identity are kept out of the repo. Create these locally:

* `~/.zshrc.local` (sourced by `.zshrc`) — exports tokens read from `~/.config/secrets/`:
  * `~/.config/secrets/homebrew_api_token` — GitHub PAT (no permissions needed) for Homebrew
  * `~/.config/secrets/npm_token` — NPM token with publish access

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

## Claude Code

The following Claude Code config is tracked in this repo and symlinked by `dfm install`:

| Path | What it is |
|------|------------|
| `~/.claude/settings.json` | Permissions, plugins, model, status line config |
| `~/.claude/CLAUDE.md` | Global instructions (Jira/Git rules) |
| `~/.claude/hooks/ccusage-statusline.sh` | Custom status line script |
| `~/.claude/skills/agent-browser/` | Browser automation skill |
| `~/.config/ccstatusline/settings.json` | Status line layout config |

### Post-install steps

**Install ccusage and ccstatusline** (power the status line):

```
npm install -g ccusage
npm install -g ccstatusline
```

**Re-authenticate marketplace plugins** — plugins are auth'd per-machine. After first launch, Claude Code will prompt you to authenticate:
- `proofread@invitation-homes`
- `ospj@invitation-homes`
- `backlog-review@invitation-homes`
- `ih-brand@invitation-homes`
- `skill-creator@claude-plugins-official`

## Alfred Setup

* [Github Workflow](https://github.com/gharlan/alfred-github-workflow) - install [latest release](https://github.com/gharlan/alfred-github-workflow/releases)

## Full documentation

For more information, check out the [wiki](http://github.com/justone/dotfiles/wiki).

You can also run <tt>dfm --help</tt>.
