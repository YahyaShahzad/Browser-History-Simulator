import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import BrowserHistory


def run_tests():
    b = BrowserHistory()

    assert b.current_page() is None
    assert b.last_message == "No pages in history"
    assert b.history_size() == 0

    ok = b.visit_page("")
    assert not ok
    assert b.last_message == "Error: URL cannot be empty"

    ok = b.visit_page("example.com")
    assert ok
    assert b.history_size() == 1
    assert b.current_page() == "https://example.com"

    prev = b.go_back()
    assert prev is None
    assert b.history_size() == 1
    assert b.last_message == "Cannot go back - no previous page"

    b.clear_history()
    ok = b.visit_page("example")
    assert ok
    assert b.current_page() == "https://example"

    b.visit_page("http://second.local/page")
    assert b.history_size() == 2
    new = b.go_back()
    assert new == "https://example"
    assert b.history_size() == 1

    b.clear_history()
    assert b.history_size() == 0
    assert b.current_page() is None

    print("All BrowserHistory tests passed")


if __name__ == "__main__":
    run_tests()
