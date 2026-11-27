#!/usr/bin/env zsh

# Run Pi in the current tmux pane and Treevim in a new pane to its right.
#
# Both processes receive the same private Unix-socket location. When Pi exits,
# this script closes the Treevim pane and removes the temporary socket directory.
#
# Usage:
#   ./treevim-pi.zsh
#   ./treevim-pi.zsh ./another-extension.ts
#   DEBUG=1 ./treevim-pi.zsh

set -e

if [[ -z ${TMUX:-} || -z ${TMUX_PANE:-} ]]; then
  print -u2 "Run this script from inside a tmux pane."
  exit 1
fi

# Resolve executables before creating the pane. In particular, the tmux server
# may have a different PATH from the shell that runs this script.
tmux_bin=$(whence -p tmux) || {
  print -u2 "tmux executable not found."
  exit 1
}

pi_bin=$(whence -p pi) || {
  print -u2 "Pi executable not found."
  exit 1
}

typeset -a treevim_command

if [[ ${DEBUG:-} == 1 ]]; then
  pnpm_bin=$(whence -p pnpm) || {
    print -u2 "pnpm executable not found."
    exit 1
  }

  treevim_command=("$pnpm_bin" dev)
else
  treevim_bin=$(whence -p treevim) || {
    print -u2 "treevim executable not found."
    exit 1
  }

  treevim_command=("$treevim_bin")
fi

# Pi loads the installed Treevim package automatically.
# Each supplied argument adds another extension file.
typeset -a pi_args
for extension in "$@"; do
  if [[ ! -f "$extension" ]]; then
    print -u2 "Extension not found: $extension"
    exit 1
  fi

  pi_args+=(-e "$extension")
done

# Keep the pathname short enough for Unix-domain sockets, including on macOS.
# mktemp creates a private directory; the explicit chmod reinforces that intent.
socket_dir=$(mktemp -d /tmp/treevim-pi.XXXXXX)
treevim_pane=''

cleanup() {
  # Only close the pane created by this script, never the original Pi pane.
  if [[ -n "$treevim_pane" ]]; then
    "$tmux_bin" kill-pane -t "$treevim_pane" 2>/dev/null || true
  fi

  # Remove only the known socket and its private directory.
  rm -f -- "$socket_dir/sock"
  rmdir -- "$socket_dir" 2>/dev/null || true
}

trap cleanup EXIT
chmod 700 "$socket_dir"

export TREEVIM_SOCKET="$socket_dir/sock"

# Split the current pane side by side. -d keeps focus in the original pane;
# -P/-F return the new pane's ID for cleanup. Pass the socket and current PATH
# explicitly because the tmux server may have an older environment.
treevim_pane=$(
  "$tmux_bin" split-window \
    -h -d -P \
    -F '#{pane_id}' \
    -t "$TMUX_PANE" \
    -c "$PWD" \
    env "TREEVIM_SOCKET=$TREEVIM_SOCKET" "PATH=$PATH" "${treevim_command[@]}"
)

# Wait for Treevim's socket to appear before starting Pi. The app itself may
# still be loading; in that case an early tool call can report "no app ready".
for attempt in {1..100}; do
  if [[ -S "$TREEVIM_SOCKET" ]]; then
    break
  fi

  # Fail early if Treevim exited instead of waiting for the full timeout.
  if ! "$tmux_bin" display-message -p -t "$treevim_pane" \
    '#{pane_id}' >/dev/null 2>&1; then
    print -u2 "Treevim exited before its socket was ready."
    exit 1
  fi

  sleep 0.1
done

if [[ ! -S "$TREEVIM_SOCKET" ]]; then
  print -u2 "Timed out waiting for Treevim's socket."
  exit 1
fi

# Run Pi in the original pane. Don't use exec: the EXIT trap must run after Pi
# exits so the Treevim pane and socket are cleaned up.
"$pi_bin" "${pi_args[@]}"