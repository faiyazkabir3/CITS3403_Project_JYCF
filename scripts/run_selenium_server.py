import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INSTANCE_DIR = ROOT / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)
sys.path.insert(0, str(ROOT))
SELENIUM_DB_PATH = Path(tempfile.gettempdir()) / "selenium_cits3403.db"

os.environ["SECRET_KEY"] = "selenium-secret-key-for-local-browser-tests"
os.environ["SQLCIPHER_DATABASE_KEY"] = "selenium-sqlcipher-key-for-local-tests"
os.environ["SAVE_PAYLOAD_KEYS"] = "v1:c2VsZW5pdW0tc2F2ZS1rZXktMzItYnl0ZS12YWwhISE"
os.environ["DATABASE_URL"] = f"sqlite:///{SELENIUM_DB_PATH.as_posix()}"
os.environ["ALLOW_PLAINTEXT_TEST_DATABASES"] = "1"
os.environ.setdefault("FLASK_APP", "app.py")

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
        port=5001,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )
