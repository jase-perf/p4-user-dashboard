import pytest
from p4_connector import P4Connector


class TestP4Connector:
    def test_connect_success(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        result = conn.connect()
        assert result["status"] == "connected"
        conn.disconnect()

    def test_connect_failure(self):
        conn = P4Connector("localhost:19999", user="nobody")
        result = conn.connect()
        assert result["status"] in ("auth_failed", "error")

    def test_fetch_users(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        usernames = [u["User"] for u in users]
        assert "t.tanaka" in usernames
        assert "y.suzuki" in usernames
        assert "svc-build" in usernames

        tanaka = next(u for u in users if u["User"] == "t.tanaka")
        assert "Email" in tanaka
        assert "FullName" in tanaka
        assert "Access" in tanaka
        assert "Type" in tanaka

    def test_fetch_users_includes_service(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        types = {u["User"]: u["Type"] for u in users}
        assert types["svc-build"] == "service"
        assert types["t.tanaka"] == "standard"

    def test_delete_user(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()

        result = conn.delete_user("y.honda")
        assert result["success"] is True

        users = conn.fetch_users()
        usernames = [u["User"] for u in users]
        assert "y.honda" not in usernames

        # Recreate for other tests
        conn.create_user("y.honda", "本田 祐子 (Honda Yuko)", "yuko.honda@bandainamco.example.com", "standard")
        conn.disconnect()

    def test_edit_user(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()

        result = conn.edit_user("d.ogawa", full_name="小川 大地 - Updated")
        assert result["success"] is True

        users = conn.fetch_users()
        ogawa = next(u for u in users if u["User"] == "d.ogawa")
        assert ogawa["FullName"] == "小川 大地 - Updated"

        # Restore original
        conn.edit_user("d.ogawa", full_name="小川 大地 (Ogawa Daichi)")
        conn.disconnect()

    def test_test_connection(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        result = conn.test_connection()
        assert result["status"] == "connected"

    def test_test_connection_failure(self):
        conn = P4Connector("localhost:19999", user="nobody")
        result = conn.test_connection()
        assert result["status"] in ("auth_failed", "error")
