import subprocess
import time
import os
import sys

import pytest

# Add project root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session", autouse=True)
def test_servers():
    """Start demo P4D servers before tests, stop after."""
    setup_script = os.path.join(os.path.dirname(__file__), "..", "demo", "setup.sh")
    try:
        subprocess.run(["bash", setup_script], check=True, capture_output=True, text=True)
        time.sleep(1)
    except (subprocess.CalledProcessError, FileNotFoundError):
        yield None
        return

    yield {
        "tokyo-prod": {"port": "localhost:1701", "user": "super", "name": "tokyo-prod"},
        "osaka-dev": {"port": "localhost:1702", "user": "super", "name": "osaka-dev"},
        "nagoya-art": {"port": "localhost:1703", "user": "super", "name": "nagoya-art"},
        "seoul-mobile": {"port": "localhost:1704", "user": "super", "name": "seoul-mobile"},
        "singapore-qa": {"port": "localhost:1705", "user": "super", "name": "singapore-qa"},
    }
    try:
        subprocess.run(["bash", setup_script, "--teardown"], check=True, capture_output=True, text=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass


@pytest.fixture
def test_config(test_servers, tmp_path):
    """Create a config.json pointing at test servers."""
    import json

    config = {
        "port": 8080,
        "licensedUniqueUsers": 50,
        "servers": [
            {"name": name, "port": info["port"], "user": info["user"]}
            for name, info in test_servers.items()
        ],
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config, indent=2))
    return str(config_path)
