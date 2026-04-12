"""Modify P4D user access times via checkpoint editing.

Called by setup_test_servers.sh after creating users and stopping servers.
Usage: python3 set_access_times.py PORT1 PORT2 PORT3 [PORT4 PORT5 ...]
"""

import glob
import os
import re
import subprocess
import sys
import time

DAY = 86400
NOW = int(time.time())

# How many days ago each user last accessed each server.
# Users not listed keep today's access time.
ACCESS_AGES = {
    1: {  # tokyo-prod
        "t.tanaka": 1 * DAY,
        "t.tanaka-admin": 200 * DAY,
        "y.suzuki": 3 * DAY,
        "k.yamamoto": 14 * DAY,
        "m.watanabe": 2 * DAY,
        "h.nakamura": 45 * DAY,
        "a.sato": 400 * DAY,
        "r.ito": 7 * DAY,
        "s.kimura": 1 * DAY,
        "d.ogawa": 120 * DAY,
        "n.matsuda": 5 * DAY,
        "j.morita": 250 * DAY,
        "e.fujita": 10 * DAY,
        "t.kato": 180 * DAY,
        "j.chen": 3 * DAY,
        "p.kumar": 20 * DAY,
        "m.garcia": 90 * DAY,
        "s.williams": 15 * DAY,
    },
    2: {  # osaka-dev
        "t.tanaka": 2 * DAY,
        "y.suzuki": 1 * DAY,
        "k.yamamoto": 90 * DAY,
        "m.watanabe": 5 * DAY,
        "r.ito": 1 * DAY,
        "s.kimura": 30 * DAY,
        "k.nishida": 3 * DAY,
        "m.aoki": 1 * DAY,
        "s.hashimoto": 150 * DAY,
        "y.ueda": 60 * DAY,
        "t.shimizu": 10 * DAY,
        "j.chen": 1 * DAY,
        "a.petrov": 5 * DAY,
        "l.nguyen": 2 * DAY,
    },
    3: {  # nagoya-art
        "t.tanaka": 5 * DAY,
        "m.watanabe": 1 * DAY,
        "h.nakamura": 3 * DAY,
        "e.fujita": 2 * DAY,
        "k.nishida": 200 * DAY,
        "m.aoki": 100 * DAY,
        "r.takahashi": 7 * DAY,
        "k.endo": 1 * DAY,
        "n.hayashi": 14 * DAY,
        "y.inoue": 365 * DAY,
        "m.garcia": 10 * DAY,
        "s.williams": 3 * DAY,
    },
    4: {  # seoul-mobile
        "t.tanaka": 30 * DAY,
        "y.suzuki": 45 * DAY,
        "j.kim": 1 * DAY,
        "m.park": 2 * DAY,
        "s.lee": 1 * DAY,
        "h.choi": 5 * DAY,
        "y.jung": 3 * DAY,
        "p.kumar": 7 * DAY,
        "l.nguyen": 1 * DAY,
        "a.petrov": 60 * DAY,
    },
    5: {  # singapore-qa
        "t.tanaka": 14 * DAY,
        "r.ito": 3 * DAY,
        "p.kumar": 1 * DAY,
        "l.nguyen": 2 * DAY,
        "w.tan": 1 * DAY,
        "a.rahman": 5 * DAY,
        "j.santos": 10 * DAY,
        "d.silva": 30 * DAY,
    },
}

PATTERN = re.compile(r"(@pv@ 8 @db.user@ @)([^@]*)(@ @.*?@ @@ )(\d+) (\d+)( @)")
NAMES = ["tokyo-prod", "osaka-dev", "nagoya-art", "seoul-mobile", "singapore-qa"]


def modify_server(idx: int, port: int) -> None:
    root = f"/tmp/p4d-test-{idx}"
    checkpoint = f"{root}/checkpoint_edit"
    name = NAMES[idx - 1] if idx <= len(NAMES) else f"server-{idx}"

    result = subprocess.run(
        ["p4d", "-r", root, "-jd", checkpoint],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"  ERROR: checkpoint dump failed for {name}: {result.stderr.strip()}")
        subprocess.run(
            ["p4d", "-p", str(port), "-r", root, "-d"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return

    os.chmod(checkpoint, 0o644)

    with open(checkpoint, "r") as f:
        lines = f.readlines()

    ages = ACCESS_AGES.get(idx, {})
    modified = []
    count = 0
    for line in lines:
        if line.startswith("@pv@ 8 @db.user@"):
            m = PATTERN.match(line)
            if m:
                username = m.group(2)
                if username in ages:
                    access_time = NOW - ages[username]
                    update_ts = m.group(4)
                    remainder = line[m.end():]
                    line = f"{m.group(1)}{m.group(2)}{m.group(3)}{update_ts} {access_time}{m.group(6)}{remainder}"
                    count += 1
        modified.append(line)

    with open(checkpoint, "w") as f:
        f.writelines(modified)

    for dbfile in glob.glob(f"{root}/db.*"):
        os.remove(dbfile)

    subprocess.run(
        ["p4d", "-r", root, "-jr", checkpoint],
        capture_output=True, text=True,
    )
    subprocess.run(
        ["p4d", "-p", str(port), "-r", root, "-d"],
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    print(f"  {name}: {count} users modified, restarted on port {port}")


def main() -> None:
    ports = [int(p) for p in sys.argv[1:]]
    for idx, port in enumerate(ports, start=1):
        modify_server(idx, port)


if __name__ == "__main__":
    main()
