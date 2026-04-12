"""Generate demo P4D servers with realistic user data.

Creates servers, populates users, sets varied access times, and saves
checkpoints. Run this once to rebuild the demo/checkpoints/ directory.

Usage: python demo/generate_demo.py
Requires: p4d in PATH or in demo/bin/
"""

import glob
import os
import re
import shutil
import subprocess
import time

import functools
print = functools.partial(print, flush=True)

DAY = 86400
NOW = int(time.time())
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CHECKPOINTS_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")

# ==========================================================================
# Server definitions
# ==========================================================================

SERVERS = [
    {"name": "tokyo-prod",       "port": 1701, "unicode": True},
    {"name": "osaka-dev",        "port": 1702, "unicode": False},
    {"name": "nagoya-art",       "port": 1703, "unicode": True},
    {"name": "seoul-mobile",     "port": 1704, "unicode": False},
    {"name": "singapore-qa",     "port": 1705, "unicode": False},
    {"name": "tokyo-platform",   "port": 1706, "unicode": True},
    {"name": "fukuoka-online",   "port": 1707, "unicode": False},
    {"name": "shanghai-loc",     "port": 1708, "unicode": True},
    {"name": "bangalore-tools",  "port": 1709, "unicode": False},
    {"name": "la-mocap",         "port": 1710, "unicode": False},
]

# ==========================================================================
# User pool — each user has a username, email, full name (unicode),
# full name (ascii fallback for non-unicode servers), and which servers
# they appear on with how many days ago they last accessed.
# ==========================================================================

def user(username, email, name_uni, name_ascii, server_access):
    """Define a user. server_access is a dict of server_name -> days_ago."""
    return {
        "username": username,
        "email": email,
        "name_uni": name_uni,
        "name_ascii": name_ascii,
        "servers": server_access,
    }

