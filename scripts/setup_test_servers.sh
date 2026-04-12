#!/usr/bin/env bash
set -euo pipefail

PORTS=(1701 1702 1703 1704 1705)
NAMES=("tokyo-prod" "osaka-dev" "nagoya-art" "seoul-mobile" "singapore-qa")
# tokyo-prod and nagoya-art are unicode; others are non-unicode
UNICODE=(1 0 1 0 0)
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
    unicode="${UNICODE[$i]}"

    mkdir -p "$root"
    if [ "$unicode" = "1" ]; then
        p4d -r "$root" -xi 2>/dev/null
        echo "Started $name on port $port (unicode)"
    else
        echo "Started $name on port $port"
    fi
    p4d -p "$port" -r "$root" -d </dev/null >/dev/null 2>&1

    export P4PORT="localhost:$port"
    export P4USER="super"
    if [ "$unicode" = "1" ]; then
        export P4CHARSET="utf8"
    else
        unset P4CHARSET 2>/dev/null || true
    fi

    create_user "super" "admin@studio.example.com" "Admin User"
    printf "Protections:\n\tsuper user super * //...\n" | p4 protect -i
done
unset P4CHARSET 2>/dev/null || true

# ===========================================================================
# Server 1: tokyo-prod — main production server (UNICODE)
# 18 users + 2 service — mix of Japanese staff and international contractors
# ===========================================================================
export P4PORT="localhost:${PORTS[0]}"
export P4USER="super"
export P4CHARSET="utf8"

# Japanese core team
create_user "t.tanaka"       "takeshi.tanaka@studio.example.com"    "田中 剛 (Tanaka Takeshi)"
create_user "t.tanaka-admin" "takeshi.tanaka@studio.example.com"    "田中 剛 - Admin (Tanaka Takeshi)"
create_user "y.suzuki"       "yuki.suzuki@studio.example.com"       "鈴木 有紀 (Suzuki Yuki)"
create_user "k.yamamoto"     "kenji.yamamoto@studio.example.com"    "山本 健二 (Yamamoto Kenji)"
create_user "m.watanabe"     "mika.watanabe@studio.example.com"     "渡辺 美香 (Watanabe Mika)"
create_user "h.nakamura"     "hiroshi.nakamura@studio.example.com"  "中村 浩 (Nakamura Hiroshi)"
create_user "a.sato"         "akiko.sato@studio.example.com"        "佐藤 明子 (Sato Akiko)"
create_user "r.ito"          "ryota.ito@studio.example.com"         "伊藤 涼太 (Ito Ryota)"
create_user "s.kimura"       "sachiko.kimura@studio.example.com"    "木村 幸子 (Kimura Sachiko)"
create_user "d.ogawa"        "daichi.ogawa@studio.example.com"      "小川 大地 (Ogawa Daichi)"
create_user "n.matsuda"      "naomi.matsuda@studio.example.com"     "松田 直美 (Matsuda Naomi)"
create_user "j.morita"       "jun.morita@studio.example.com"        "森田 潤 (Morita Jun)"
create_user "e.fujita"       "emi.fujita@studio.example.com"        "藤田 恵美 (Fujita Emi)"
create_user "t.kato"         "taro.kato@studio.example.com"         "加藤 太郎 (Kato Taro)"
# International contractors on tokyo-prod
create_user "j.chen"         "jiawei.chen@studio.example.com"       "陈家伟 (Chen Jiawei)"
create_user "p.kumar"        "priya.kumar@studio.example.com"       "Priya Kumar"
create_user "m.garcia"       "miguel.garcia@studio.example.com"     "Miguel García"
create_user "s.williams"     "sarah.williams@studio.example.com"    "Sarah Williams"
# Service accounts
create_user "svc-build"      "svc-build@studio.example.com"         "Build Service" "service"
create_user "svc-ci"         "svc-ci@studio.example.com"            "CI Pipeline" "service"

# ===========================================================================
# Server 2: osaka-dev — dev/engineering server (non-unicode)
# 14 users + 1 service
# ===========================================================================
export P4PORT="localhost:${PORTS[1]}"
unset P4CHARSET 2>/dev/null || true

# Overlapping Japanese team members
create_user "t.tanaka"       "takeshi.tanaka@studio.example.com"    "Tanaka Takeshi"
create_user "y.suzuki"       "yuki.suzuki@studio.example.com"       "Suzuki Yuki"
create_user "k.yamamoto"     "kenji.yamamoto@studio.example.com"    "Yamamoto Kenji"
create_user "m.watanabe"     "mika.watanabe@studio.example.com"     "Watanabe Mika"
create_user "r.ito"          "ryota.ito@studio.example.com"         "Ito Ryota"
create_user "s.kimura"       "sachiko.kimura@studio.example.com"    "Kimura Sachiko"
# Dev-only staff
create_user "k.nishida"      "koji.nishida@studio.example.com"      "Nishida Koji"
create_user "m.aoki"         "mai.aoki@studio.example.com"          "Aoki Mai"
create_user "s.hashimoto"    "shin.hashimoto@studio.example.com"    "Hashimoto Shin"
create_user "y.ueda"         "yumi.ueda@studio.example.com"        "Ueda Yumi"
create_user "t.shimizu"      "takuya.shimizu@studio.example.com"    "Shimizu Takuya"
# International engineers
create_user "j.chen"         "jiawei.chen@studio.example.com"       "Chen Jiawei"
create_user "a.petrov"       "alexei.petrov@studio.example.com"     "Alexei Petrov"
create_user "l.nguyen"       "linh.nguyen@studio.example.com"       "Linh Nguyen"
# Service
create_user "svc-deploy"     "svc-deploy@studio.example.com"        "Deploy Service" "service"

