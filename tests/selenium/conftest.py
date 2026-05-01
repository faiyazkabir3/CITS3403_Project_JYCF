import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions


ROOT = Path(__file__).resolve().parents[2]
BASE_URL = "http://127.0.0.1:5000"
SELENIUM_CACHE_DIR = Path(tempfile.gettempdir()) / "selenium-manager-cache"
SELENIUM_CACHE_DIR.mkdir(exist_ok=True)
os.environ.setdefault("SE_CACHE_PATH", str(SELENIUM_CACHE_DIR))


def _port_is_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
        connection.settimeout(0.5)
        return connection.connect_ex((host, port)) == 0


@pytest.fixture(scope="session")
def selenium_server():
    if _port_is_open("127.0.0.1", 5001):
        yield BASE_URL
        return

    process = subprocess.Popen(
        [sys.executable, "-B", "scripts/run_selenium_server.py"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    deadline = time.time() + 120
    while time.time() < deadline:
        if process.poll() is not None:
            output = process.stdout.read() if process.stdout else ""
            raise RuntimeError(f"Selenium Flask server exited early.\n{output}")

        if _port_is_open("127.0.0.1", 5001):
            break

        time.sleep(0.5)
    else:
        process.terminate()
        output = process.stdout.read() if process.stdout else ""
        raise RuntimeError(f"Selenium Flask server did not start on port 5001.\n{output}")

    yield BASE_URL

    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


@pytest.fixture(scope="session")
def selenium_browser(selenium_server):
    browser_name = os.environ.get("SELENIUM_BROWSER", "chrome").strip().lower()
    profile_dir = Path(tempfile.mkdtemp(prefix=f"selenium-{browser_name}-profile-"))
    browser = None

    try:
        if browser_name == "edge":
            options = EdgeOptions()
        else:
            options = ChromeOptions()
            browser_name = "chrome"

        options.page_load_strategy = "eager"
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1366,768")
        options.add_argument(f"--user-data-dir={profile_dir}")
        options.add_argument("--disable-background-networking")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--no-first-run")
        options.add_argument("--no-sandbox")
        options.add_argument("--remote-debugging-port=0")

        if browser_name == "edge":
            browser = webdriver.Edge(options=options)
        else:
            browser = webdriver.Chrome(options=options)

        browser.implicitly_wait(0)
        browser.set_page_load_timeout(30)
        browser.set_script_timeout(30)
        yield browser
    finally:
        if browser is not None:
            browser.quit()
        shutil.rmtree(profile_dir, ignore_errors=True)


@pytest.fixture
def driver(selenium_browser):
    selenium_browser.delete_all_cookies()
    yield selenium_browser
    selenium_browser.delete_all_cookies()


@pytest.fixture
def base_url(selenium_server):
    return selenium_server