USERS = [
    # === Japanese core team (appear on many servers) ===
    user("t.tanaka",       "takeshi.tanaka@studio.example.com",
         "田中 剛 (Tanaka Takeshi)", "Tanaka Takeshi",
         {"tokyo-prod": 1, "osaka-dev": 2, "nagoya-art": 5, "seoul-mobile": 30,
          "singapore-qa": 14, "tokyo-platform": 3, "fukuoka-online": 10}),
    user("t.tanaka-admin", "takeshi.tanaka@studio.example.com",
         "田中 剛 - Admin (Tanaka Takeshi)", "Tanaka Takeshi - Admin",
         {"tokyo-prod": 200}),  # abandoned admin account
    user("y.suzuki",       "yuki.suzuki@studio.example.com",
         "鈴木 有紀 (Suzuki Yuki)", "Suzuki Yuki",
         {"tokyo-prod": 3, "osaka-dev": 1, "seoul-mobile": 45, "tokyo-platform": 2}),
    user("k.yamamoto",     "kenji.yamamoto@studio.example.com",
         "山本 健二 (Yamamoto Kenji)", "Yamamoto Kenji",
         {"tokyo-prod": 14, "osaka-dev": 90, "tokyo-platform": 7}),
    user("m.watanabe",     "mika.watanabe@studio.example.com",
         "渡辺 美香 (Watanabe Mika)", "Watanabe Mika",
         {"tokyo-prod": 2, "osaka-dev": 5, "nagoya-art": 1, "tokyo-platform": 4}),
    user("h.nakamura",     "hiroshi.nakamura@studio.example.com",
         "中村 浩 (Nakamura Hiroshi)", "Nakamura Hiroshi",
         {"tokyo-prod": 45, "nagoya-art": 3, "la-mocap": 7}),
    user("a.sato",         "akiko.sato@studio.example.com",
         "佐藤 明子 (Sato Akiko)", "Sato Akiko",
         {"tokyo-prod": 400}),  # long inactive — prime deletion candidate
    user("r.ito",          "ryota.ito@studio.example.com",
         "伊藤 涼太 (Ito Ryota)", "Ito Ryota",
         {"tokyo-prod": 7, "osaka-dev": 1, "singapore-qa": 3, "bangalore-tools": 5}),
    user("s.kimura",       "sachiko.kimura@studio.example.com",
         "木村 幸子 (Kimura Sachiko)", "Kimura Sachiko",
         {"tokyo-prod": 1, "osaka-dev": 30, "tokyo-platform": 1}),
    user("d.ogawa",        "daichi.ogawa@studio.example.com",
         "小川 大地 (Ogawa Daichi)", "Ogawa Daichi",
         {"tokyo-prod": 120, "osaka-dev": 150}),  # inactive on both — transferred?
    user("n.matsuda",      "naomi.matsuda@studio.example.com",
         "松田 直美 (Matsuda Naomi)", "Matsuda Naomi",
         {"tokyo-prod": 5, "osaka-dev": 3, "nagoya-art": 20}),
    user("j.morita",       "jun.morita@studio.example.com",
         "森田 潤 (Morita Jun)", "Morita Jun",
         {"tokyo-prod": 250}),  # left the company?
    user("e.fujita",       "emi.fujita@studio.example.com",
         "藤田 恵美 (Fujita Emi)", "Fujita Emi",
         {"tokyo-prod": 10, "nagoya-art": 2, "la-mocap": 15}),
    user("t.kato",         "taro.kato@studio.example.com",
         "加藤 太郎 (Kato Taro)", "Kato Taro",
         {"tokyo-prod": 180, "osaka-dev": 200}),  # inactive everywhere
    user("y.honda",        "yuko.honda@studio.example.com",
         "本田 祐子 (Honda Yuko)", "Honda Yuko",
         {"tokyo-prod": 60, "nagoya-art": 90}),

    # === Dev/engineering specialists ===
    user("k.nishida",      "koji.nishida@studio.example.com",
         "西田 浩二 (Nishida Koji)", "Nishida Koji",
         {"osaka-dev": 3, "nagoya-art": 200, "tokyo-platform": 5, "bangalore-tools": 10}),
    user("m.aoki",         "mai.aoki@studio.example.com",
         "青木 舞 (Aoki Mai)", "Aoki Mai",
         {"osaka-dev": 1, "nagoya-art": 100, "tokyo-platform": 2}),
    user("s.hashimoto",    "shin.hashimoto@studio.example.com",
         "橋本 慎 (Hashimoto Shin)", "Hashimoto Shin",
         {"osaka-dev": 150, "tokyo-platform": 180}),  # inactive on both
    user("y.ueda",         "yumi.ueda@studio.example.com",
         "上田 由美 (Ueda Yumi)", "Ueda Yumi",
         {"osaka-dev": 60, "bangalore-tools": 45}),
    user("t.shimizu",      "takuya.shimizu@studio.example.com",
         "清水 拓也 (Shimizu Takuya)", "Shimizu Takuya",
         {"osaka-dev": 10, "tokyo-platform": 8, "fukuoka-online": 3}),
    user("a.mori",         "ayaka.mori@studio.example.com",
         "森 彩花 (Mori Ayaka)", "Mori Ayaka",
         {"osaka-dev": 2, "nagoya-art": 5}),
    user("y.ishikawa",     "yuta.ishikawa@studio.example.com",
         "石川 雄太 (Ishikawa Yuta)", "Ishikawa Yuta",
         {"osaka-dev": 1, "tokyo-platform": 1, "fukuoka-online": 2}),
    user("r.saito",        "rika.saito@studio.example.com",
         "齊藤 里佳 (Saito Rika)", "Saito Rika",
         {"osaka-dev": 4, "tokyo-platform": 6}),

    # === Art team ===
    user("r.takahashi",    "rina.takahashi@studio.example.com",
         "高橋 里奈 (Takahashi Rina)", "Takahashi Rina",
         {"nagoya-art": 7, "la-mocap": 3}),
    user("k.endo",         "kazuki.endo@studio.example.com",
         "遠藤 和樹 (Endo Kazuki)", "Endo Kazuki",
         {"nagoya-art": 1, "la-mocap": 10}),
    user("n.hayashi",      "natsuki.hayashi@studio.example.com",
         "林 夏樹 (Hayashi Natsuki)", "Hayashi Natsuki",
         {"nagoya-art": 14}),
    user("y.inoue",        "yusuke.inoue@studio.example.com",
         "井上 悠介 (Inoue Yusuke)", "Inoue Yusuke",
         {"nagoya-art": 365}),  # a whole year inactive
    user("c.miyamoto",     "chihiro.miyamoto@studio.example.com",
         "宮本 千尋 (Miyamoto Chihiro)", "Miyamoto Chihiro",
         {"nagoya-art": 3, "la-mocap": 1}),
    user("t.okazaki",      "tomoko.okazaki@studio.example.com",
         "岡崎 智子 (Okazaki Tomoko)", "Okazaki Tomoko",
         {"nagoya-art": 8, "la-mocap": 20}),

    # === International engineers and contractors ===
    user("j.chen",         "jiawei.chen@studio.example.com",
         "陈家伟 (Chen Jiawei)", "Chen Jiawei",
         {"tokyo-prod": 3, "osaka-dev": 1, "shanghai-loc": 2, "tokyo-platform": 5}),
    user("p.kumar",        "priya.kumar@studio.example.com",
         "Priya Kumar", "Priya Kumar",
         {"tokyo-prod": 20, "seoul-mobile": 7, "singapore-qa": 1, "bangalore-tools": 2}),
    user("m.garcia",       "miguel.garcia@studio.example.com",
         "Miguel García", "Miguel Garcia",
         {"tokyo-prod": 90, "nagoya-art": 10, "la-mocap": 5}),
    user("s.williams",     "sarah.williams@studio.example.com",
         "Sarah Williams", "Sarah Williams",
         {"tokyo-prod": 15, "nagoya-art": 3, "la-mocap": 1}),
    user("a.petrov",       "alexei.petrov@studio.example.com",
         "Alexei Petrov", "Alexei Petrov",
         {"osaka-dev": 5, "seoul-mobile": 60, "tokyo-platform": 12}),
    user("l.nguyen",       "linh.nguyen@studio.example.com",
         "Linh Nguyen", "Linh Nguyen",
         {"osaka-dev": 2, "seoul-mobile": 1, "singapore-qa": 2, "fukuoka-online": 5}),

    # === Korean mobile team ===
    user("j.kim",          "jisoo.kim@studio.example.com",
         "김지수 (Kim Jisoo)", "Kim Jisoo",
         {"seoul-mobile": 1, "singapore-qa": 10}),
    user("m.park",         "minjun.park@studio.example.com",
         "박민준 (Park Minjun)", "Park Minjun",
         {"seoul-mobile": 2, "fukuoka-online": 4}),
    user("s.lee",          "soyeon.lee@studio.example.com",
         "이소연 (Lee Soyeon)", "Lee Soyeon",
         {"seoul-mobile": 1}),
    user("h.choi",         "hyunwoo.choi@studio.example.com",
         "최현우 (Choi Hyunwoo)", "Choi Hyunwoo",
         {"seoul-mobile": 5, "fukuoka-online": 8}),
    user("y.jung",         "yuna.jung@studio.example.com",
         "정유나 (Jung Yuna)", "Jung Yuna",
         {"seoul-mobile": 3}),
    user("d.han",          "dohyun.han@studio.example.com",
         "한도현 (Han Dohyun)", "Han Dohyun",
         {"seoul-mobile": 7, "singapore-qa": 20}),
    user("e.kwon",         "eunji.kwon@studio.example.com",
         "권은지 (Kwon Eunji)", "Kwon Eunji",
         {"seoul-mobile": 2, "fukuoka-online": 15}),

    # === Singapore/SEA QA team ===
    user("w.tan",          "weiming.tan@studio.example.com",
         "Tan Wei Ming", "Tan Wei Ming",
         {"singapore-qa": 1, "fukuoka-online": 3}),
    user("a.rahman",       "aisha.rahman@studio.example.com",
         "Aisha Rahman", "Aisha Rahman",
         {"singapore-qa": 5}),
    user("j.santos",       "jose.santos@studio.example.com",
         "Jose Santos", "Jose Santos",
         {"singapore-qa": 10}),
    user("d.silva",        "deepa.silva@studio.example.com",
         "Deepa Silva", "Deepa Silva",
         {"singapore-qa": 30}),
    user("r.lim",          "rachel.lim@studio.example.com",
         "Rachel Lim", "Rachel Lim",
         {"singapore-qa": 2, "seoul-mobile": 14}),
    user("k.wong",         "kevin.wong@studio.example.com",
         "Kevin Wong", "Kevin Wong",
         {"singapore-qa": 8, "fukuoka-online": 12}),

    # === Platform/engine team ===
    user("m.taniguchi",    "masato.taniguchi@studio.example.com",
         "谷口 正人 (Taniguchi Masato)", "Taniguchi Masato",
         {"tokyo-platform": 1, "osaka-dev": 3}),
    user("k.hasegawa",     "kaori.hasegawa@studio.example.com",
         "長谷川 香織 (Hasegawa Kaori)", "Hasegawa Kaori",
         {"tokyo-platform": 2}),
    user("t.nomura",       "takuma.nomura@studio.example.com",
         "野村 拓真 (Nomura Takuma)", "Nomura Takuma",
         {"tokyo-platform": 4, "osaka-dev": 7}),
    user("s.kuroda",       "satomi.kuroda@studio.example.com",
         "黒田 里美 (Kuroda Satomi)", "Kuroda Satomi",
         {"tokyo-platform": 1, "fukuoka-online": 1}),

    # === Fukuoka online services ===
    user("h.sugiyama",     "hideo.sugiyama@studio.example.com",
         "杉山 英雄 (Sugiyama Hideo)", "Sugiyama Hideo",
         {"fukuoka-online": 1}),
    user("a.kawaguchi",    "ai.kawaguchi@studio.example.com",
         "川口 愛 (Kawaguchi Ai)", "Kawaguchi Ai",
         {"fukuoka-online": 2, "osaka-dev": 14}),
    user("y.noda",         "yoshiki.noda@studio.example.com",
         "野田 芳樹 (Noda Yoshiki)", "Noda Yoshiki",
         {"fukuoka-online": 90}),  # inactive

    # === Shanghai localization ===
    user("l.wang",         "li.wang@studio.example.com",
         "王力 (Wang Li)", "Wang Li",
         {"shanghai-loc": 1, "nagoya-art": 30}),
    user("x.zhang",        "xiaoming.zhang@studio.example.com",
         "张晓明 (Zhang Xiaoming)", "Zhang Xiaoming",
         {"shanghai-loc": 3}),
    user("y.liu",          "yan.liu@studio.example.com",
         "刘燕 (Liu Yan)", "Liu Yan",
         {"shanghai-loc": 2, "nagoya-art": 15}),
    user("h.wu",           "hong.wu@studio.example.com",
         "吴红 (Wu Hong)", "Wu Hong",
         {"shanghai-loc": 7, "tokyo-prod": 40}),
    user("m.huang",        "mei.huang@studio.example.com",
         "黄梅 (Huang Mei)", "Huang Mei",
         {"shanghai-loc": 5}),
    user("j.zhou",         "jing.zhou@studio.example.com",
         "周静 (Zhou Jing)", "Zhou Jing",
         {"shanghai-loc": 120}),  # inactive

    # === Bangalore tools/pipeline ===
    user("r.sharma",       "rahul.sharma@studio.example.com",
         "Rahul Sharma", "Rahul Sharma",
         {"bangalore-tools": 1, "osaka-dev": 8}),
    user("a.patel",        "anita.patel@studio.example.com",
         "Anita Patel", "Anita Patel",
         {"bangalore-tools": 3}),
    user("v.krishnan",     "vijay.krishnan@studio.example.com",
         "Vijay Krishnan", "Vijay Krishnan",
         {"bangalore-tools": 2, "singapore-qa": 15, "tokyo-platform": 20}),
    user("s.gupta",        "sneha.gupta@studio.example.com",
         "Sneha Gupta", "Sneha Gupta",
         {"bangalore-tools": 7}),
    user("d.nair",         "deepak.nair@studio.example.com",
         "Deepak Nair", "Deepak Nair",
         {"bangalore-tools": 300}),  # very long inactive
    user("m.reddy",        "meera.reddy@studio.example.com",
         "Meera Reddy", "Meera Reddy",
         {"bangalore-tools": 4, "osaka-dev": 25}),

    # === LA motion capture studio ===
    user("c.johnson",      "chris.johnson@studio.example.com",
         "Chris Johnson", "Chris Johnson",
         {"la-mocap": 2, "nagoya-art": 40}),
    user("a.martinez",     "ana.martinez@studio.example.com",
         "Ana Martinez", "Ana Martinez",
         {"la-mocap": 1}),
    user("j.taylor",       "james.taylor@studio.example.com",
         "James Taylor", "James Taylor",
         {"la-mocap": 5, "nagoya-art": 60}),
    user("k.jackson",      "kelly.jackson@studio.example.com",
         "Kelly Jackson", "Kelly Jackson",
         {"la-mocap": 14}),
    user("m.davis",        "marcus.davis@studio.example.com",
         "Marcus Davis", "Marcus Davis",
         {"la-mocap": 180}),  # inactive — contract ended?

    # === Service accounts ===
    user("svc-build",      "svc-build@studio.example.com",
         "Build Service", "Build Service",
         {"tokyo-prod": 0, "osaka-dev": 0, "tokyo-platform": 0}),
    user("svc-ci",         "svc-ci@studio.example.com",
         "CI Pipeline", "CI Pipeline",
         {"tokyo-prod": 0, "osaka-dev": 0, "tokyo-platform": 0, "fukuoka-online": 0}),
    user("svc-deploy",     "svc-deploy@studio.example.com",
         "Deploy Service", "Deploy Service",
         {"osaka-dev": 0, "singapore-qa": 0, "fukuoka-online": 0}),
    user("svc-render",     "svc-render@studio.example.com",
         "Render Farm", "Render Farm",
         {"nagoya-art": 0, "la-mocap": 0}),
    user("svc-mobile-ci",  "svc-mobile-ci@studio.example.com",
         "Mobile CI", "Mobile CI",
         {"seoul-mobile": 0}),
    user("svc-autotest",   "svc-autotest@studio.example.com",
         "Auto Test Runner", "Auto Test Runner",
         {"singapore-qa": 0}),
    user("svc-loc-sync",   "svc-loc-sync@studio.example.com",
         "Localization Sync", "Localization Sync",
         {"shanghai-loc": 0, "nagoya-art": 0}),
    user("svc-tools-ci",   "svc-tools-ci@studio.example.com",
         "Tools CI", "Tools CI",
         {"bangalore-tools": 0}),
]


