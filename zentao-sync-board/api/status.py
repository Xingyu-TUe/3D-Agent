from http.server import BaseHTTPRequestHandler

from board_http import ZenTaoError, apply_request_credentials, board_app, respond


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            apply_request_credentials(self)
        except ZenTaoError as exc:
            respond(self, {**board_app().status(), "error": str(exc)}, status=200)
            return
        respond(self, board_app().status())
