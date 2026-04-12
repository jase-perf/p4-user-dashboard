#!/usr/bin/env bash
set -euo pipefail

PORTS=(1701 1702 1703)
NAMES=("tokyo-main" "osaka-dev" "nagoya-art")
BASE_DIR="/tmp/p4d-test"

teardown() {
    for port in "${PORTS[@]}"; do
        p4 -p "localhost:$port" admin stop 2>/dev/null || true
    done
    for port in "${PORTS[@]}"; do
        pkill -9 -f "p4d -p $port" 2>/dev/null || true
    done
    sleep 0.5
    rm -rf "$BASE_DIR"-*
    echo "Test servers stopped and cleaned up."
}

if [[ "${1:-}" == "--teardown" ]]; then
    teardown
    exit 0
fi

teardown 2>/dev/null || true

# --- Helper to create a user ---
create_user() {
    local username="$1" email="$2" fullname="$3" usertype="${4:-standard}"
    echo "User: $username
Email: $email
FullName: $fullname
Type: $usertype" | p4 user -f -i
}

# --- Start all servers ---
for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${NAMES[$i]}"
    root="$BASE_DIR-$((i+1))"

    mkdir -p "$root"
    p4d -p "$port" -r "$root" -d </dev/null >/dev/null 2>&1
    echo "Started $name on port $port (root: $root)"

    export P4PORT="localhost:$port"
    export P4USER="super"

    create_user "super" "admin@bandainamco.example.com" "Admin User"
    printf "Protections:\n\tsuper user super * //...\n" | p4 protect -i
done

# ===========================================================================
# Server 1: tokyo-main — primary production server (15 users + 2 service)
# ===========================================================================
export P4PORT="localhost:${PORTS[0]}"
export P4USER="super"

create_user "t.tanaka"    "takeshi.tanaka@bandainamco.example.com"   "田中 剛 (Tanaka Takeshi)"
create_user "t.tanaka-admin" "takeshi.tanaka@bandainamco.example.com" "田中 剛 - Admin (Tanaka Takeshi)"
create_user "y.suzuki"    "yuki.suzuki@bandainamco.example.com"      "鈴木 有紀 (Suzuki Yuki)"
create_user "k.yamamoto"  "kenji.yamamoto@bandainamco.example.com"   "山本 健二 (Yamamoto Kenji)"
create_user "m.watanabe"  "mika.watanabe@bandainamco.example.com"    "渡辺 美香 (Watanabe Mika)"
create_user "h.nakamura"  "hiroshi.nakamura@bandainamco.example.com" "中村 浩 (Nakamura Hiroshi)"
create_user "a.sato"      "akiko.sato@bandainamco.example.com"       "佐藤 明子 (Sato Akiko)"
create_user "r.ito"       "ryota.ito@bandainamco.example.com"        "伊藤 涼太 (Ito Ryota)"
create_user "s.kimura"    "sachiko.kimura@bandainamco.example.com"   "木村 幸子 (Kimura Sachiko)"
create_user "d.ogawa"     "daichi.ogawa@bandainamco.example.com"     "小川 大地 (Ogawa Daichi)"
create_user "n.matsuda"   "naomi.matsuda@bandainamco.example.com"    "松田 直美 (Matsuda Naomi)"
create_user "j.morita"    "jun.morita@bandainamco.example.com"       "森田 潤 (Morita Jun)"
create_user "e.fujita"    "emi.fujita@bandainamco.example.com"       "藤田 恵美 (Fujita Emi)"
create_user "t.kato"      "taro.kato@bandainamco.example.com"        "加藤 太郎 (Kato Taro)"
create_user "y.honda"     "yuko.honda@bandainamco.example.com"       "本田 祐子 (Honda Yuko)"
create_user "svc-build"   "svc-build@bandainamco.example.com"        "Build Service" "service"
create_user "svc-ci"      "svc-ci@bandainamco.example.com"           "CI Pipeline" "service"

# ===========================================================================
# Server 2: osaka-dev — development server (12 users + 1 service)
# ===========================================================================
export P4PORT="localhost:${PORTS[1]}"
export P4USER="super"

