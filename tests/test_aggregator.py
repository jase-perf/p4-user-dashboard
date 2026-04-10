import time
import pytest
from aggregator import aggregate_users


def make_user(username, email, full_name, access, update, user_type="standard"):
    return {
        "User": username,
        "Email": email,
        "FullName": full_name,
        "Access": str(access),
        "Update": str(update),
        "Type": user_type,
    }


NOW = int(time.time())
HOUR_AGO = NOW - 3600
DAY_AGO = NOW - 86400
MONTH_AGO = NOW - 86400 * 30
YEAR_AGO = NOW - 86400 * 365


class TestAggregation:
    def test_single_server_single_user(self):
        raw = {
            "server-1": {
                "users": [make_user("alice", "alice@co.com", "Alice", NOW, DAY_AGO)],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": None, "usedSlots": 1},
            }
        }
        result = aggregate_users(raw)
        assert "alice@co.com" in result["users"]
        user = result["users"]["alice@co.com"]
        assert user["email"] == "alice@co.com"
        assert len(user["accounts"]) == 1
        assert user["accounts"][0]["username"] == "alice"
        assert user["accounts"][0]["server"] == "server-1"

    def test_same_user_across_servers(self):
        raw = {
            "server-1": {
                "users": [make_user("alice", "alice@co.com", "Alice", MONTH_AGO, YEAR_AGO)],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": None, "usedSlots": 1},
            },
            "server-2": {
                "users": [make_user("alice", "alice@co.com", "Alice T", NOW, DAY_AGO)],
                "server_info": {"port": "localhost:1702", "status": "connected", "licensedSlots": None, "usedSlots": 1},
            },
        }
        result = aggregate_users(raw)
        assert len(result["users"]) == 1
        user = result["users"]["alice@co.com"]
        assert len(user["accounts"]) == 2
        servers = {a["server"] for a in user["accounts"]}
        assert servers == {"server-1", "server-2"}

    def test_multiple_accounts_same_server_same_email(self):
        raw = {
            "server-1": {
                "users": [
                    make_user("alice", "alice@co.com", "Alice", NOW, DAY_AGO),
                    make_user("alice-admin", "alice@co.com", "Alice (Admin)", HOUR_AGO, DAY_AGO),
                ],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": None, "usedSlots": 2},
            },
        }
        result = aggregate_users(raw)
        user = result["users"]["alice@co.com"]
        assert len(user["accounts"]) == 2
        usernames = {a["username"] for a in user["accounts"]}
        assert usernames == {"alice", "alice-admin"}

    def test_service_users_included(self):
        raw = {
            "server-1": {
                "users": [
                    make_user("alice", "alice@co.com", "Alice", NOW, DAY_AGO, "standard"),
                    make_user("svc-build", "svc@co.com", "Build Bot", NOW, DAY_AGO, "service"),
                ],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": None, "usedSlots": 1},
            },
        }
        result = aggregate_users(raw)
        assert "svc@co.com" in result["users"]
        svc = result["users"]["svc@co.com"]
        assert svc["accounts"][0]["type"] == "service"

    def test_servers_preserved(self):
        raw = {
            "server-1": {
                "users": [],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": 500, "usedSlots": 0},
            },
            "server-2": {
                "users": [],
                "server_info": {"port": "localhost:1702", "status": "auth_failed", "error": "auth error", "licensedSlots": None, "usedSlots": None},
            },
        }
        result = aggregate_users(raw)
        assert result["servers"]["server-1"]["status"] == "connected"
        assert result["servers"]["server-1"]["licensedSlots"] == 500
        assert result["servers"]["server-2"]["status"] == "auth_failed"

    def test_access_times_are_ints(self):
        raw = {
            "server-1": {
                "users": [make_user("alice", "alice@co.com", "Alice", str(NOW), str(DAY_AGO))],
                "server_info": {"port": "localhost:1701", "status": "connected", "licensedSlots": None, "usedSlots": 1},
            },
        }
        result = aggregate_users(raw)
        account = result["users"]["alice@co.com"]["accounts"][0]
        assert isinstance(account["access"], int)
        assert isinstance(account["update"], int)
