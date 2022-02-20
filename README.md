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

## Setup tokens

* Homebrew github token - under Settings > Developer Settings > Personal Access Token (it doesn't need any specific permissions)
  `~/.dotfiles/homebrew_api_token`

* NPM Token - needs publish
  `~/.dotfiles/npm_token`


## Setup Programs

The `Brewfile` included in the .dotfiles directory uses [brew bundle](https://github.com/Homebrew/homebrew-bundle) to setup every program in that file with one simple command:

`brew bundle`


## Alfred Setup

* [Github Workflow](https://github.com/gharlan/alfred-github-workflow) - install [latest release](https://github.com/gharlan/alfred-github-workflow/releases)

## Other Setup Stuff for new Mac:

* Install Anonymous Pro: https://www.marksimonson.com/fonts/view/anonymous-pro

## Full documentation

For more information, check out the [wiki](http://github.com/justone/dotfiles/wiki).

You can also run <tt>dfm --help</tt>.

## Other stuff to look into:

* https://stevenrbaker.com/tech/managing-dotfiles-with-gnu-stow.html
