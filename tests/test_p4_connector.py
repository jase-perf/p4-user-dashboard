import pytest
from p4_connector import P4Connector


class TestP4Connector:
    def test_connect_success(self, test_servers):
        # Use non-unicode server for basic tests
        conn = P4Connector("localhost:1702", user="super")
        result = conn.connect()
        assert result["status"] == "connected"
        conn.disconnect()

    def test_connect_unicode_server(self, test_servers):
        # Unicode server should auto-detect and connect
        conn = P4Connector("localhost:1701", user="super")
        result = conn.connect()
        assert result["status"] == "connected"
        conn.disconnect()

    def test_connect_failure(self):
        conn = P4Connector("localhost:19999", user="nobody")
        result = conn.connect()
        assert result["status"] in ("auth_failed", "error")

    def test_fetch_users(self, test_servers):
        conn = P4Connector("localhost:1702", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        usernames = [u["User"] for u in users]
        assert "t.tanaka" in usernames
        assert "y.suzuki" in usernames
        assert "svc-deploy" in usernames

        tanaka = next(u for u in users if u["User"] == "t.tanaka")
        assert "Email" in tanaka
        assert "FullName" in tanaka
        assert "Access" in tanaka
        assert "Type" in tanaka

    def test_fetch_users_unicode_server(self, test_servers):
        # Verify fetching from unicode server works with Japanese names
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        usernames = [u["User"] for u in users]
        assert "t.tanaka" in usernames
        assert "svc-build" in usernames

    def test_fetch_users_includes_service(self, test_servers):
        conn = P4Connector("localhost:1702", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        types = {u["User"]: u["Type"] for u in users}
        assert types["svc-deploy"] == "service"
        assert types["t.tanaka"] == "standard"

    def test_delete_user(self, test_servers):
        conn = P4Connector("localhost:1702", user="super")
        conn.connect()

        result = conn.delete_user("y.ueda")
        assert result["success"] is True

        users = conn.fetch_users()
        usernames = [u["User"] for u in users]
        assert "y.ueda" not in usernames

        # Recreate for other tests
        conn.create_user("y.ueda", "Ueda Yumi", "yumi.ueda@studio.example.com", "standard")
        conn.disconnect()

    def test_edit_user(self, test_servers):
        conn = P4Connector("localhost:1702", user="super")
        conn.connect()

        result = conn.edit_user("t.shimizu", full_name="Shimizu Takuya - Updated")
        assert result["success"] is True

        users = conn.fetch_users()
        shimizu = next(u for u in users if u["User"] == "t.shimizu")
        assert shimizu["FullName"] == "Shimizu Takuya - Updated"

        # Restore original
        conn.edit_user("t.shimizu", full_name="Shimizu Takuya")
        conn.disconnect()

    def test_test_connection(self, test_servers):
        conn = P4Connector("localhost:1702", user="super")
        result = conn.test_connection()
        assert result["status"] == "connected"

    def test_test_connection_unicode(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        result = conn.test_connection()
        assert result["status"] == "connected"

    def test_test_connection_failure(self):
        conn = P4Connector("localhost:19999", user="nobody")
        result = conn.test_connection()
        assert result["status"] in ("auth_failed", "error")
