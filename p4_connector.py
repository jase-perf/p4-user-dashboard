"""P4Python wrapper for connecting to and querying individual P4 servers."""

from P4 import P4, P4Exception


class P4Connector:
    def __init__(self, port: str, user: str | None = None):
        self.port = port
        self.user = user
        self._p4 = P4()

    def connect(self) -> dict:
        """Connect to the P4 server. Returns status dict.

        Automatically detects unicode-mode servers and sets charset
        so the dashboard works with a mix of unicode and non-unicode servers.
        """
        self._p4.port = self.port
        if self.user:
            self._p4.user = self.user
        try:
            self._p4.connect()
            return {"status": "connected"}
        except P4Exception as e:
            error_msg = str(e)
            # If the server requires unicode, retry with charset set
            if "unicode" in error_msg.lower() and "charset" in error_msg.lower():
                try:
                    self._p4.charset = "utf8"
                    self._p4.connect()
                    return {"status": "connected"}
                except P4Exception as e2:
                    error_msg = str(e2)
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

    def get_user_detail(self, username: str) -> dict:
        """Fetch full user spec including AuthMethod."""
        try:
            spec = self._p4.fetch_user(username)
            return {
                "success": True,
                "username": spec.get("User", username),
                "fullName": spec.get("FullName", ""),
                "email": spec.get("Email", ""),
                "authMethod": spec.get("AuthMethod", "perforce"),
                "type": spec.get("Type", "standard"),
            }
        except P4Exception as e:
            return {"success": False, "error": str(e)}

    def reset_password(self, username: str, new_password: str, force_reset: bool = True) -> dict:
        """Set a user's password and optionally force reset on next login."""
        try:
            self._p4.run("passwd", "-P", new_password, username)
            if force_reset:
                self._p4.run("admin", "resetpassword", "-u", username)
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
        """Get license information from the server.

        Uses 'p4 license -u' which reports:
        - userLimit: the licensed seat capacity (int or "unlimited")
        - userCount: the number of active license-consuming users
        """
        try:
            license_info = self._p4.run("license", "-u")
            licensed_slots = None
            used_slots = None
            if license_info:
                for entry in license_info:
                    if not isinstance(entry, dict):
                        continue
                    # License capacity from userLimit
                    if "userLimit" in entry:
                        raw = str(entry["userLimit"]).strip()
                        if raw.lower() != "unlimited":
                            try:
                                licensed_slots = int(raw)
                            except ValueError:
                                pass
                    # Active user count from userCount
                    if "userCount" in entry:
                        raw = str(entry["userCount"]).lstrip(">").strip()
                        try:
                            used_slots = int(raw)
                        except ValueError:
                            pass
            return {"licensedSlots": licensed_slots, "usedSlots": used_slots}
        except P4Exception:
            return {"licensedSlots": None, "usedSlots": None}

    def test_connection(self) -> dict:
        """Test connection with layered diagnostics.

        Three checks, each building on the last:
        1. TCP connect — can we reach the server at all?
        2. p4 info — does it respond? catches trust/SSL issues
        3. p4 users -m1 — does our user have permission to list users?
        """
        # Step 1: TCP connect
        result = self.connect()
        if result["status"] != "connected":
            return result

        try:
            # Step 2: p4 info — verifies server responds, catches trust issues
            try:
                self._p4.run("info")
            except P4Exception as e:
                error_msg = str(e)
                if "trust" in error_msg.lower() or "fingerprint" in error_msg.lower():
                    return {"status": "trust_failed", "error": error_msg}
                return {"status": "error", "error": error_msg}

            # Step 3: p4 users -m1 — verifies auth and permissions
            try:
                self._p4.run("users", "-m1")
            except P4Exception as e:
                error_msg = str(e)
                if "password" in error_msg.lower() or "login" in error_msg.lower() or "ticket" in error_msg.lower():
                    return {"status": "auth_failed", "error": error_msg}
                if "protect" in error_msg.lower() or "permission" in error_msg.lower():
                    return {"status": "permission_denied", "error": error_msg}
                return {"status": "error", "error": error_msg}

            return {"status": "connected"}
        finally:
            self.disconnect()