# ==========================================================================
# Server setup and checkpoint generation
# ==========================================================================

def find_p4d():
    """Find p4d binary."""
    bin_dir = os.path.join(os.path.dirname(__file__), "bin")
    for name in ["p4d", "p4d.exe"]:
        path = os.path.join(bin_dir, name)
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return shutil.which("p4d")


def _clean_env(**overrides):
    """Build a clean environment with P4 variables set explicitly.

    Strips any inherited P4CHARSET to avoid unicode/non-unicode conflicts.
    """
    env = {k: v for k, v in os.environ.items() if k != "P4CHARSET"}
    env.update(overrides)
    return env


def run(cmd, **kwargs):
    """Run a command, return stdout."""
    if "input" not in kwargs and "stdin" not in kwargs:
        kwargs["stdin"] = subprocess.DEVNULL
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, **kwargs)
    if result.returncode != 0 and result.stderr:
        if "warning" not in result.stderr.lower():
            print(f"  WARN: {' '.join(cmd)}: {result.stderr.strip()}", flush=True)
    return result


def p4_env(port, charset=None):
    """Build a clean P4 env dict for the given server."""
    overrides = {"P4PORT": f"localhost:{port}", "P4USER": "super"}
    if charset:
        overrides["P4CHARSET"] = charset
    return _clean_env(**overrides)


