import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from service import BoardApp  # noqa: E402
from zentao_client import ZenTaoError  # noqa: E402

_app = None


def board_app():
    global _app
    if _app is None:
        _app = BoardApp()
    return _app


def respond(handler, payload, status=200):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(data)


def read_body(handler, limit=16384):
    length = int(handler.headers.get("Content-Length") or 0)
    if length > limit:
        return {}
    raw = handler.rfile.read(length) if length else b""
    if not raw:
        return {}
    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def credentials_from_request(handler, body=None):
    """Read ZenTao credentials from headers or JSON body (serverless-safe)."""
    headers = handler.headers
    body = body or {}

    def pick(*keys):
        for key in keys:
            value = headers.get(key)
            if value:
                return value.strip() if isinstance(value, str) else value
        for key in keys:
            # Also accept lower-cased JSON body keys mapped from header names.
            short = key.lower().replace("x-zentao-", "").replace("-", "")
            for candidate in (key, short, key.lower()):
                if candidate in body and body.get(candidate):
                    value = body.get(candidate)
                    return value.strip() if isinstance(value, str) else value
        mapping = {
            "x-zentao-base-url": ("baseUrl", "base_url"),
            "x-zentao-account": ("account",),
            "x-zentao-password": ("password",),
            "x-zentao-token": ("token",),
        }
        for key in keys:
            for alias in mapping.get(key.lower(), ()):
                if body.get(alias):
                    value = body.get(alias)
                    return value.strip() if isinstance(value, str) else value
        return ""

    return {
        "baseUrl": pick("X-Zentao-Base-Url", "x-zentao-base-url"),
        "account": pick("X-Zentao-Account", "x-zentao-account"),
        "password": pick("X-Zentao-Password", "x-zentao-password"),
        "token": pick("X-Zentao-Token", "x-zentao-token"),
    }


def apply_request_credentials(handler, body=None):
    creds = credentials_from_request(handler, body)
    if not (creds["token"] or (creds["account"] and creds["password"])):
        return False
    return board_app().ensure_credentials(
        creds["baseUrl"],
        creds["account"],
        creds["password"],
        creds["token"],
    )


__all__ = [
    "BoardApp",
    "ZenTaoError",
    "board_app",
    "respond",
    "read_body",
    "credentials_from_request",
    "apply_request_credentials",
]
