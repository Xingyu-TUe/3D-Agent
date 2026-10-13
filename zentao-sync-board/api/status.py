from http.server import BaseHTTPRequestHandler

from board_http import board_app, respond


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        respond(self, board_app().status())
