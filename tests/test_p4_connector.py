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
        assert "alice" in usernames
        assert "bob" in usernames
        assert "svc-build" in usernames

        alice = next(u for u in users if u["User"] == "alice")
        assert "Email" in alice
        assert "FullName" in alice
        assert "Access" in alice
        assert "Type" in alice

    def test_fetch_users_includes_service(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()
        users = conn.fetch_users()
        conn.disconnect()

        types = {u["User"]: u["Type"] for u in users}
        assert types["svc-build"] == "service"
        assert types["alice"] == "standard"

    def test_delete_user(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()

        result = conn.delete_user("eve")
        assert result["success"] is True

        users = conn.fetch_users()
        usernames = [u["User"] for u in users]
        assert "eve" not in usernames

        # Recreate eve for other tests
        conn.create_user("eve", "Eve Watanabe", "eve@example.com", "standard")
        conn.disconnect()

    def test_edit_user(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        conn.connect()

        result = conn.edit_user("david", full_name="David S. Suzuki")
        assert result["success"] is True

        users = conn.fetch_users()
        david = next(u for u in users if u["User"] == "david")
        assert david["FullName"] == "David S. Suzuki"

        # Restore original
        conn.edit_user("david", full_name="David Suzuki")
        conn.disconnect()

    def test_test_connection(self, test_servers):
        conn = P4Connector("localhost:1701", user="super")
        result = conn.test_connection()
        assert result["status"] == "connected"

    def test_test_connection_failure(self):
        conn = P4Connector("localhost:19999", user="nobody")
        result = conn.test_connection()
        assert result["status"] in ("auth_failed", "error")
