import http.server
import functools
import os

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    site_dir = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=site_dir)
    http.server.test(HandlerClass=handler, port=8744)
