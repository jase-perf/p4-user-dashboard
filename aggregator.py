"""Aggregate raw per-server P4 user data into a unified model keyed by email."""


def aggregate_users(raw_data: dict) -> dict:
    """Aggregate user data from multiple servers into a unified structure.

    Args:
        raw_data: Dict keyed by server name, each value containing:
            - "users": list of P4 user dicts (from p4 users -a)
            - "server_info": dict with port, status, licensedSlots, usedSlots

    Returns:
        Dict with "users" (keyed by email) and "servers" (keyed by server name).
    """
    users: dict[str, dict] = {}
    servers: dict[str, dict] = {}

    for server_name, server_data in raw_data.items():
        servers[server_name] = server_data["server_info"]

        for raw_user in server_data.get("users", []):
            email = raw_user.get("Email", "").lower()
            if not email:
                continue

            if email not in users:
                users[email] = {
                    "email": email,
                    "accounts": [],
                }

            users[email]["accounts"].append({
                "username": raw_user["User"],
                "fullName": raw_user.get("FullName", ""),
                "server": server_name,
                "access": int(raw_user.get("Access", 0)),
                "update": int(raw_user.get("Update", 0)),
                "type": raw_user.get("Type", "standard"),
            })

    return {"users": users, "servers": servers}