create_user "t.tanaka"    "takeshi.tanaka@bandainamco.example.com"   "田中 剛 (Tanaka Takeshi)"
create_user "y.suzuki"    "yuki.suzuki@bandainamco.example.com"      "鈴木 有紀 (Suzuki Yuki)"
create_user "k.yamamoto"  "kenji.yamamoto@bandainamco.example.com"   "山本 健二 (Yamamoto Kenji)"
create_user "m.watanabe"  "mika.watanabe@bandainamco.example.com"    "渡辺 美香 (Watanabe Mika)"
create_user "r.ito"       "ryota.ito@bandainamco.example.com"        "伊藤 涼太 (Ito Ryota)"
create_user "s.kimura"    "sachiko.kimura@bandainamco.example.com"   "木村 幸子 (Kimura Sachiko)"
create_user "k.nishida"   "koji.nishida@bandainamco.example.com"     "西田 浩二 (Nishida Koji)"
create_user "m.aoki"      "mai.aoki@bandainamco.example.com"         "青木 舞 (Aoki Mai)"
create_user "s.hashimoto" "shin.hashimoto@bandainamco.example.com"   "橋本 慎 (Hashimoto Shin)"
create_user "y.ueda"      "yumi.ueda@bandainamco.example.com"       "上田 由美 (Ueda Yumi)"
create_user "t.shimizu"   "takuya.shimizu@bandainamco.example.com"   "清水 拓也 (Shimizu Takuya)"
create_user "a.mori"      "ayaka.mori@bandainamco.example.com"       "森 彩花 (Mori Ayaka)"
create_user "svc-deploy"  "svc-deploy@bandainamco.example.com"       "Deploy Service" "service"

# ===========================================================================
# Server 3: nagoya-art — art asset server (10 users + 1 service)
# ===========================================================================
export P4PORT="localhost:${PORTS[2]}"
export P4USER="super"

create_user "t.tanaka"    "takeshi.tanaka@bandainamco.example.com"   "田中 剛 (Tanaka Takeshi)"
create_user "m.watanabe"  "mika.watanabe@bandainamco.example.com"    "渡辺 美香 (Watanabe Mika)"
create_user "h.nakamura"  "hiroshi.nakamura@bandainamco.example.com" "中村 浩 (Nakamura Hiroshi)"
create_user "e.fujita"    "emi.fujita@bandainamco.example.com"       "藤田 恵美 (Fujita Emi)"
create_user "k.nishida"   "koji.nishida@bandainamco.example.com"     "西田 浩二 (Nishida Koji)"
create_user "m.aoki"      "mai.aoki@bandainamco.example.com"         "青木 舞 (Aoki Mai)"
create_user "r.takahashi" "rina.takahashi@bandainamco.example.com"   "高橋 里奈 (Takahashi Rina)"
create_user "k.endo"      "kazuki.endo@bandainamco.example.com"      "遠藤 和樹 (Endo Kazuki)"
create_user "n.hayashi"   "natsuki.hayashi@bandainamco.example.com"  "林 夏樹 (Hayashi Natsuki)"
create_user "y.inoue"     "yusuke.inoue@bandainamco.example.com"     "井上 悠介 (Inoue Yusuke)"
create_user "svc-render"  "svc-render@bandainamco.example.com"       "Render Farm" "service"

echo ""
echo "Applying varied access times..."

# ===========================================================================
# Stop servers, modify access times via checkpoint, restart
# ===========================================================================

for port in "${PORTS[@]}"; do
    p4 -p "localhost:$port" admin stop 2>/dev/null || true
done
sleep 1

# Run the access time modification via Python
python3 "$(dirname "$0")/set_access_times.py" "${PORTS[@]}"

echo ""
echo "Test servers ready with varied access times:"
echo "  tokyo-main  — localhost:${PORTS[0]} (15 standard + super, 2 service)"
echo "  osaka-dev   — localhost:${PORTS[1]} (12 standard + super, 1 service)"
echo "  nagoya-art  — localhost:${PORTS[2]} (10 standard + super, 1 service)"
echo ""
echo "Notable users for demo:"
echo "  t.tanaka      — active on all 3 servers, admin account abandoned on tokyo-main"
echo "  a.sato        — 400 days inactive on tokyo-main (deletion candidate)"
echo "  j.morita      — 250 days inactive on tokyo-main"
echo "  y.inoue       — 365 days inactive on nagoya-art"
echo "  k.nishida     — active on osaka-dev, 200 days abandoned on nagoya-art"
echo "  k.yamamoto    — active on tokyo-main, 90 days abandoned on osaka-dev"