def create_user(port, username, email, fullname, usertype="standard", charset=None):
    """Create a user on a running P4 server."""
    spec = f"User: {username}\nEmail: {email}\nFullName: {fullname}\nType: {usertype}\n"
    run(["p4", "user", "-f", "-i"], input=spec, env=p4_env(port, charset))


def main():
    p4d = find_p4d()
    if not p4d:
        print("ERROR: p4d not found. Install it or place it in demo/bin/")
        return

    print(f"Using p4d: {p4d}", flush=True)

    # Clean up
    for srv in SERVERS:
        run(["p4", "-p", f"localhost:{srv['port']}", "admin", "stop"],
            env=_clean_env(P4USER="super"))
    subprocess.run(["pkill", "-9", "-f", "p4d.*-p 170"], capture_output=True)
    time.sleep(0.5)

    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)

    # Create and start servers
    print("\nCreating servers...")
    for srv in SERVERS:
        root = os.path.join(DATA_DIR, srv["name"])
        os.makedirs(root, exist_ok=True)

        if srv["unicode"]:
            run([p4d, "-r", root, "-xi"])

        subprocess.run(
            [p4d, "-p", str(srv["port"]), "-r", root, "-d"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        time.sleep(0.3)  # let it start up

        charset = "utf8" if srv["unicode"] else None

        create_user(srv["port"], "super", "admin@studio.example.com", "Admin User",
                    charset=charset)
        prot_spec = "Protections:\n\tsuper user super * //...\n"
        run(["p4", "protect", "-i"], input=prot_spec,
            env=p4_env(srv["port"], charset))

        print(f"  {srv['name']:20s} :{srv['port']}  {'(unicode)' if srv['unicode'] else ''}")

    # Create users on their assigned servers
    print("\nPopulating users...")
    server_unicode = {s["name"]: s["unicode"] for s in SERVERS}
    server_ports = {s["name"]: s["port"] for s in SERVERS}

    for u in USERS:
        is_service = u["username"].startswith("svc-")
        usertype = "service" if is_service else "standard"

        for server_name in u["servers"]:
            port = server_ports[server_name]
            is_uni = server_unicode[server_name]
            charset = "utf8" if is_uni else None
            fullname = u["name_uni"] if is_uni else u["name_ascii"]

            create_user(port, u["username"], u["email"], fullname,
                        usertype=usertype, charset=charset)

    # Count users per server
    for srv in SERVERS:
        charset = "utf8" if srv["unicode"] else None
        result = run(["p4", "users", "-a"], env=p4_env(srv["port"], charset))
        count = len(result.stdout.strip().split("\n")) if result.stdout.strip() else 0
        print(f"  {srv['name']:20s} {count} users")

    # Stop all servers for checkpoint editing
    print("\nSetting access times...")
    for srv in SERVERS:
        run(["p4", "-p", f"localhost:{srv['port']}", "admin", "stop"],
            env=_clean_env(P4USER="super"))
    time.sleep(1)

    # Build access time map per server index
    pattern = re.compile(r"(@pv@ 8 @db.user@ @)([^@]*)(@ @.*?@ @@ )(\d+) (\d+)( @)")

    for i, srv in enumerate(SERVERS):
        root = os.path.join(DATA_DIR, srv["name"])
        ckp_path = os.path.join(root, "checkpoint_edit")

        result = run([p4d, "-r", root, "-jd", ckp_path])
        if not os.path.exists(ckp_path):
            print(f"  ERROR: checkpoint dump failed for {srv['name']}")
            continue
        os.chmod(ckp_path, 0o644)

        # Build access map for this server
        access_map = {}
        for u in USERS:
            if srv["name"] in u["servers"]:
                days = u["servers"][srv["name"]]
                access_map[u["username"]] = NOW - (days * DAY)

        with open(ckp_path, "r") as f:
            lines = f.readlines()

        modified = []
        count = 0
        for line in lines:
            if line.startswith("@pv@ 8 @db.user@"):
                m = pattern.match(line)
                if m:
                    username = m.group(2)
                    if username in access_map:
                        update_ts = m.group(4)
                        remainder = line[m.end():]
                        line = f"{m.group(1)}{m.group(2)}{m.group(3)}{update_ts} {access_map[username]}{m.group(6)}{remainder}"
                        count += 1
            modified.append(line)

        with open(ckp_path, "w") as f:
            f.writelines(modified)

        # Rebuild db from modified checkpoint
        for dbfile in glob.glob(os.path.join(root, "db.*")):
            os.remove(dbfile)
        run([p4d, "-r", root, "-jr", ckp_path])

        print(f"  {srv['name']:20s} {count} users modified")

    # Save checkpoints
    print("\nSaving checkpoints...")
    os.makedirs(CHECKPOINTS_DIR, exist_ok=True)
    for srv in SERVERS:
        root = os.path.join(DATA_DIR, srv["name"])
        ckp_dest = os.path.join(CHECKPOINTS_DIR, f"{srv['name']}.ckp")
        ckp_src = os.path.join(root, "checkpoint_edit")
        if os.path.exists(ckp_src):
            shutil.copy2(ckp_src, ckp_dest)
            size_kb = os.path.getsize(ckp_dest) // 1024
            print(f"  {srv['name']:20s} {size_kb}KB")

    # Clean up data dir
    shutil.rmtree(DATA_DIR)

    # Print summary
    total_accounts = sum(len(u["servers"]) for u in USERS)
    unique_emails = len(set(u["email"] for u in USERS))
    service_users = sum(1 for u in USERS if u["username"].startswith("svc-"))
    print(f"\nDone! {len(USERS)} user accounts, {unique_emails} unique emails, "
          f"{total_accounts} total accounts across {len(SERVERS)} servers")
    print(f"({service_users} service accounts, {len(USERS) - service_users} standard)")
    print(f"\nCheckpoints saved to {CHECKPOINTS_DIR}/")
    print("Run 'bash demo/setup.sh' to start the demo servers.")


if __name__ == "__main__":
    main()
