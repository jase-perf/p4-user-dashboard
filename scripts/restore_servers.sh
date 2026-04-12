#!/usr/bin/env bash
set -euo pipefail

# Restore test servers from a previously saved snapshot.
# Stops servers, rebuilds databases from checkpoint files, restarts.

PORTS=(1701 1702 1703)
NAMES=("tokyo-main" "osaka-dev" "nagoya-art")
BASE_DIR="/tmp/p4d-test"
SNAPSHOT_DIR="/tmp/p4d-snapshots"

if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo "No snapshots found at $SNAPSHOT_DIR"
    echo "Run 'bash scripts/snapshot_servers.sh' first to create a snapshot."
    exit 1
fi

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$BASE_DIR-$((i+1))"
    snapshot="$SNAPSHOT_DIR/$name.ckp"

    if [ ! -f "$snapshot" ]; then
        echo "  $name: no snapshot found, skipping"
        continue
    fi

    # Stop the server if running
    p4 -p "localhost:$port" -u super admin stop 2>/dev/null || true
    pkill -9 -f "p4d -p $port" 2>/dev/null || true
    sleep 0.5

    # Clear existing data
    rm -rf "$root"
    mkdir -p "$root"

    # Restore from checkpoint
    p4d -r "$root" -jr "$snapshot" 2>/dev/null

    # Restart
    p4d -p "$port" -r "$root" -d </dev/null >/dev/null 2>&1

    # Verify
    count=$(P4PORT="localhost:$port" P4USER=super p4 users -a 2>/dev/null | wc -l)
    echo "  $name (port $port): restored ($count users)"
done

echo ""
echo "All servers restored from snapshot."
