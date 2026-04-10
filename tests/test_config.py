import json
import pytest
from pathlib import Path


def test_load_config_from_file(tmp_path):
    from config import load_config

    config_data = {
        "port": 9090,
        "licensedUniqueUsers": 100,
        "servers": [
            {"name": "test-server", "port": "localhost:1666", "user": "admin"}
        ],
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config_data))

    config = load_config(str(config_path))
    assert config.port == 9090
    assert config.licensed_unique_users == 100
    assert len(config.servers) == 1
    assert config.servers[0].name == "test-server"
    assert config.servers[0].port == "localhost:1666"
    assert config.servers[0].user == "admin"


def test_load_config_defaults(tmp_path):
    from config import load_config

    config_data = {"servers": [{"name": "s1", "port": "localhost:1666"}]}
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config_data))

    config = load_config(str(config_path))
    assert config.port == 8080
    assert config.licensed_unique_users is None
    assert config.servers[0].user is None


def test_load_config_missing_file():
    from config import load_config

    with pytest.raises(FileNotFoundError):
        load_config("/nonexistent/config.json")


def test_save_config(tmp_path):
    from config import load_config, save_config, ServerConfig

    config_data = {
        "port": 9090,
        "licensedUniqueUsers": 50,
        "servers": [{"name": "s1", "port": "localhost:1666"}],
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config_data))

    config = load_config(str(config_path))
    config.servers.append(ServerConfig(name="s2", port="localhost:1667", user="admin2"))
    save_config(config, str(config_path))

    reloaded = load_config(str(config_path))
    assert len(reloaded.servers) == 2
    assert reloaded.servers[1].name == "s2"


def test_config_to_dict(tmp_path):
    from config import load_config

    config_data = {
        "port": 8080,
        "licensedUniqueUsers": 100,
        "servers": [{"name": "s1", "port": "localhost:1666", "user": "admin"}],
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config_data))

    config = load_config(str(config_path))
    d = config.to_dict()
    assert d["port"] == 8080
    assert d["licensedUniqueUsers"] == 100
    assert d["servers"][0]["name"] == "s1"
