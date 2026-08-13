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


## Alfred Setup

* [Github Workflow](https://github.com/gharlan/alfred-github-workflow) - install [latest release](https://github.com/gharlan/alfred-github-workflow/releases)

## Other Setup Stuff for new Mac:

* Install Anonymous Pro: https://www.marksimonson.com/fonts/view/anonymous-pro

## Full documentation

For more information, check out the [wiki](http://github.com/justone/dotfiles/wiki).

You can also run <tt>dfm --help</tt>.

