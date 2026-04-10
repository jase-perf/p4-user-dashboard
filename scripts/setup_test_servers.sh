#!/usr/bin/env bash
set -euo pipefail

PORTS=(1701 1702 1703)
NAMES=("tokyo-main" "osaka-dev" "nagoya-art")
BASE_DIR="/tmp/p4d-test"

teardown() {
    for port in "${PORTS[@]}"; do
        p4 -p "localhost:$port" admin stop 2>/dev/null || true
    done
    rm -rf "$BASE_DIR"-*
    echo "Test servers stopped and cleaned up."
}

if [[ "${1:-}" == "--teardown" ]]; then
    teardown
    exit 0
fi

# Clean up any previous runs
teardown 2>/dev/null || true

for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$BASE_DIR-$((i+1))"

    mkdir -p "$root"
    p4d -p "$port" -r "$root" -d
    echo "Started $name on port $port (root: $root)"

    export P4PORT="localhost:$port"
    export P4USER="super"

    # Create superuser
    echo "User: super
Email: super@test.local
FullName: Super User
Type: standard" | p4 user -f -i

    # Grant superuser access
    printf "Protections:\n\tsuper user super * //...\n" | p4 protect -i
done

# --- Server 1: tokyo-main (port 1701) ---
export P4PORT="localhost:1701"
export P4USER="super"

echo "User: alice
Email: alice@example.com
FullName: Alice Tanaka
Type: standard" | p4 user -f -i

echo "User: alice-admin
Email: alice@example.com
FullName: Alice Tanaka (Admin)
Type: standard" | p4 user -f -i

echo "User: bob
Email: bob@example.com
FullName: Bob Yamamoto
Type: standard" | p4 user -f -i

echo "User: charlie
Email: charlie@example.com
FullName: Charlie Nakamura
Type: standard" | p4 user -f -i

echo "User: david
Email: david@example.com
FullName: David Suzuki
Type: standard" | p4 user -f -i

echo "User: eve
Email: eve@example.com
FullName: Eve Watanabe
Type: standard" | p4 user -f -i

echo "User: svc-build
Email: svc-build@example.com
FullName: Build Service
Type: service" | p4 user -f -i

# --- Server 2: osaka-dev (port 1702) ---
export P4PORT="localhost:1702"
export P4USER="super"

echo "User: alice
Email: alice@example.com
FullName: Alice Tanaka
Type: standard" | p4 user -f -i

echo "User: bob
Email: bob@example.com
FullName: Bob Yamamoto
Type: standard" | p4 user -f -i

echo "User: frank
Email: frank@example.com
FullName: Frank Ito
Type: standard" | p4 user -f -i

echo "User: grace
Email: grace@example.com
FullName: Grace Kimura
Type: standard" | p4 user -f -i

echo "User: svc-deploy
Email: svc-deploy@example.com
FullName: Deploy Service
Type: service" | p4 user -f -i

# --- Server 3: nagoya-art (port 1703) ---
export P4PORT="localhost:1703"
export P4USER="super"

echo "User: alice
Email: alice@example.com
FullName: Alice Tanaka
Type: standard" | p4 user -f -i

echo "User: charlie
Email: charlie@example.com
FullName: Charlie Nakamura
Type: standard" | p4 user -f -i

echo "User: frank
Email: frank@example.com
FullName: Frank Ito
Type: standard" | p4 user -f -i

echo "User: heather
Email: heather@example.com
FullName: Heather Ogawa
Type: standard" | p4 user -f -i

echo ""
echo "Test servers ready:"
echo "  tokyo-main  — localhost:1701 (7 users + super, 1 service)"
echo "  osaka-dev   — localhost:1702 (5 users + super, 1 service)"
echo "  nagoya-art  — localhost:1703 (4 users + super)"
