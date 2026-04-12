"""Modify P4D user access times via checkpoint editing.

Called by setup_test_servers.sh after creating users and stopping servers.
Usage: python3 set_access_times.py PORT1 PORT2 PORT3
"""

import glob
import re
import subprocess
import sys
import time

DAY = 86400
NOW = int(time.time())

# How many days ago each user last accessed each server.
# Users not listed keep today's access time.
ACCESS_AGES = {
    1: {  # tokyo-main
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
        "y.honda": 60 * DAY,
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
        "a.mori": 2 * DAY,
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
    },
}

PATTERN = re.compile(r"(@pv@ 8 @db.user@ @)([^@]*)(@ @.*?@ @@ )(\d+) (\d+)( @)")


def modify_server(idx: int, port: int) -> None:
    root = f"/tmp/p4d-test-{idx}"
    checkpoint = f"{root}/checkpoint_edit"
    names = ["tokyo-main", "osaka-dev", "nagoya-art"]

    result = subprocess.run(
        ["p4d", "-r", root, "-jd", checkpoint],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"  ERROR: checkpoint dump failed for {names[idx - 1]}: {result.stderr.strip()}")
        # Start the server back up anyway
        subprocess.run(
            ["p4d", "-p", str(port), "-r", root, "-d"],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return

    import os
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

    # Remove db files and restore from modified checkpoint
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
    print(f"  {names[idx - 1]}: {count} users modified, restarted on port {port}")


def main() -> None:
    ports = [int(p) for p in sys.argv[1:]]
    for idx, port in enumerate(ports, start=1):
        modify_server(idx, port)


if __name__ == "__main__":
    main()
