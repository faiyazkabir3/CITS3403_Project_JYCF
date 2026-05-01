import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INSTANCE_DIR = ROOT / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)
sys.path.insert(0, str(ROOT))

db_path = (INSTANCE_DIR / "playwright_smoke.db").resolve()

os.environ.setdefault("SECRET_KEY", "playwright-smoke-secret-key-for-local-browser-tests")
os.environ.setdefault("SQLCIPHER_DATABASE_KEY", "playwright-sqlcipher-key-for-local-browser-tests")
os.environ.setdefault("SAVE_PAYLOAD_KEYS", "v1:cGxheXdyaWdodC1zYXZlLWtleS0zMi1ieXRlcyEhISE")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")

subprocess.run(
    [sys.executable, "-m", "flask", "--app", "app.py", "db", "upgrade"],
    cwd=ROOT,
    env=os.environ.copy(),
    check=True,
)

from app import app, socketio  # noqa: E402


if __name__ == "__main__":
    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
