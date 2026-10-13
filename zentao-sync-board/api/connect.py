from http.server import BaseHTTPRequestHandler

from _runtime import ZenTaoError, board_app, read_body, respond


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = read_body(self)
        try:
            respond(
                self,
                board_app().connect(
                    body.get("baseUrl", ""),
                    body.get("account", ""),
                    body.get("password", ""),
                ),
            )
        except ZenTaoError as exc:
            respond(self, {"error": str(exc)}, status=400)
        except Exception as exc:
            respond(self, {"error": str(exc)}, status=500)
