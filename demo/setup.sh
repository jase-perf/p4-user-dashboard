#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# P4 User Dashboard — Demo Server Setup
#
# Sets up 5 lightweight P4D servers with realistic demo data:
#   - tokyo-prod    (unicode)     18 users + 2 service
#   - osaka-dev     (non-unicode) 14 users + 1 service
#   - nagoya-art    (unicode)     12 users + 1 service
#   - seoul-mobile  (non-unicode) 10 users + 1 service
#   - singapore-qa  (non-unicode)  8 users + 1 service
#
# Users have varied access times (1 day to 400 days ago) to demonstrate
# the dashboard's filtering and analysis capabilities.
#
# Usage:
#   bash demo/setup.sh              # Set up demo servers
#   bash demo/setup.sh --teardown   # Stop and remove demo servers
#   bash demo/setup.sh --status     # Show running server status
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$SCRIPT_DIR"
BIN_DIR="$DEMO_DIR/bin"
CHECKPOINTS_DIR="$DEMO_DIR/checkpoints"
DATA_DIR="$DEMO_DIR/data"

PORTS=(1701 1702 1703 1704 1705)
NAMES=("tokyo-prod" "osaka-dev" "nagoya-art" "seoul-mobile" "singapore-qa")

# ---- Locate p4d binary ----

find_p4d() {
    # 1. Check demo/bin/ first (user-provided or previously downloaded)
    if [ -x "$BIN_DIR/p4d" ]; then
        echo "$BIN_DIR/p4d"
        return 0
    fi
    if [ -x "$BIN_DIR/p4d.exe" ]; then
        echo "$BIN_DIR/p4d.exe"
        return 0
    fi
    # 2. Check PATH
    if command -v p4d >/dev/null 2>&1; then
        command -v p4d
        return 0
    fi
    return 1
}

download_p4d() {
    local version="r25.2"
    local base_url="https://ftp.perforce.com/perforce/$version"
    local platform=""
    local binary_name="p4d"

    case "$(uname -s)-$(uname -m)" in
        Linux-x86_64)   platform="bin.linux26x86_64" ;;
        Linux-aarch64)  platform="bin.linux26aarch64" ;;
        Darwin-arm64)   platform="bin.macosx12arm64" ;;
        Darwin-x86_64)  platform="bin.macosx12x86_64" ;;
        MINGW*|MSYS*|CYGWIN*)
            platform="bin.ntx64"
            binary_name="p4d.exe"
            ;;
        *)
            echo "ERROR: Unsupported platform: $(uname -s)-$(uname -m)"
            echo "Download p4d manually and place it in: $BIN_DIR/"
            return 1
            ;;
    esac

    local url="$base_url/$platform/$binary_name"
    echo "Downloading p4d from $url ..."
    mkdir -p "$BIN_DIR"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL -o "$BIN_DIR/$binary_name" "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$BIN_DIR/$binary_name" "$url"
    else
        echo "ERROR: Neither curl nor wget found. Download p4d manually:"
        echo "  $url"
        echo "  Place it in: $BIN_DIR/$binary_name"
        return 1
    fi
    chmod +x "$BIN_DIR/$binary_name"
    echo "Downloaded p4d to $BIN_DIR/$binary_name"
}

# ---- Server management ----

teardown() {
    for i in "${!PORTS[@]}"; do
        local port="${PORTS[$i]}"
        p4 -p "localhost:$port" admin stop 2>/dev/null || true
        pkill -9 -f "p4d.*-p $port" 2>/dev/null || true
    done
    sleep 0.5
    rm -rf "$DATA_DIR"
    echo "Demo servers stopped and data removed."
}

status() {
    echo "Demo server status:"
    for i in "${!PORTS[@]}"; do
        local port="${PORTS[$i]}"
        local name="${NAMES[$i]}"
        if P4PORT="localhost:$port" P4USER=super p4 info >/dev/null 2>&1; then
            local count
            count=$(P4PORT="localhost:$port" P4USER=super P4CHARSET=utf8 p4 users -a 2>/dev/null | wc -l || \
                    P4PORT="localhost:$port" P4USER=super p4 users -a 2>/dev/null | wc -l)
            echo "  $name  :$port  RUNNING  ($count users)"
        else
            echo "  $name  :$port  STOPPED"
        fi
    done
}

# ---- Handle arguments ----

case "${1:-}" in
    --teardown)
        teardown
        exit 0
        ;;
    --status)
        status
        exit 0
        ;;
esac

# ---- Main setup ----

echo "P4 User Dashboard — Demo Setup"
echo ""

# Find or download p4d
P4D_BIN=""
if P4D_BIN=$(find_p4d); then
    echo "Using p4d: $P4D_BIN"
    echo "  $("$P4D_BIN" -V 2>&1 | grep 'Rev\.' | head -1)"
else
    echo "p4d not found. Attempting to download..."
    download_p4d
    P4D_BIN=$(find_p4d) || {
        echo "ERROR: Could not find or download p4d."
        echo ""
        echo "To fix this, either:"
        echo "  1. Install p4d and make sure it's in your PATH"
        echo "  2. Download p4d and place it in: $BIN_DIR/"
        echo "     https://www.perforce.com/downloads/helix-core-server"
        exit 1
    }
    echo "Using p4d: $P4D_BIN"
fi

# Check for checkpoint files
if [ ! -d "$CHECKPOINTS_DIR" ] || [ -z "$(ls "$CHECKPOINTS_DIR"/*.ckp 2>/dev/null)" ]; then
    echo "ERROR: No checkpoint files found in $CHECKPOINTS_DIR/"
    echo "These should be included in the repository."
    exit 1
fi

# Clean up any previous demo
teardown 2>/dev/null || true

echo ""
echo "Restoring demo servers from checkpoints..."

mkdir -p "$DATA_DIR"

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$DATA_DIR/$name"
    ckp="$CHECKPOINTS_DIR/$name.ckp"

    if [ ! -f "$ckp" ]; then
        echo "  $name: checkpoint not found, skipping"
        continue
    fi

    mkdir -p "$root"

    # Restore from checkpoint
    "$P4D_BIN" -r "$root" -jr "$ckp" >/dev/null 2>&1

    # Start server
    "$P4D_BIN" -p "$port" -r "$root" -d </dev/null >/dev/null 2>&1

    # Verify (try without charset first, then with — one will work)
    count=$(P4PORT="localhost:$port" P4USER=super p4 users -a 2>/dev/null | wc -l || true)
    if [ "$count" = "0" ]; then
        count=$(P4PORT="localhost:$port" P4USER=super P4CHARSET=utf8 p4 users -a 2>/dev/null | wc -l || true)
    fi

    echo "  $name  :$port  ($count users)"
done

echo ""
echo "Demo servers are running. Start the dashboard with:"
echo "  python dashboard.py demo/config.json"
echo ""
echo "To stop demo servers:"
echo "  bash demo/setup.sh --teardown"
echo ""
echo "To check status:"
echo "  bash demo/setup.sh --status"
