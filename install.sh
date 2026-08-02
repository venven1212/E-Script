#!/bin/sh
# Installs the E-script CLI as a standalone binary (no Node/npm required).
#
#   curl -fsSL https://raw.githubusercontent.com/venven1212/E-Script/main/install.sh | sh
#
# Override the install location with $ESCRIPT_INSTALL, e.g.:
#   ESCRIPT_INSTALL=/usr/local curl -fsSL .../install.sh | sh
set -eu

REPO="venven1212/E-Script"
INSTALL_DIR="${ESCRIPT_INSTALL:-$HOME/.escript}"
BIN_DIR="$INSTALL_DIR/bin"

os() {
  case "$(uname -s)" in
    Darwin) echo darwin ;;
    Linux) echo linux ;;
    *) echo "error: unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac
}

arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo x64 ;;
    arm64|aarch64) echo arm64 ;;
    *) echo "error: unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
}

PLATFORM="$(os)"
ARCH="$(arch)"
ASSET="escript-${PLATFORM}-${ARCH}"
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"

mkdir -p "$BIN_DIR"

echo "Downloading escript for ${PLATFORM}-${ARCH}..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$BIN_DIR/escript"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$URL" -O "$BIN_DIR/escript"
else
  echo "error: need curl or wget to install escript" >&2
  exit 1
fi

chmod +x "$BIN_DIR/escript"

echo "Installed escript to $BIN_DIR/escript"

# Add to PATH for common shells if not already present.
add_path_line() {
  rc_file="$1"
  line="export PATH=\"$BIN_DIR:\$PATH\""
  if [ -f "$rc_file" ] && ! grep -qsF "$BIN_DIR" "$rc_file"; then
    printf '\n# Added by E-script installer\n%s\n' "$line" >> "$rc_file"
    echo "Added $BIN_DIR to PATH in $rc_file"
  fi
}

case "${SHELL:-}" in
  */zsh) add_path_line "$HOME/.zshrc" ;;
  */bash) add_path_line "$HOME/.bashrc"; add_path_line "$HOME/.bash_profile" ;;
  *) add_path_line "$HOME/.profile" ;;
esac

case ":$PATH:" in
  *":$BIN_DIR:"*)
    echo "escript is ready — try: escript run yourfile.es"
    ;;
  *)
    echo "Restart your shell (or run: export PATH=\"$BIN_DIR:\$PATH\") then try: escript run yourfile.es"
    ;;
esac
