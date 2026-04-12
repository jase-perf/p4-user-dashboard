#!/usr/bin/env bash
set -euo pipefail

# Save a snapshot of the current test server state that can be restored later.
# Dumps checkpoints while servers are running (no stop/restart needed).

PORTS=(1701 1702 1703 1704 1705)
NAMES=("tokyo-prod" "osaka-dev" "nagoya-art" "seoul-mobile" "singapore-qa")
BASE_DIR="/tmp/p4d-test"
SNAPSHOT_DIR="/tmp/p4d-snapshots"

mkdir -p "$SNAPSHOT_DIR"

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$BASE_DIR-$((i+1))"
    snapshot="$SNAPSHOT_DIR/$name.ckp"

    if [ ! -d "$root" ]; then
        echo "  $name: no data directory, skipping"
        continue
    fi

    # Dump checkpoint (works whether server is running or stopped)
    if p4d -r "$root" -jd "$snapshot" >/dev/null 2>&1; then
        chmod 644 "$snapshot"
        echo "  $name: snapshot saved"
    else
        echo "  $name: ERROR — checkpoint dump failed"
    fi
done

echo ""
echo "Snapshots saved to $SNAPSHOT_DIR/"
echo "Restore with: bash scripts/restore_servers.sh"
