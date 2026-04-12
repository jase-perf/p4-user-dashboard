#!/usr/bin/env bash
set -euo pipefail

# Save a snapshot of the current test server state that can be restored later.
# Creates checkpoint files in a snapshot directory.

PORTS=(1701 1702 1703)
NAMES=("tokyo-main" "osaka-dev" "nagoya-art")
BASE_DIR="/tmp/p4d-test"
SNAPSHOT_DIR="/tmp/p4d-snapshots"

mkdir -p "$SNAPSHOT_DIR"

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$BASE_DIR-$((i+1))"
    snapshot="$SNAPSHOT_DIR/$name.ckp"

    if ! p4 -p "localhost:$port" info >/dev/null 2>&1; then
        echo "  $name (port $port): not running, skipping"
        continue
    fi

    # Stop the server to get a clean checkpoint
    p4 -p "localhost:$port" -u super admin stop 2>/dev/null || true
    sleep 0.5

    # Dump checkpoint
    p4d -r "$root" -jd "$snapshot" 2>/dev/null
    chmod 644 "$snapshot"

    # Restart the server
    p4d -p "$port" -r "$root" -d </dev/null >/dev/null 2>&1

    echo "  $name: snapshot saved to $snapshot"
done

echo ""
echo "Snapshots saved to $SNAPSHOT_DIR/"
echo "Restore with: bash scripts/restore_servers.sh"
