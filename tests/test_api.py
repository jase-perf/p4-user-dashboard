import json
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(test_config):
    from dashboard import create_app

    app = create_app(config_path=test_config)
    return TestClient(app)


class TestDataEndpoint:
    def test_get_data(self, client):
        resp = client.get("/api/data")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "servers" in data
        assert len(data["users"]) > 0
        # t.tanaka is on all 3 servers (+ admin account on tokyo-prod)
        assert "takeshi.tanaka@studio.example.com" in data["users"]
        tanaka = data["users"]["takeshi.tanaka@studio.example.com"]
        assert len(tanaka["accounts"]) >= 3

    def test_get_data_servers(self, client):
        resp = client.get("/api/data")
        data = resp.json()
        assert "tokyo-prod" in data["servers"]
        assert data["servers"]["tokyo-prod"]["status"] == "connected"


class TestRefreshEndpoint:
    def test_refresh_all(self, client):
        resp = client.post("/api/refresh")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data

    def test_refresh_specific_server(self, client):
        resp = client.post("/api/refresh?servers=tokyo-prod")
        assert resp.status_code == 200
        data = resp.json()
        assert "tokyo-prod" in data["servers"]

    def test_refresh_failed_only(self, client):
        resp = client.post("/api/refresh?failed=true")
        assert resp.status_code == 200


class TestUserActions:
    def test_edit_user(self, client):
        # Use osaka-dev (non-unicode) for simpler test
        resp = client.put(
            "/api/servers/osaka-dev/users/t.shimizu",
            json={"fullName": "Shimizu Takuya - Updated"},
        )
        assert resp.status_code == 200
        result = resp.json()
        assert result["success"] is True

        # Restore
        client.put(
            "/api/servers/osaka-dev/users/t.shimizu",
            json={"fullName": "Shimizu Takuya"},
        )

    def test_delete_user(self, client):
        resp = client.delete("/api/servers/osaka-dev/users/y.ueda")
        assert resp.status_code == 200
        result = resp.json()
        assert result["success"] is True

        # Recreate for other tests
        from p4_connector import P4Connector
        conn = P4Connector("localhost:1702", user="super")
        conn.connect()
        conn.create_user("y.ueda", "Ueda Yumi", "yumi.ueda@studio.example.com")
        conn.disconnect()


class TestConfigEndpoint:
    def test_get_config(self, client):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "servers" in data
        assert len(data["servers"]) == 5

    def test_update_config(self, client):
        resp = client.get("/api/config")
        config = resp.json()
        config["licensedUniqueUsers"] = 999

        resp = client.put("/api/config", json=config)
        assert resp.status_code == 200

        resp = client.get("/api/config")
        assert resp.json()["licensedUniqueUsers"] == 999


class TestTestConnection:
    def test_connection_success(self, client):
        resp = client.post("/api/servers/tokyo-prod/test")
        assert resp.status_code == 200
        assert resp.json()["status"] == "connected"