# ===========================================================================
# Server 3: nagoya-art — art/asset server (UNICODE)
# 12 users + 1 service
# ===========================================================================
export P4PORT="localhost:${PORTS[2]}"
export P4CHARSET="utf8"

create_user "t.tanaka"       "takeshi.tanaka@studio.example.com"    "田中 剛 (Tanaka Takeshi)"
create_user "m.watanabe"     "mika.watanabe@studio.example.com"     "渡辺 美香 (Watanabe Mika)"
create_user "h.nakamura"     "hiroshi.nakamura@studio.example.com"  "中村 浩 (Nakamura Hiroshi)"
create_user "e.fujita"       "emi.fujita@studio.example.com"        "藤田 恵美 (Fujita Emi)"
create_user "k.nishida"      "koji.nishida@studio.example.com"      "西田 浩二 (Nishida Koji)"
create_user "m.aoki"         "mai.aoki@studio.example.com"          "青木 舞 (Aoki Mai)"
# Art specialists
create_user "r.takahashi"    "rina.takahashi@studio.example.com"    "高橋 里奈 (Takahashi Rina)"
create_user "k.endo"         "kazuki.endo@studio.example.com"       "遠藤 和樹 (Endo Kazuki)"
create_user "n.hayashi"      "natsuki.hayashi@studio.example.com"   "林 夏樹 (Hayashi Natsuki)"
create_user "y.inoue"        "yusuke.inoue@studio.example.com"      "井上 悠介 (Inoue Yusuke)"
# International artists
create_user "m.garcia"       "miguel.garcia@studio.example.com"     "Miguel García"
create_user "s.williams"     "sarah.williams@studio.example.com"    "Sarah Williams"
# Service
create_user "svc-render"     "svc-render@studio.example.com"        "Render Farm" "service"

# ===========================================================================
# Server 4: seoul-mobile — mobile game team (non-unicode)
# 10 users + 1 service — Korean team with some shared staff
# ===========================================================================
export P4PORT="localhost:${PORTS[3]}"
unset P4CHARSET 2>/dev/null || true

create_user "t.tanaka"       "takeshi.tanaka@studio.example.com"    "Tanaka Takeshi"
create_user "y.suzuki"       "yuki.suzuki@studio.example.com"       "Suzuki Yuki"
# Korean team
create_user "j.kim"          "jisoo.kim@studio.example.com"         "Kim Jisoo"
create_user "m.park"         "minjun.park@studio.example.com"       "Park Minjun"
create_user "s.lee"          "soyeon.lee@studio.example.com"        "Lee Soyeon"
create_user "h.choi"         "hyunwoo.choi@studio.example.com"      "Choi Hyunwoo"
create_user "y.jung"         "yuna.jung@studio.example.com"         "Jung Yuna"
# Shared international
create_user "p.kumar"        "priya.kumar@studio.example.com"       "Priya Kumar"
create_user "l.nguyen"       "linh.nguyen@studio.example.com"       "Linh Nguyen"
create_user "a.petrov"       "alexei.petrov@studio.example.com"     "Alexei Petrov"
# Service
create_user "svc-mobile-ci"  "svc-mobile-ci@studio.example.com"     "Mobile CI" "service"

# ===========================================================================
# Server 5: singapore-qa — QA/testing server (non-unicode)
# 8 users + 1 service — QA team with overlap from other servers
# ===========================================================================
export P4PORT="localhost:${PORTS[4]}"
unset P4CHARSET 2>/dev/null || true

create_user "t.tanaka"       "takeshi.tanaka@studio.example.com"    "Tanaka Takeshi"
create_user "r.ito"          "ryota.ito@studio.example.com"         "Ito Ryota"
create_user "p.kumar"        "priya.kumar@studio.example.com"       "Priya Kumar"
create_user "l.nguyen"       "linh.nguyen@studio.example.com"       "Linh Nguyen"
# QA specialists
create_user "w.tan"          "weiming.tan@studio.example.com"       "Tan Wei Ming"
create_user "a.rahman"       "aisha.rahman@studio.example.com"     "Aisha Rahman"
create_user "j.santos"       "jose.santos@studio.example.com"       "Jose Santos"
create_user "d.silva"        "deepa.silva@studio.example.com"       "Deepa Silva"
# Service
create_user "svc-autotest"   "svc-autotest@studio.example.com"      "Auto Test Runner" "service"

echo ""
echo "Applying varied access times..."

# ===========================================================================
# Stop servers, modify access times, restart
# ===========================================================================

for port in "${PORTS[@]}"; do
    p4 -p "localhost:$port" -u super admin stop 2>/dev/null || true
done
sleep 1

python3 "$(dirname "$0")/set_access_times.py" "${PORTS[@]}"

echo ""
echo "Test servers ready:"
echo "  tokyo-prod    — :${PORTS[0]} (unicode)     18 std + 2 svc"
echo "  osaka-dev     — :${PORTS[1]} (non-unicode)  14 std + 1 svc"
echo "  nagoya-art    — :${PORTS[2]} (unicode)      12 std + 1 svc"
echo "  seoul-mobile  — :${PORTS[3]} (non-unicode)  10 std + 1 svc"
echo "  singapore-qa  — :${PORTS[4]} (non-unicode)   8 std + 1 svc"
