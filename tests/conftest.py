import subprocess
import time
import os
import sys

import pytest

# Add project root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session", autouse=True)
def test_servers():
    """Start test P4D servers before tests, stop after.

    Servers are best-effort: if setup fails (e.g. p4d not installed),
    tests that don't need live servers can still run.  Tests requiring
    servers should explicitly depend on this fixture and skip when it
    returns None.
    """
    script = os.path.join(os.path.dirname(__file__), "..", "scripts", "setup_test_servers.sh")
    try:
        subprocess.run(["bash", script], check=True, capture_output=True, text=True)
        time.sleep(1)  # Give servers a moment to stabilize
    except (subprocess.CalledProcessError, FileNotFoundError):
        yield None
        return

    yield {
        "tokyo-main": {"port": "localhost:1701", "user": "super", "name": "tokyo-main"},
        "osaka-dev": {"port": "localhost:1702", "user": "super", "name": "osaka-dev"},
        "nagoya-art": {"port": "localhost:1703", "user": "super", "name": "nagoya-art"},
    }
    try:
        subprocess.run(["bash", script, "--teardown"], check=True, capture_output=True, text=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass


@pytest.fixture
def test_config(test_servers, tmp_path):
    """Create a config.json pointing at test servers."""
    import json

    config = {
        "port": 8080,
        "licensedUniqueUsers": 10,
        "servers": [
            {"name": name, "port": info["port"], "user": info["user"]}
            for name, info in test_servers.items()
        ],
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config, indent=2))
    return str(config_path)
