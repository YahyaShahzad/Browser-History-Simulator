from collections import deque
from typing import Optional
from urllib.parse import urlparse, urlunparse

from flask import Flask, jsonify, render_template, request


class BrowserHistory:
    # Stack storage: newest page is at the right end of the deque.
    history: deque[str]

    def __init__(self):
        self.history = deque()
        self.last_message = ""

    def visit_page(self, url: str) -> bool:
        if url is None or url.strip() == "":
            self.last_message = "Error: URL cannot be empty"
            return False

        normalized = url.strip()
        if not normalized.startswith("http"):
            normalized = f"https://{normalized}"

        parsed = urlparse(normalized)
        if parsed.scheme and parsed.netloc:
            normalized = urlunparse(
                (
                    parsed.scheme.lower(),
                    parsed.netloc.lower(),
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment,
                )
            )

        self.history.append(normalized)
        self.last_message = f"Visited: {normalized}"
        return True

    def go_back(self) -> str | None:
        if len(self.history) <= 1:
            self.last_message = "Cannot go back - no previous page"
            return None

        popped_url = self.history.pop()
        new_top = self.history[-1]
        self.last_message = f"Left: {popped_url}. Now at: {new_top}"
        return new_top

    def current_page(self) -> str | None:
        if not self.history:
            self.last_message = "No pages in history"
            return None
        return self.history[-1]

    def has_history(self) -> bool:
        return len(self.history) > 0

    def history_size(self) -> int:
        return len(self.history)

    def clear_history(self) -> None:
        self.history.clear()
        self.last_message = "History cleared"

    def show_full_history(self) -> list[str]:
        return list(reversed(self.history))


app = Flask(__name__, static_folder="static", template_folder="templates")
browser_history = BrowserHistory()


def json_response(success: bool, message: str, data=None):
    payload = {"success": success, "message": message, "data": data or {}}
    return jsonify(payload)


def get_state_data() -> dict:
    current = browser_history.current_page()
    return {
        "current": current,
        "history": browser_history.show_full_history(),
        "size": browser_history.history_size(),
        "has_history": browser_history.has_history(),
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/visit", methods=["POST"])
def api_visit():
    body = request.get_json(silent=True) or {}
    url = body.get("url") if isinstance(body, dict) else None

    success = browser_history.visit_page(url)
    return json_response(success, browser_history.last_message, get_state_data())


@app.route("/api/back", methods=["POST"])
def api_back():
    new_page = browser_history.go_back()
    success = new_page is not None
    return json_response(success, browser_history.last_message, get_state_data())


@app.route("/api/current", methods=["GET"])
def api_current():
    current = browser_history.current_page()
    success = current is not None
    return json_response(success, browser_history.last_message, {"current": current})


@app.route("/api/history", methods=["GET"])
def api_history():
    return json_response(True, "Full history", {"history": browser_history.show_full_history()})


@app.route("/api/size", methods=["GET"])
def api_size():
    return json_response(True, "Size fetched", {"size": browser_history.history_size()})


@app.route("/api/has-history", methods=["GET"])
def api_has_history():
    return json_response(True, "Has history fetched", {"has_history": browser_history.has_history()})


@app.route("/api/clear", methods=["POST"])
def api_clear():
    browser_history.clear_history()
    return json_response(True, browser_history.last_message, get_state_data())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
