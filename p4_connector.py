"""P4Python wrapper for connecting to and querying individual P4 servers."""

from P4 import P4, P4Exception


class P4Connector:
    def __init__(self, port: str, user: str | None = None):
        self.port = port
        self.user = user
        self._p4 = P4()

    def connect(self) -> dict:
        """Connect to the P4 server. Returns status dict."""
        self._p4.port = self.port
        if self.user:
            self._p4.user = self.user
        try:
            self._p4.connect()
            return {"status": "connected"}
        except P4Exception as e:
            error_msg = str(e)
            if "password" in error_msg.lower() or "login" in error_msg.lower() or "ticket" in error_msg.lower():
                return {"status": "auth_failed", "error": error_msg}
            return {"status": "error", "error": error_msg}

    def disconnect(self) -> None:
        """Disconnect from the P4 server."""
        if self._p4.connected():
            self._p4.disconnect()

    def fetch_users(self) -> list[dict]:
        """Fetch all users (including service users) from the server."""
        return self._p4.run("users", "-a")

    def delete_user(self, username: str) -> dict:
        """Delete a user from the server."""
        try:
            self._p4.run("user", "-d", "-f", username)
            return {"success": True}
        except P4Exception as e:
            return {"success": False, "error": str(e)}

    def edit_user(self, username: str, full_name: str | None = None, email: str | None = None) -> dict:
        """Edit a user's details on the server."""
        try:
            user_spec = self._p4.fetch_user(username)
            if full_name is not None:
                user_spec["FullName"] = full_name
            if email is not None:
                user_spec["Email"] = email
            self._p4.save_user(user_spec, "-f")
            return {"success": True}
        except P4Exception as e:
            return {"success": False, "error": str(e)}

    def create_user(self, username: str, full_name: str, email: str, user_type: str = "standard") -> dict:
        """Create a user on the server."""
        try:
            user_spec = self._p4.fetch_user(username)
            user_spec["FullName"] = full_name
            user_spec["Email"] = email
            user_spec["Type"] = user_type
            self._p4.save_user(user_spec, "-f")
            return {"success": True}
        except P4Exception as e:
            return {"success": False, "error": str(e)}

    def get_license_info(self) -> dict:
        """Get license information from the server."""
        try:
            license_info = self._p4.run("license", "-u")
            licensed = None
            if license_info:
                for entry in license_info:
                    if isinstance(entry, dict) and "userCount" in entry:
                        raw = entry["userCount"]
                        # Handle values like ">5" or "unlimited"
                        cleaned = raw.lstrip(">").strip()
                        try:
                            licensed = int(cleaned)
                        except ValueError:
                            licensed = None
            users = self._p4.run("users")
            used = len([u for u in users if u.get("Type", "standard") == "standard"])
            return {"licensedSlots": licensed, "usedSlots": used}
        except P4Exception:
            return {"licensedSlots": None, "usedSlots": None}

    def test_connection(self) -> dict:
        """Test if we can connect and authenticate to the server."""
        result = self.connect()
        if result["status"] == "connected":
            self.disconnect()
        return result
