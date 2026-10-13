from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from _runtime import ZenTaoError, board_app, respond


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        execution_id = (query.get("executionId") or [""])[0]
        force = (query.get("force") or ["0"])[0] in ("1", "true", "yes")
        try:
            respond(self, board_app().board(execution_id, force=force))
        except ZenTaoError as exc:
            respond(self, {"error": str(exc)}, status=502)
