"""P4 Multi-Server User Dashboard — FastAPI application."""

import json
import os
import sys
import webbrowser
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from aggregator import aggregate_users
from config import DashboardConfig, ServerConfig, load_config, save_config
from p4_connector import P4Connector

# Module-level state
_config: DashboardConfig | None = None
_config_path: str = ""
_cache: dict = {"users": {}, "servers": {}}


def _fetch_server_data(server: ServerConfig) -> dict:
    """Fetch user data and license info from a single P4 server."""
    conn = P4Connector(server.port, user=server.user)
    connect_result = conn.connect()

    if connect_result["status"] != "connected":
        return {
            "users": [],
            "server_info": {
                "port": server.port,
                "status": connect_result["status"],
                "error": connect_result.get("error", "Unknown error"),
                "licensedSlots": None,
                "usedSlots": None,
            },
        }

    try:
        users = conn.fetch_users()
        license_info = conn.get_license_info()
        return {
            "users": users,
            "server_info": {
                "port": server.port,
                "status": "connected",
                **license_info,
            },
        }
    except Exception as e:
        error_msg = str(e)
        status = "auth_failed" if "password" in error_msg.lower() or "login" in error_msg.lower() else "error"
        return {
            "users": [],
            "server_info": {
                "port": server.port,
                "status": status,
                "error": error_msg,
                "licensedSlots": None,
                "usedSlots": None,
            },
        }
    finally:
        conn.disconnect()


def _refresh_data(server_names: list[str] | None = None, failed_only: bool = False) -> dict:
    """Fetch data from servers and update the cache."""
    global _cache

    servers_to_fetch = _config.servers

    if failed_only:
        failed_names = [
            name for name, info in _cache.get("servers", {}).items()
            if info.get("status") in ("auth_failed", "error")
        ]
        servers_to_fetch = [s for s in _config.servers if s.name in failed_names]
    elif server_names:
        servers_to_fetch = [s for s in _config.servers if s.name in server_names]

    raw_data = {}
    for server in servers_to_fetch:
        raw_data[server.name] = _fetch_server_data(server)

    new_data = aggregate_users(raw_data)

    if server_names or failed_only:
        # Merge into existing cache rather than replacing
        _cache["servers"].update(new_data["servers"])
        # Remove old accounts for refreshed servers, then add new ones
        refreshed_server_names = set(new_data["servers"].keys())
        for email, user_data in _cache["users"].items():
            user_data["accounts"] = [
                a for a in user_data["accounts"]
                if a["server"] not in refreshed_server_names
            ]
        for email, user_data in new_data["users"].items():
            if email in _cache["users"]:
                _cache["users"][email]["accounts"].extend(user_data["accounts"])
            else:
                _cache["users"][email] = user_data
        # Clean up users with no accounts left
        _cache["users"] = {
            email: data for email, data in _cache["users"].items()
            if data["accounts"]
        }
    else:
        _cache = new_data

    return _cache


def _get_connector_for_server(server_name: str) -> P4Connector | None:
    """Get a connected P4Connector for the named server."""
    server = next((s for s in _config.servers if s.name == server_name), None)
    if not server:
        return None
    conn = P4Connector(server.port, user=server.user)
    result = conn.connect()
    if result["status"] != "connected":
        return None
    return conn


def create_app(config_path: str | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    global _config, _config_path, _cache

    # Reset cache for each app creation (important for tests)
    _cache = {"users": {}, "servers": {}}

    if config_path:
        _config_path = config_path
    _config = load_config(_config_path)

    app = FastAPI(title="P4 User Dashboard")

    base_dir = Path(__file__).parent
    static_dir = base_dir / "static"
    templates_dir = base_dir / "templates"

    static_dir.mkdir(exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    templates = Jinja2Templates(directory=str(templates_dir))

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return templates.TemplateResponse(request=request, name="index.html")

    @app.get("/api/data")
    async def get_data():
        global _cache
        if not _cache.get("servers"):
            _refresh_data()
        return _cache

    @app.post("/api/refresh")
    async def refresh(
        servers: str | None = Query(None),
        failed: bool = Query(False),
    ):
        server_names = servers.split(",") if servers else None
        return _refresh_data(server_names=server_names, failed_only=failed)

    @app.delete("/api/servers/{server_name}/users/{username}")
    async def delete_user(server_name: str, username: str):
        conn = _get_connector_for_server(server_name)
        if not conn:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Server '{server_name}' not found or not connected"},
            )
        try:
            result = conn.delete_user(username)
            if result["success"]:
                for user_data in _cache.get("users", {}).values():
                    user_data["accounts"] = [
                        a for a in user_data["accounts"]
                        if not (a["server"] == server_name and a["username"] == username)
                    ]
                _cache["users"] = {
                    email: data for email, data in _cache["users"].items()
                    if data["accounts"]
                }
            return result
        finally:
            conn.disconnect()

    @app.put("/api/servers/{server_name}/users/{username}")
    async def edit_user(server_name: str, username: str, request: Request):
        body = await request.json()
        conn = _get_connector_for_server(server_name)
        if not conn:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Server '{server_name}' not found or not connected"},
            )
        try:
            result = conn.edit_user(
                username,
                full_name=body.get("fullName"),
                email=body.get("email"),
            )
            if result["success"]:
                for user_data in _cache.get("users", {}).values():
                    for account in user_data["accounts"]:
                        if account["server"] == server_name and account["username"] == username:
                            if "fullName" in body:
                                account["fullName"] = body["fullName"]
                            if "email" in body:
                                account["email"] = body["email"]
            return result
        finally:
            conn.disconnect()

    @app.get("/api/servers/{server_name}/users/{username}/detail")
    async def get_user_detail(server_name: str, username: str):
        conn = _get_connector_for_server(server_name)
        if not conn:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Server '{server_name}' not found or not connected"},
            )
        try:
            return conn.get_user_detail(username)
        finally:
            conn.disconnect()

    @app.post("/api/servers/{server_name}/users/{username}/reset-password")
    async def reset_password(server_name: str, username: str, request: Request):
        body = await request.json()
        conn = _get_connector_for_server(server_name)
        if not conn:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Server '{server_name}' not found or not connected"},
            )
        try:
            return conn.reset_password(
                username,
                new_password=body["password"],
                force_reset=body.get("forceReset", True),
            )
        finally:
            conn.disconnect()

    @app.get("/api/config")
    async def get_config():
        return _config.to_dict()

    @app.put("/api/config")
    async def update_config(request: Request):
        global _config
        body = await request.json()
        _config.port = body.get("port", _config.port)
        _config.licensed_unique_users = body.get("licensedUniqueUsers")
        _config.servers = [
            ServerConfig(name=s["name"], port=s["port"], user=s.get("user"))
            for s in body.get("servers", [])
        ]
        save_config(_config, _config_path)
        return {"success": True}

    @app.post("/api/servers/{server_name}/test")
    async def test_server(server_name: str):
        server = next((s for s in _config.servers if s.name == server_name), None)
        if not server:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "error": f"Server '{server_name}' not found in config"},
            )
        conn = P4Connector(server.port, user=server.user)
        return conn.test_connection()

    return app


def main():
    """CLI entry point."""
    config_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "config.json")
    global _config_path
    _config_path = config_path

    config = load_config(config_path)
    port = config.port

    host = "0.0.0.0"
    print(f"Starting P4 User Dashboard on http://0.0.0.0:{port}")
    uvicorn.run(
        create_app(config_path),
        host=host,
        port=port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
