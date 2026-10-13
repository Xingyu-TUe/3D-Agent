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


__all__ = ["BoardApp", "ZenTaoError", "board_app", "respond", "read_body"]
