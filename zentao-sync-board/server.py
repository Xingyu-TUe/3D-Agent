"""Local web server for the iteration sync board."""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from service import BoardApp
from zentao_client import ZenTaoError

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"


def _apply_headers(handler, app):
    headers = handler.headers
    base_url = headers.get("X-Zentao-Base-Url", "")
    account = headers.get("X-Zentao-Account", "")
    password = headers.get("X-Zentao-Password", "")
    token = headers.get("X-Zentao-Token", "")
    if token or (account and password):
        app.ensure_credentials(base_url, account, password, token)


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path in ("/", "/index.html"):
                self._file(INDEX, "text/html; charset=utf-8")
                return
            if parsed.path == "/api/status":
                try:
                    _apply_headers(self, app)
                except ZenTaoError as exc:
                    payload = app.status()
                    payload["error"] = str(exc)
                    self._json(payload)
                    return
                self._json(app.status())
                return
            if parsed.path == "/api/board":
                query = parse_qs(parsed.query)
                execution_id = (query.get("executionId") or [""])[0]
                force = (query.get("force") or ["0"])[0] in ("1", "true", "yes")
                try:
                    _apply_headers(self, app)
                    self._json(app.board(execution_id, force=force))
                except ZenTaoError as exc:
                    self._json({"error": str(exc)}, status=502)
                return
            self._json({"error": "未找到"}, status=404)

        def do_POST(self):
            parsed = urlparse(self.path)
            if parsed.path == "/api/connect":
                body = self._read_json()
                try:
                    self._json(
                        app.connect(
                            body.get("baseUrl", ""),
                            body.get("account", ""),
                            body.get("password", ""),
                            token=body.get("token", ""),
                        )
                    )
                except ZenTaoError as exc:
                    self._json({"error": str(exc)}, status=400)
                except Exception as exc:
                    self._json({"error": str(exc)}, status=500)
                return
            if parsed.path == "/api/disconnect":
                self._json(app.disconnect())
                return
            self._json({"error": "未找到"}, status=404)

        def _read_json(self):
            length = int(self.headers.get("Content-Length") or 0)
            if length > 16384:
                return {}
            raw = self.rfile.read(length) if length else b""
            if not raw:
                return {}
            try:
                data = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                return {}
            return data if isinstance(data, dict) else {}

        def _file(self, path, content_type):
            if not path.exists():
                self._json({"error": "页面不存在"}, status=404)
                return
            data = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)

        def _json(self, payload, status=200):
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, fmt, *args):
            print("[board] " + (fmt % args))

    return Handler


def create_server(host="0.0.0.0", port=5173, app=None):
    board = app or BoardApp()
    httpd = ThreadingHTTPServer((host, port), make_handler(board))
    httpd.board = board
    return httpd


def main():
    import argparse

    parser = argparse.ArgumentParser(description="禅道迭代同步看板")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()
    server = create_server(args.host, args.port)
    print(f"迭代同步看板 http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
