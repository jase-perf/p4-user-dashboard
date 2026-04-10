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
        assert "alice@example.com" in data["users"]
        alice = data["users"]["alice@example.com"]
        assert len(alice["accounts"]) >= 3

    def test_get_data_servers(self, client):
        resp = client.get("/api/data")
        data = resp.json()
        assert "tokyo-main" in data["servers"]
        assert data["servers"]["tokyo-main"]["status"] == "connected"


class TestRefreshEndpoint:
    def test_refresh_all(self, client):
        resp = client.post("/api/refresh")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data

    def test_refresh_specific_server(self, client):
        resp = client.post("/api/refresh?servers=tokyo-main")
        assert resp.status_code == 200
        data = resp.json()
        assert "tokyo-main" in data["servers"]

    def test_refresh_failed_only(self, client):
        resp = client.post("/api/refresh?failed=true")
        assert resp.status_code == 200


class TestUserActions:
    def test_edit_user(self, client):
        resp = client.put(
            "/api/servers/tokyo-main/users/david",
            json={"fullName": "David S. Suzuki"},
        )
        assert resp.status_code == 200
        result = resp.json()
        assert result["success"] is True

        # Restore
        client.put(
            "/api/servers/tokyo-main/users/david",
            json={"fullName": "David Suzuki"},
        )

    def test_delete_user(self, client):
        resp = client.delete("/api/servers/tokyo-main/users/eve")
        assert resp.status_code == 200
        result = resp.json()
        assert result["success"] is True

        # Recreate for other tests
        from p4_connector import P4Connector
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()
        conn.create_user("eve", "Eve Watanabe", "eve@example.com")
        conn.disconnect()


class TestConfigEndpoint:
    def test_get_config(self, client):
        resp = client.get("/api/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "servers" in data
        assert len(data["servers"]) == 3

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
        resp = client.post("/api/servers/tokyo-main/test")
        assert resp.status_code == 200
        assert resp.json()["status"] == "connected"
