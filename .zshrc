# Path to your oh-my-zsh configuration.
ZSH=$HOME/.oh-my-zsh

# Set name of the theme to load.
# Look in ~/.oh-my-zsh/themes/
# Optionally, if you set this to "random", it'll load a random theme each
# time that oh-my-zsh is loaded.
ZSH_THEME="bira-custom"

export EDITOR='mate -w'
export LESS="R"

# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

alias gs='git status -sb'
alias gfo="git fetch origin"
alias gprune='git remote prune origin && git branch --merged | grep -v "\*" | grep -vE "^  (main|master)$" | xargs -n 1 git branch -d'

__git_files () { 
    _wanted files expl 'local files' _files 
}

# Set to this to use case-sensitive completion
# CASE_SENSITIVE="true"

# Comment this out to disable bi-weekly auto-update checks
# DISABLE_AUTO_UPDATE="true"

# Uncomment to change how often before auto-updates occur? (in days)
# export UPDATE_ZSH_DAYS=13

# Uncomment following line if you want to disable colors in ls
# DISABLE_LS_COLORS="true"

# Uncomment following line if you want to disable autosetting terminal title.
DISABLE_AUTO_TITLE="true"

# Uncomment following line if you want to disable command autocorrection
# DISABLE_CORRECTION="true"

# Uncomment following line if you want red dots to be displayed while waiting for completion
# COMPLETION_WAITING_DOTS="true"

# Uncomment following line if you want to disable marking untracked files under
# VCS as dirty. This makes repository status check for large repositories much,
# much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
plugins=(alias-finder git git-extras vi-mode copyfile docker docker-compose npm)

source $ZSH/oh-my-zsh.sh

source "$(brew --prefix)/share/zsh-history-substring-search/zsh-history-substring-search.zsh"
source "$(brew --prefix)/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

bindkey '^[OA' history-substring-search-up
bindkey '^[OB' history-substring-search-down

. $HOME/.shellrc.load

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"

# Machine-specific overrides (secrets, model prefs). Not part of dotfiles.
[ -f "$HOME/.zshrc.local" ] && . "$HOME/.zshrc.local"

# tab-chroma
alias tab-chroma="$HOME/.config/tab-chroma/tab-chroma.sh"

# tab-chroma: reset tab on claude exit
claude() {
  command claude "$@"
  local rc=$?
  tab-chroma reset > /dev/null 2>&1
  return $rc
}

# tab-chroma: reset tab on opencode exit
opencode() {
  command opencode "$@"
  local rc=$?
  tab-chroma reset > /dev/null 2>&1
  return $rc
}
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# opencode
export PATH="$HOME/.opencode/bin:$PATH"
