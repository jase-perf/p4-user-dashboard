"""Configuration file management for P4 User Dashboard."""

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ServerConfig:
    name: str
    port: str
    user: str | None = None


@dataclass
class DashboardConfig:
    host: str = "127.0.0.1"
    port: int = 8080
    licensed_unique_users: int | None = None
    servers: list[ServerConfig] = field(default_factory=list)
    _path: str | None = field(default=None, repr=False)

    def to_dict(self) -> dict:
        return {
            "host": self.host,
            "port": self.port,
            "licensedUniqueUsers": self.licensed_unique_users,
            "servers": [
                {"name": s.name, "port": s.port, **({"user": s.user} if s.user else {})}
                for s in self.servers
            ],
        }


def load_config(path: str) -> DashboardConfig:
    """Load configuration from a JSON file."""
    config_path = Path(path)
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    data = json.loads(config_path.read_text())
    servers = [
        ServerConfig(
            name=s["name"],
            port=s["port"],
            user=s.get("user"),
        )
        for s in data.get("servers", [])
    ]
    return DashboardConfig(
        host=data.get("host", "127.0.0.1"),
        port=data.get("port", 8080),
        licensed_unique_users=data.get("licensedUniqueUsers"),
        servers=servers,
        _path=path,
    )


def save_config(config: DashboardConfig, path: str) -> None:
    """Save configuration to a JSON file."""
    Path(path).write_text(json.dumps(config.to_dict(), indent=2) + "\n")
